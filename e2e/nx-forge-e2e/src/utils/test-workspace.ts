import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { workspaceRoot } from '@nx/devkit';

const TEST_WORKSPACES_ROOT = join(workspaceRoot, 'tmp');

const runCommand = (command: string, cwd: string) => {
  execSync(command, {
    cwd,
    stdio: 'inherit',
    env: process.env,
    windowsHide: true,
  });
};

const uniqueWorkspaceName = () =>
  `test-workspace-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

export const createTestWorkspace = (
  workspaceName = uniqueWorkspaceName()
): string => {
  const workspaceDirectory = join(TEST_WORKSPACES_ROOT, workspaceName);

  rmSync(workspaceDirectory, {
    recursive: true,
    force: true,
  });
  mkdirSync(dirname(workspaceDirectory), {
    recursive: true,
  });

  runCommand(
    `pnpm dlx create-nx-workspace@latest ${workspaceName} --preset=apps --nxCloud=skip --packageManager=pnpm --no-interactive`,
    TEST_WORKSPACES_ROOT
  );

  const nxJsonPath = join(workspaceDirectory, 'nx.json');
  const nxJson = JSON.parse(readFileSync(nxJsonPath, 'utf8'));
  nxJson.analytics = false;
  writeFileSync(nxJsonPath, JSON.stringify(nxJson, null, 2) + '\n', 'utf8');

  runCommand(
    'pnpm exec nx add @toolsplus/nx-forge@e2e --interactive=false',
    workspaceDirectory
  );

  return workspaceDirectory;
};

export const cleanupTestWorkspace = (workspaceDirectory?: string) => {
  if (!workspaceDirectory) {
    return;
  }

  rmSync(workspaceDirectory, {
    recursive: true,
    force: true,
  });
};
