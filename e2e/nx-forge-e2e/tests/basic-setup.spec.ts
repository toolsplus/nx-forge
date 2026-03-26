import {
  ensureNxProject,
  readFile,
  tmpProjPath,
} from '@nx/plugin/testing';
import { GraphQLClient } from 'graphql-request';
import { ensureCorrectWorkspaceRoot } from './utils/e2e-workspace';
import { generateForgeApp } from './utils/generate-forge-app';
import {
  Credentials,
  ForgeInstallationContext,
  getCredentials,
  getDeveloperSpaceId,
  getForgeInstallationContext,
} from './utils/config';
import { createClient, deleteApp } from './utils/atlassian-graphql-client';
import {
  runCommandAsync,
  runForgeCommandAsync,
  runNxCommandAsync,
} from './utils/async-commands';
import { joinPathFragments } from '@nx/devkit';
import stripAnsi = require('strip-ansi');

describe('basic setup', () => {
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

  it('should generate, build, package, register, deploy and install a Forge app', async () => {
    const appName = await generateForgeApp({ directory: 'apps' });

    // Build

    const nxBuildResult = await runNxCommandAsync(`run ${appName}:build`, {
      silenceError: true,
    });
    expect(nxBuildResult.stderr).toEqual('');
    expect(stripAnsi(nxBuildResult.stdout)).toContain(
      'Successfully ran target build for project'
    );

    // Package

    const nxPackageResult = await runNxCommandAsync(`run ${appName}:package`);
    expect(nxPackageResult.stderr).toEqual('');
    expect(stripAnsi(nxPackageResult.stdout)).toEqual(
      expect.stringContaining('Successfully ran target package for project')
    );

    // Register

    const unregisteredOutputManifestContent = readFile(
      `dist/apps/${appName}/manifest.yml`
    );
    expect(unregisteredOutputManifestContent).toContain(
      'ari:cloud:ecosystem::app/to-be-generated'
    );

    const nxRegisterResult = await runNxCommandAsync(
      `run ${appName}:register --accept-terms --developer-space-id ${developerSpaceId}`,
      {
        silenceError: true,
      }
    );
    expect(nxRegisterResult.stderr).toEqual('');
    expect(stripAnsi(nxRegisterResult.stdout)).toContain(
      'Forge app registered'
    );

    // ari:cloud:ecosystem::app/<uuid>
    const registeredAppIdRegex =
      /ari:cloud:ecosystem::app\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

    const registeredOutputManifestContent = readFile(
      `dist/apps/${appName}/manifest.yml`
    );
    const [appId] =
      registeredOutputManifestContent.match(registeredAppIdRegex) ?? [];
    expect(appId).not.toBeNull();
    expect(appId).toBeDefined();
    expect(appId).not.toEqual('');

    const projectManifestContent = readFile(`apps/${appName}/manifest.yml`);
    expect(projectManifestContent).toContain(appId);

    // Deploy

    // Run with `--no-verfiy` because the generated blank app template causes linting errors
    const nxDeployResult = await runNxCommandAsync(
      `run ${appName}:deploy --no-verify`,
      {
        silenceError: true,
      }
    );
    expect(nxDeployResult.stderr).toEqual('');
    expect(stripAnsi(nxDeployResult.stdout)).toContain('Forge app deployed');

    // Install using Forge CLI

    const installResult = await runForgeCommandAsync(
      `install --product=${installationContext.product} --site=${installationContext.siteUrl} --environment ${installationContext.environment} --non-interactive`,
      {
        cwd: joinPathFragments(tmpProjPath(), 'dist', 'apps', appName),
        silenceError: true,
      }
    );
    expect(installResult.stderr).toEqual('');
    expect(stripAnsi(installResult.stdout)).toMatch(/Install.*complete/);

    // Clean up
    const uninstallResult = await runForgeCommandAsync(
      `uninstall --product=${installationContext.product} --site=${installationContext.siteUrl} --environment ${installationContext.environment}`,
      {
        cwd: joinPathFragments(tmpProjPath(), 'dist', 'apps', appName),
        silenceError: true,
      }
    );
    expect(uninstallResult.stderr).toEqual('');
    expect(stripAnsi(uninstallResult.stdout)).toContain('Uninstalled');

    const result = await deleteApp(appId)(apiClient);
    if (!result.success) {
      throw new Error(
        `Failed to clean up registered app with id ${appId}: ${result.errors}`
      );
    }
  });
});
