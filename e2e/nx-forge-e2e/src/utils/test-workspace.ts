import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { NX_VERSION, workspaceRoot } from '@nx/devkit';

const TEST_WORKSPACES_ROOT = join(workspaceRoot, 'tmp');

/**
 * Variables that make create-nx-workspace detect an AI agent. It then creates
 * the workspace from a template and ignores `--preset` and `--no-workspaces`.
 */
const AI_AGENT_ENV_VARIABLES = [
  'CLAUDECODE',
  'CLAUDE_CODE',
  'OPENCODE',
  'CODEX_THREAD_ID',
  'SUPERSET_AGENT_ID',
  'COPILOT_CLI',
  'REPL_ID',
  'CURSOR_TRACE_ID',
  'GEMINI_CLI',
];

const getCommandEnv = (): NodeJS.ProcessEnv =>
  Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) =>
        // Nx runs task processes with NX_ADD_PLUGINS=false, but these e2e
        // commands create fresh child workspaces that should use their own
        // inference settings.
        key !== 'NX_ADD_PLUGINS' && !AI_AGENT_ENV_VARIABLES.includes(key)
    )
  );

const runCommand = (command: string, cwd: string) => {
  execSync(command, {
    cwd,
    stdio: 'inherit',
    env: getCommandEnv(),
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

  // nx-forge supports classic workspaces only, so do not depend on the
  // create-nx-workspace default for package manager workspaces.
  runCommand(
    `npx -y create-nx-workspace@${NX_VERSION} ${workspaceName} --preset=apps --no-workspaces --nxCloud=skip --skipGit --packageManager=npm --no-interactive`,
    TEST_WORKSPACES_ROOT
  );

  const nxJsonPath = join(workspaceDirectory, 'nx.json');
  const nxJson = JSON.parse(readFileSync(nxJsonPath, 'utf8'));
  nxJson.analytics = false;
  writeFileSync(nxJsonPath, JSON.stringify(nxJson, null, 2) + '\n', 'utf8');

  runCommand(
    'npx nx add @toolsplus/nx-forge@e2e --interactive=false',
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
