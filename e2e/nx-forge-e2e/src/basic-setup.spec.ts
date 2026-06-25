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
import type { CommandResult } from './utils/async-commands';
import {
  formatCommandFailure,
  runCommandAsync,
  runForgeCommandAsync,
  runNxCommandAsync,
} from './utils/async-commands';
import {
  cleanupTestWorkspace,
  createTestWorkspace,
} from './utils/test-workspace';
import stripAnsi = require('strip-ansi');

const forgeLifecycleTestTimeoutMs = 8 * 60 * 1000;

const normalizeCommandResult = (result: CommandResult): CommandResult => ({
  ...result,
  stdout: stripAnsi(result.stdout),
  stderr: stripAnsi(result.stderr),
});

const expectCliCommand = ({
  command,
  result,
  stdout,
  allowStderr = false,
}: {
  command: string;
  result: CommandResult;
  stdout?: string | RegExp;
  allowStderr?: boolean;
}) => {
  const normalizedResult = normalizeCommandResult(result);
  const failures: string[] = [];

  if (normalizedResult.exitCode !== 0) {
    failures.push(
      `Expected exit code 0, got ${String(normalizedResult.exitCode)}.`
    );
  }

  if (!allowStderr && normalizedResult.stderr !== '') {
    failures.push('Expected stderr to be empty.');
  }

  if (typeof stdout === 'string' && !normalizedResult.stdout.includes(stdout)) {
    failures.push(`Expected stdout to contain: ${stdout}`);
  } else if (
    stdout instanceof RegExp &&
    !stdout.test(normalizedResult.stdout)
  ) {
    failures.push(`Expected stdout to match: ${stdout.toString()}`);
  }

  if (failures.length > 0) {
    throw new Error(
      formatCommandFailure(command, normalizedResult, failures.join('\n'))
    );
  }
};

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
    const forgeSettingsResult = await runCommandAsync(
      `npx forge settings set usage-analytics false`,
      {
        cwd: workspaceDirectory,
        silenceError: true,
      }
    );
    expectCliCommand({
      command: 'npx forge settings set usage-analytics false',
      result: forgeSettingsResult,
      allowStderr: true,
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

    const buildCommand = `run ${appName}:build`;
    const nxBuildResult = await runNxCommandAsync(buildCommand, {
      cwd: workspaceDirectory,
      silenceError: true,
    });
    expectCliCommand({
      command: `nx ${buildCommand}`,
      result: nxBuildResult,
      stdout: 'Successfully ran target build for project',
    });

    // Package

    const packageCommand = `run ${appName}:package`;
    const nxPackageResult = await runNxCommandAsync(packageCommand, {
      cwd: workspaceDirectory,
      silenceError: true,
    });
    expectCliCommand({
      command: `nx ${packageCommand}`,
      result: nxPackageResult,
      stdout: 'Successfully ran target package for project',
    });

    // Register

    const unregisteredOutputManifestContent = readFileSync(
      join(workspaceDirectory, 'dist', 'apps', appName, 'manifest.yml'),
      'utf8'
    );
    expect(unregisteredOutputManifestContent).toContain(
      'ari:cloud:ecosystem::app/to-be-generated'
    );

    const registerCommand = `run ${appName}:register --accept-terms --developer-space-id ${developerSpaceId}`;
    const nxRegisterResult = await runNxCommandAsync(registerCommand, {
      cwd: workspaceDirectory,
      silenceError: true,
    });
    expectCliCommand({
      command: `nx ${registerCommand}`,
      result: nxRegisterResult,
      stdout: 'Forge app registered',
    });

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

      // Run with `--no-verify` because the generated blank app template causes linting errors.
      const deployCommand = `run ${appName}:deploy --no-verify --no-interactive`;
      const nxDeployResult = await runNxCommandAsync(deployCommand, {
        cwd: workspaceDirectory,
        silenceError: true,
      });
      expectCliCommand({
        command: `nx ${deployCommand}`,
        result: nxDeployResult,
        stdout: 'Forge app deployed',
      });

      // Install using Forge CLI

      const installCommand = `install --product=${installationContext.product} --site=${installationContext.siteUrl} --environment ${installationContext.environment} --non-interactive`;
      const installResult = await runForgeCommandAsync(installCommand, {
        cwd: join(workspaceDirectory, 'dist', 'apps', appName),
        silenceError: true,
      });
      expectCliCommand({
        command: `forge ${installCommand}`,
        result: installResult,
        stdout: /Install.*complete/,
      });
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
  }, forgeLifecycleTestTimeoutMs);
});
