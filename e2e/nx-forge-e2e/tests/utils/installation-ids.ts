import { z } from 'zod';
import { joinPathFragments } from '@nx/devkit';
import { tmpProjPath } from '@nx/plugin/testing';
import { runForgeCommandAsync } from './async-commands';

/**
 * Schema that describes the Forge CLI JSON output of running `forge install list`
 *
 * You may add more properties to the schema, however, to keep this as robust as possible only
 * add the properties that are actually needed.
 *
 * Below an example of the expected output:
 *
 * [
 *   {
 *     "id": "1cdbd223-3579-4bea-a5d2-8ba855c2241d",
 *     "environment": "development",
 *     "site": "my-site.atlassian.net",
 *     "product": "Jira",
 *     "version": "Latest"
 *   }
 * ]
 *
 * @see https://developer.atlassian.com/platform/forge/cli-reference/install/#commands
 */
const installationListSchema = z.array(
  z.object({
    id: z.string(),
  })
);

/**
 * Retrieves the installation ids for the current app by running `forge install list`.
 *
 * This runs the command in the e2e directory.
 *
 * @param projectName Name of the Nx app project for which to get installation ids
 * @returns List of installation ids for the given app project
 */
export const getInstallationIds = async (
  projectName: string
): Promise<z.infer<typeof installationListSchema>> => {
  // If this call errors with Error: spawn /bin/sh ENOENT check
  // if the value provided to cwd exists:
  // https://ethanmick.com/debugging-nodes-spawn-enoent/
  const listInstallationResult = await runForgeCommandAsync(
    'install list --json',
    {
      cwd: joinPathFragments(tmpProjPath(), 'dist', 'apps', projectName),
      silenceError: true,
    }
  );
  if (listInstallationResult.stderr) {
    console.error(
      `Failed to fetch list of installations: ${listInstallationResult.stderr}`
    );
  }
  let rawInstallationsJson;
  try {
    rawInstallationsJson = JSON.parse(listInstallationResult.stdout);
  } catch (error) {
    throw new Error(
      `Failed to parse installations JSON payload: ${listInstallationResult.stdout}`
    );
  }
  return installationListSchema.parse(rawInstallationsJson);
};
