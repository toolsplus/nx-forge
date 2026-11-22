import {
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { delimiter, join } from 'path';
import { workspaceRoot } from '@nx/devkit';
import { runForgeCommandAsync } from './async-commands';

jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  workspaceRoot: jest
    .requireActual<typeof import('fs')>('fs')
    .mkdtempSync(
      jest
        .requireActual<typeof import('path')>('path')
        .join(
          jest.requireActual<typeof import('os')>('os').tmpdir(),
          'nx-forge-workspace-'
        )
    ),
}));

describe('runForgeCommandAsync', () => {
  const workspaceBinPath = join(workspaceRoot, 'node_modules', '.bin');
  let testRoot: string;
  let pathBinPath: string;
  let invocationPath: string;
  let sideEffectPath: string;

  beforeEach(() => {
    testRoot = mkdtempSync(join(tmpdir(), 'nx-forge-command-'));
    pathBinPath = join(testRoot, 'bin');
    invocationPath = join(testRoot, 'invocation.json');
    sideEffectPath = join(testRoot, 'shell-side-effect');
    mkdirSync(pathBinPath);
    mkdirSync(workspaceBinPath, { recursive: true });

    createForgeShim(workspaceBinPath, 'workspace');
    createForgeShim(pathBinPath, 'path');
  });

  afterEach(() => {
    rmSync(testRoot, { recursive: true, force: true });
    rmSync(workspaceBinPath, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  afterAll(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('preserves Forge CLI arguments without shell interpretation', async () => {
    const injectedCommand =
      process.platform === 'win32'
        ? "approval value&node -e \"require('fs').writeFileSync(process.env.FORGE_SIDE_EFFECT,'created')\""
        : "approval value;node -e \"require('fs').writeFileSync(process.env.FORGE_SIDE_EFFECT,'created')\"";
    const forgeArgs = [
      'deploy',
      '--approve',
      injectedCommand,
      '--major-version',
      '2',
    ];

    await runForgeCommandAsync(forgeArgs, {
      cwd: testRoot,
      env: createEnvironment(pathBinPath, invocationPath, {
        FORGE_SIDE_EFFECT: sideEffectPath,
        FORGE_TEST_ENV: 'forwarded',
      }),
    });

    expect(JSON.parse(readFileSync(invocationPath, 'utf8'))).toEqual({
      args: forgeArgs,
      cwd: realpathSync(testRoot),
      environmentValue: 'forwarded',
      source: 'workspace',
    });
    expect(existsSync(sideEffectPath)).toBe(false);
  });

  it('runs the Forge CLI in the given directory, which has no package.json', async () => {
    await runForgeCommandAsync(['version'], {
      cwd: testRoot,
      env: createEnvironment(pathBinPath, invocationPath),
    });

    expect(existsSync(join(testRoot, 'package.json'))).toBe(false);
    expect(JSON.parse(readFileSync(invocationPath, 'utf8')).cwd).toEqual(
      realpathSync(testRoot)
    );
  });

  it('falls back to the Forge CLI on the PATH', async () => {
    rmSync(workspaceBinPath, { recursive: true, force: true });

    await runForgeCommandAsync(['version'], {
      cwd: testRoot,
      env: createEnvironment(pathBinPath, invocationPath),
    });

    expect(JSON.parse(readFileSync(invocationPath, 'utf8')).source).toEqual(
      'path'
    );
  });

  it('rejects when the Forge CLI exits with a non-zero code', async () => {
    await expect(
      runForgeCommandAsync(['lint'], {
        cwd: testRoot,
        env: createEnvironment(pathBinPath, invocationPath, {
          FORGE_EXIT_CODE: '7',
        }),
      })
    ).rejects.toThrow('Exit with error code: 7');
  });
});

function createEnvironment(
  binPath: string,
  invocationPath: string,
  extraEnvironment: NodeJS.ProcessEnv = {}
): NodeJS.ProcessEnv {
  const pathKey =
    Object.keys(process.env).find((key) => key.toLowerCase() === 'path') ??
    'PATH';

  return {
    [pathKey]: `${binPath}${delimiter}${process.env[pathKey] ?? ''}`,
    FORGE_INVOCATION_PATH: invocationPath,
    ...extraEnvironment,
  };
}

function createForgeShim(directory: string, source: string): void {
  const scriptPath = join(directory, 'fake-forge.cjs');
  writeFileSync(
    scriptPath,
    [
      "const { writeFileSync } = require('fs');",
      'writeFileSync(',
      '  process.env.FORGE_INVOCATION_PATH,',
      '  JSON.stringify({',
      '    args: process.argv.slice(2),',
      '    cwd: process.cwd(),',
      '    environmentValue: process.env.FORGE_TEST_ENV,',
      `    source: ${JSON.stringify(source)},`,
      '  })',
      ');',
      'process.exitCode = Number(process.env.FORGE_EXIT_CODE ?? 0);',
    ].join('\n')
  );

  if (process.platform === 'win32') {
    writeFileSync(
      join(directory, 'forge.cmd'),
      `@echo off\r\n"${process.execPath}" "%~dp0\\fake-forge.cjs" %*\r\n`
    );
  } else {
    const executablePath = join(directory, 'forge');
    writeFileSync(
      executablePath,
      `#!/usr/bin/env node\nrequire('./fake-forge.cjs');\n`
    );
    chmodSync(executablePath, 0o755);
  }
}
