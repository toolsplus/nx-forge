import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GraphQLClient } from 'graphql-request';
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
import {
  cleanupTestProject,
  createTestProject,
} from './utils/test-project';
import stripAnsi = require('strip-ansi');

describe('Forge lifecycle', () => {
  // initialize before all tests
  let projectDirectory: string;
  let developerCredentials: Credentials;
  let apiClient: GraphQLClient;
  let installationContext: ForgeInstallationContext;
  let developerSpaceId: string;

  beforeAll(async () => {
    projectDirectory = createTestProject();
    developerCredentials = getCredentials();
    apiClient = createClient(developerCredentials);
    installationContext = getForgeInstallationContext();
    developerSpaceId = getDeveloperSpaceId();

    // Initialize the Forge CLI, otherwise commands may fail due to expected interactive input
    await runCommandAsync(`npx forge settings set usage-analytics false`, {
      cwd: projectDirectory,
      silenceError: true,
    });
  });

  afterAll(async () => {
    try {
      if (projectDirectory) {
        await runNxCommandAsync('reset', { cwd: projectDirectory });
      }
    } finally {
      cleanupTestProject(projectDirectory);
    }
  });

  it('should generate, build, package, register, deploy and install a Forge app', async () => {
    const appName = await generateForgeApp({
      cwd: projectDirectory,
      directory: 'apps',
    });

    // Build

    const nxBuildResult = await runNxCommandAsync(`run ${appName}:build`, {
      cwd: projectDirectory,
      silenceError: true,
    });
    expect(nxBuildResult.stderr).toEqual('');
    expect(stripAnsi(nxBuildResult.stdout)).toContain(
      'Successfully ran target build for project'
    );

    // Package

    const nxPackageResult = await runNxCommandAsync(`run ${appName}:package`, {
      cwd: projectDirectory,
    });
    expect(nxPackageResult.stderr).toEqual('');
    expect(stripAnsi(nxPackageResult.stdout)).toEqual(
      expect.stringContaining('Successfully ran target package for project')
    );

    // Register

    const unregisteredOutputManifestContent = readFileSync(
      join(projectDirectory, 'dist', 'apps', appName, 'manifest.yml'),
      'utf8'
    );
    expect(unregisteredOutputManifestContent).toContain(
      'ari:cloud:ecosystem::app/to-be-generated'
    );

    const nxRegisterResult = await runNxCommandAsync(
      `run ${appName}:register --accept-terms --developer-space-id ${developerSpaceId}`,
      {
        cwd: projectDirectory,
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
      join(projectDirectory, 'dist', 'apps', appName, 'manifest.yml'),
      'utf8'
    );
    const [registeredAppId] =
      registeredOutputManifestContent.match(registeredAppIdRegex) ?? [];
    expect(registeredAppId).not.toBeNull();
    expect(registeredAppId).toBeDefined();
    expect(registeredAppId).not.toEqual('');

    const projectManifestContent = readFileSync(
      join(projectDirectory, 'apps', appName, 'manifest.yml'),
      'utf8'
    );
    expect(projectManifestContent).toContain(registeredAppId);

    try {
      // Deploy

      // Run with `--no-verfiy` because the generated blank app template causes linting errors
      const nxDeployResult = await runNxCommandAsync(
        `run ${appName}:deploy --no-verify`,
        {
          cwd: projectDirectory,
          silenceError: true,
        }
      );
      expect(nxDeployResult.stderr).toEqual('');
      expect(stripAnsi(nxDeployResult.stdout)).toContain('Forge app deployed');

      // Install using Forge CLI

      const installResult = await runForgeCommandAsync(
        `install --product=${installationContext.product} --site=${installationContext.siteUrl} --environment ${installationContext.environment} --non-interactive`,
        {
          cwd: join(projectDirectory, 'dist', 'apps', appName),
          silenceError: true,
        }
      );
      expect(installResult.stderr).toEqual('');
      expect(stripAnsi(installResult.stdout)).toMatch(/Install.*complete/);
    } finally {
      if (registeredAppId) {
        try {
          await runForgeCommandAsync(
            `uninstall --product=${installationContext.product} --site=${installationContext.siteUrl} --environment ${installationContext.environment} --non-interactive`,
            {
              cwd: join(projectDirectory, 'dist', 'apps', appName),
              silenceError: true,
            }
          );
        } catch (error) {
          console.warn(
            `Failed to uninstall Forge app ${registeredAppId}`,
            error
          );
        }

        try {
          const result = await deleteApp(registeredAppId)(apiClient);
          if (!result.success) {
            console.warn(
              `Failed to delete registered app ${registeredAppId}: ${result.errors}`
            );
          }
        } catch (error) {
          console.warn(
            `Failed to delete registered app ${registeredAppId}`,
            error
          );
        }
      }
    }
  });
});
