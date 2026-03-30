import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const TEST_PROJECTS_ROOT = join(process.cwd(), 'tmp');

const runCommand = (command: string, cwd: string) => {
  execSync(command, {
    cwd,
    stdio: 'inherit',
    env: process.env,
    windowsHide: true,
  });
};

const uniqueProjectName = () =>
  `test-project-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

export const createTestProject = (projectName = uniqueProjectName()): string => {
  const projectDirectory = join(TEST_PROJECTS_ROOT, projectName);

  rmSync(projectDirectory, {
    recursive: true,
    force: true,
  });
  mkdirSync(dirname(projectDirectory), {
    recursive: true,
  });

  runCommand(
    `npx -y create-nx-workspace@latest ${projectName} --preset=apps --nxCloud=skip --packageManager=npm --no-interactive`,
    TEST_PROJECTS_ROOT
  );

  const nxJsonPath = join(projectDirectory, 'nx.json');
  const nxJson = JSON.parse(readFileSync(nxJsonPath, 'utf8'));
  nxJson.analytics = false;
  writeFileSync(nxJsonPath, JSON.stringify(nxJson, null, 2) + '\n', 'utf8');

  runCommand(
    'npx nx add @toolsplus/nx-forge@e2e --interactive=false',
    projectDirectory
  );

  return projectDirectory;
};

export const cleanupTestProject = (projectDirectory?: string) => {
  if (!projectDirectory) {
    return;
  }

  rmSync(projectDirectory, {
    recursive: true,
    force: true,
  });
};
