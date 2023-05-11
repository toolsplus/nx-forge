import {
  ensureNxProject,
  readFile,
  runCommandAsync,
  runNxCommandAsync,
} from '@nx/plugin/testing';
import { GraphQLClient } from 'graphql-request';
import { ensureCorrectWorkspaceRoot } from './utils/e2e-workspace';
import { generateForgeApp } from './utils/generate-forge-app';
import { Credentials, getCredentials } from './utils/config';
import { createClient, deleteApp } from './utils/atlassian-graphql-client';

describe('Forge deploy executor', () => {
  let developerCredentials: Credentials; // initialize before all tests
  let apiClient: GraphQLClient;

  beforeAll(async () => {
    ensureNxProject('@toolsplus/nx-forge', 'dist/packages/forge');
    ensureCorrectWorkspaceRoot();
    developerCredentials = getCredentials();
    apiClient = createClient(developerCredentials);

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

  it('should deploy a Forge app', async () => {
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

    // Run with `--no-verfiy` because the generated default app template causes linting errors
    const nxDeployResult = await runNxCommandAsync(
      `deploy ${appName} --no-verify`,
      {
        silenceError: true,
      }
    );
    expect(nxDeployResult.stderr).toEqual('');
    expect(nxDeployResult.stdout).toContain('Forge app deployed');

    // ari:cloud:ecosystem::app/<uuid>
    const registeredAppIdRegex =
      /ari:cloud:ecosystem::app\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

    const registeredOutputManifestContent = readFile(
      `dist/apps/${appName}/manifest.yml`
    );
    const [appId] = registeredOutputManifestContent.match(registeredAppIdRegex);

    // Clean up the registered app
    const result = await deleteApp(appId)(apiClient);
    if (!result.success) {
      throw new Error(
        `Failed to clean up registered app with id ${appId}: ${result.errors}`
      );
    }
  });
});
