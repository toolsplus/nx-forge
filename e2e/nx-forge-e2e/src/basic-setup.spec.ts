import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GraphQLClient } from 'graphql-request';
import { generateForgeApp } from './utils/generate-forge-app';
import { cleanupRegisteredForgeApp } from './utils/cleanup-registered-forge-app';
import {
  Credentials,
  ForgeInstallationContext,
  getCredentials,
  getDeveloperSpaceId,
  getForgeInstallationContext,
} from './utils/config';
import { createClient } from './utils/atlassian-graphql-client';
import {
  runCommandAsync,
  runForgeCommandAsync,
  runNxCommandAsync,
} from './utils/async-commands';
import {
  cleanupTestWorkspace,
  createTestWorkspace,
} from './utils/test-workspace';
import stripAnsi = require('strip-ansi');

describe('Forge lifecycle', () => {
  // initialize before all tests
  let workspaceDirectory: string;
  let developerCredentials: Credentials;
  let apiClient: GraphQLClient;
  let installationContext: ForgeInstallationContext;
  let developerSpaceId: string;

  beforeAll(async () => {
    workspaceDirectory = createTestWorkspace();
    developerCredentials = getCredentials();
    apiClient = createClient(developerCredentials);
    installationContext = getForgeInstallationContext();
    developerSpaceId = getDeveloperSpaceId();

    // Initialize the Forge CLI, otherwise commands may fail due to expected interactive input
    await runCommandAsync(`npx forge settings set usage-analytics false`, {
      cwd: workspaceDirectory,
      silenceError: true,
    });
  });

  afterAll(async () => {
    try {
      if (workspaceDirectory) {
        await runNxCommandAsync('reset', { cwd: workspaceDirectory });
      }
    } finally {
      cleanupTestWorkspace(workspaceDirectory);
    }
  });

  it('should generate, build, package, register, deploy and install a Forge app', async () => {
    const appName = await generateForgeApp({
      cwd: workspaceDirectory,
      directory: 'apps',
    });

    // Build

    const nxBuildResult = await runNxCommandAsync(`run ${appName}:build`, {
      cwd: workspaceDirectory,
      silenceError: true,
    });
    expect(nxBuildResult.stderr).toEqual('');
    expect(stripAnsi(nxBuildResult.stdout)).toContain(
      'Successfully ran target build for project'
    );

    // Package

    const nxPackageResult = await runNxCommandAsync(
      `run ${appName}:package`,
      {
        cwd: workspaceDirectory,
      }
    );
    expect(nxPackageResult.stderr).toEqual('');
    expect(stripAnsi(nxPackageResult.stdout)).toEqual(
      expect.stringContaining('Successfully ran target package for project')
    );

    // Register

    const unregisteredOutputManifestContent = readFileSync(
      join(workspaceDirectory, 'dist', 'apps', appName, 'manifest.yml'),
      'utf8'
    );
    expect(unregisteredOutputManifestContent).toContain(
      'ari:cloud:ecosystem::app/to-be-generated'
    );

    const nxRegisterResult = await runNxCommandAsync(
      `run ${appName}:register --accept-terms --developer-space-id ${developerSpaceId}`,
      {
        cwd: workspaceDirectory,
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

    const registeredOutputManifestContent = readFileSync(
      join(workspaceDirectory, 'dist', 'apps', appName, 'manifest.yml'),
      'utf8'
    );
    const [registeredAppId] =
      registeredOutputManifestContent.match(registeredAppIdRegex) ?? [];
    expect(registeredAppId).not.toBeNull();
    expect(registeredAppId).toBeDefined();
    expect(registeredAppId).not.toEqual('');

    const projectManifestContent = readFileSync(
      join(workspaceDirectory, 'apps', appName, 'manifest.yml'),
      'utf8'
    );
    expect(projectManifestContent).toContain(registeredAppId);

    try {
      // Deploy

      // Run with `--no-verfiy` because the generated blank app template causes linting errors
      const nxDeployResult = await runNxCommandAsync(
        `run ${appName}:deploy --no-verify`,
        {
          cwd: workspaceDirectory,
          silenceError: true,
        }
      );
      expect(nxDeployResult.stderr).toEqual('');
      expect(stripAnsi(nxDeployResult.stdout)).toContain('Forge app deployed');

      // Install using Forge CLI

      const installResult = await runForgeCommandAsync(
        `install --product=${installationContext.product} --site=${installationContext.siteUrl} --environment ${installationContext.environment} --non-interactive`,
        {
          cwd: join(workspaceDirectory, 'dist', 'apps', appName),
          silenceError: true,
        }
      );
      expect(installResult.stderr).toEqual('');
      expect(stripAnsi(installResult.stdout)).toMatch(/Install.*complete/);
    } finally {
      if (registeredAppId) {
        await cleanupRegisteredForgeApp({
          appDirectory: join(workspaceDirectory, 'dist', 'apps', appName),
          appId: registeredAppId,
          apiClient,
          installationContext,
        });
      }
    }
  });
});
