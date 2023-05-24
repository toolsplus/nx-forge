import {
  ensureNxProject,
  readFile,
  runCommandAsync,
  runNxCommandAsync,
  tmpProjPath,
} from '@nx/plugin/testing';
import { GraphQLClient } from 'graphql-request';
import { ensureCorrectWorkspaceRoot } from './utils/e2e-workspace';
import { generateForgeApp } from './utils/generate-forge-app';
import {
  AtlassianProductContext,
  Credentials,
  getAtlassianProductContext,
  getCredentials,
} from './utils/config';
import { createClient, deleteApp } from './utils/atlassian-graphql-client';
import { runForgeCommandAsync } from './utils/async-commands';
import { getInstallationIds } from './utils/installation-ids';
import { joinPathFragments } from '@nx/devkit';

describe('Forge install executor', () => {
  // initialize before all tests
  let developerCredentials: Credentials;
  let apiClient: GraphQLClient;
  let productContext: AtlassianProductContext;

  beforeAll(async () => {
    ensureNxProject('@toolsplus/nx-forge', 'dist/packages/nx-forge');
    ensureCorrectWorkspaceRoot();
    developerCredentials = getCredentials();
    apiClient = createClient(developerCredentials);
    productContext = getAtlassianProductContext();

    // Initialize the Forge CLI, otherwise commands may fail due to expected interactive input
    await runCommandAsync(`npx forge settings set usage-analytics false`, {
      silenceError: true,
    });
  });

  afterAll(async () => {
    // `nx reset` kills the daemon, and performs
    // some work which can help clean up e2e leftovers
    await runNxCommandAsync('reset');
  });

  it('should install a Forge app', async () => {
    const appName = await generateForgeApp();
    const nxBuildResult = await runNxCommandAsync(`build ${appName}`, {
      silenceError: true,
    });
    expect(nxBuildResult.stderr).toEqual('');
    expect(nxBuildResult.stdout).toContain('Executor ran');

    const nxRegisterResult = await runNxCommandAsync(`register ${appName}`, {
      silenceError: true,
    });
    expect(nxRegisterResult.stderr).toEqual('');
    expect(nxRegisterResult.stdout).toContain('Forge app registered');

    // Run with `--no-verfiy` because the generated blank app template causes linting errors
    const nxDeployResult = await runNxCommandAsync(
      `deploy ${appName} --no-verify`,
      {
        silenceError: true,
      }
    );
    expect(nxDeployResult.stderr).toEqual('');
    expect(nxDeployResult.stdout).toContain('Forge app deployed');

    const nxInstallResult = await runNxCommandAsync(
      `install ${appName} --product=${productContext.product} --site=${productContext.siteUrl} --no-interactive`,
      {
        silenceError: true,
      }
    );
    expect(nxInstallResult.stderr).toEqual('');
    expect(nxInstallResult.stdout).toContain('Forge app installed');

    // Clean up
    const installationIds = await getInstallationIds(appName);
    const uninstallResults = await Promise.all(
      installationIds.map(({ id }) =>
        runForgeCommandAsync(`uninstall ${id}`, {
          cwd: joinPathFragments(tmpProjPath(), 'dist', 'apps', appName),
          silenceError: true,
        })
      )
    );
    uninstallResults.forEach((result) => {
      expect(result.stderr).toEqual('');
      expect(result.stdout).toContain('Uninstalled');
    });

    // ari:cloud:ecosystem::app/<uuid>
    const registeredAppIdRegex =
      /ari:cloud:ecosystem::app\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

    const registeredOutputManifestContent = readFile(
      `dist/apps/${appName}/manifest.yml`
    );
    const appIdMatch =
      registeredOutputManifestContent.match(registeredAppIdRegex);

    if (!appIdMatch) {
      throw new Error(
        'Unexpected error during clean up: Failed to detect app id in manifest.yml'
      );
    }

    const [appId] = appIdMatch;

    const result = await deleteApp(appId)(apiClient);
    if (!result.success) {
      throw new Error(
        `Failed to clean up registered app with id ${appId}: ${result.errors}`
      );
    }
  });
});
