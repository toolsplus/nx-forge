import { GraphQLClient } from 'graphql-request';
import { deleteApp, DeleteAppResponse } from './atlassian-graphql-client';
import { runForgeCommandAsync } from './async-commands';
import { ForgeInstallationContext } from './config';

const DELETE_RETRY_INTERVAL_MS = 2_000;
const DELETE_RETRY_TIMEOUT_MS = 10_000;

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const formatDeleteErrors = (errors?: DeleteAppResponse['errors']) =>
  errors?.map((error) => error.message).join('; ') ?? 'Unknown error';

const hasInstallationsError = (errors?: DeleteAppResponse['errors']) =>
  errors?.some((error) =>
    error.message.toLowerCase().includes('has installations')
  ) ?? false;

/**
 * Best-effort cleanup for a Forge app registered during e2e tests.
 *
 * The Forge GraphQL delete mutation can briefly lag behind the CLI uninstall
 * and report that the app still has installations. To keep the suite stable,
 * we uninstall first and then retry deletion for a short, bounded window
 * before giving up with a warning.
 */
export const cleanupRegisteredForgeApp = async ({
  appDirectory,
  appId,
  apiClient,
  installationContext,
}: {
  appDirectory: string;
  appId: string;
  apiClient: GraphQLClient;
  installationContext: ForgeInstallationContext;
}) => {
  try {
    await runForgeCommandAsync(
      `uninstall --product=${installationContext.product} --site=${installationContext.siteUrl} --environment ${installationContext.environment} --non-interactive`,
      {
        cwd: appDirectory,
        silenceError: true,
      }
    );
  } catch (error) {
    console.warn(`Failed to uninstall Forge app ${appId}`, error);
  }

  const maxAttempts =
    Math.floor(DELETE_RETRY_TIMEOUT_MS / DELETE_RETRY_INTERVAL_MS) + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await deleteApp(appId)(apiClient);

      if (result.success) {
        return;
      }

      const errorMessage = formatDeleteErrors(result.errors);

      // Atlassian can report lingering installations for a few seconds after uninstall.
      if (attempt < maxAttempts && hasInstallationsError(result.errors)) {
        await sleep(DELETE_RETRY_INTERVAL_MS);
        continue;
      }

      console.warn(`Failed to delete registered app ${appId}: ${errorMessage}`);
      return;
    } catch (error) {
      if (attempt < maxAttempts) {
        await sleep(DELETE_RETRY_INTERVAL_MS);
        continue;
      }

      console.warn(`Failed to delete registered app ${appId}`, error);
      return;
    }
  }
};
