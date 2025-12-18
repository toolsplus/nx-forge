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
  ForgeInstallationContext,
  Credentials,
  getForgeInstallationContext,
  getCredentials,
  getDeveloperSpaceId,
} from './utils/config';
import { createClient, deleteApp } from './utils/atlassian-graphql-client';
import { runForgeCommandAsync } from './utils/async-commands';
import { getInstallationIds } from './utils/installation-ids';
import { joinPathFragments } from '@nx/devkit';
import stripAnsi = require('strip-ansi');

describe('Forge install executor', () => {
  // initialize before all tests
  let developerCredentials: Credentials;
  let apiClient: GraphQLClient;
  let installationContext: ForgeInstallationContext;
  let developerSpaceId: string;

  beforeAll(async () => {
    ensureNxProject('@toolsplus/nx-forge', 'dist/packages/nx-forge');
    ensureCorrectWorkspaceRoot();
    developerCredentials = getCredentials();
    apiClient = createClient(developerCredentials);
    installationContext = getForgeInstallationContext();
    developerSpaceId = getDeveloperSpaceId();

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
    const appName = await generateForgeApp({ directory: 'apps' });
    const nxBuildResult = await runNxCommandAsync(`build ${appName}`, {
      silenceError: true,
    });
    expect(nxBuildResult.stderr).toEqual('');
    expect(stripAnsi(nxBuildResult.stdout)).toContain(
      'Successfully ran target build for project'
    );

    const nxPackageResult = await runNxCommandAsync(`package ${appName}`);
    expect(nxPackageResult.stderr).toEqual('');
    expect(stripAnsi(nxPackageResult.stdout)).toEqual(
      expect.stringContaining('Successfully ran target package for project')
    );

    const nxRegisterResult = await runNxCommandAsync(
      `register ${appName} -y -s ${developerSpaceId}`,
      {
        silenceError: true,
      }
    );
    expect(nxRegisterResult.stderr).toEqual('');
    expect(stripAnsi(nxRegisterResult.stdout)).toContain(
      'Forge app registered'
    );

    // Run with `--no-verfiy` because the generated blank app template causes linting errors
    const nxDeployResult = await runNxCommandAsync(
      `deploy ${appName} --no-verify`,
      {
        silenceError: true,
      }
    );
    expect(nxDeployResult.stderr).toEqual('');
    expect(stripAnsi(nxDeployResult.stdout)).toContain('Forge app deployed');

    const nxInstallResult = await runNxCommandAsync(
      `install ${appName} --product=${installationContext.product} --site=${installationContext.siteUrl} --environment ${installationContext.environment} --no-interactive`,
      {
        silenceError: true,
      }
    );
    expect(nxInstallResult.stderr).toEqual('');
    expect(stripAnsi(nxInstallResult.stdout)).toContain('Forge app installed');

    // Clean up
    const installationIds = await getInstallationIds(appName);
    const uninstallResults = await Promise.all(
      installationIds.map(({ id }) =>
        runForgeCommandAsync(
          `uninstall --product=${installationContext.product} --site=${installationContext.siteUrl} --environment ${installationContext.environment}`,
          {
            cwd: joinPathFragments(tmpProjPath(), 'dist', 'apps', appName),
            silenceError: true,
          }
        )
      )
    );
    uninstallResults.forEach((result) => {
      expect(result.stderr).toEqual('');
      expect(stripAnsi(result.stdout)).toContain('Uninstalled');
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
