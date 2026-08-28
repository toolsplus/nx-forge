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
import { getPackageManagerCommand } from '@nx/devkit';
import { runForgeCommandAsync } from './async-commands';

jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  getPackageManagerCommand: jest.fn(),
}));

const getPackageManagerCommandMock = jest.mocked(getPackageManagerCommand);

describe('runForgeCommandAsync', () => {
  let testRoot: string;
  let binPath: string;
  let invocationPath: string;
  let sideEffectPath: string;

  beforeEach(() => {
    testRoot = mkdtempSync(join(tmpdir(), 'nx-forge-command-'));
    binPath = join(testRoot, 'bin');
    invocationPath = join(testRoot, 'invocation.json');
    sideEffectPath = join(testRoot, 'shell-side-effect');
    mkdirSync(binPath);

    createPackageManagerShim(binPath, 'pnpm');
    mockPackageManagerCommand('pnpm exec');
  });

  afterEach(() => {
    rmSync(testRoot, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  it('preserves Forge arguments without shell interpretation', async () => {
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
      env: createEnvironment(binPath, invocationPath, {
        FORGE_SIDE_EFFECT: sideEffectPath,
        FORGE_TEST_ENV: 'forwarded',
      }),
    });

    expect(JSON.parse(readFileSync(invocationPath, 'utf8'))).toEqual({
      args: ['exec', 'forge', ...forgeArgs],
      cwd: realpathSync(testRoot),
      environmentValue: 'forwarded',
    });
    expect(existsSync(sideEffectPath)).toBe(false);
  });

  it.each([
    { exec: 'npx', executable: 'npx', prefixArgs: [] },
    { exec: 'pnpm exec', executable: 'pnpm', prefixArgs: ['exec'] },
    { exec: 'yarn', executable: 'yarn', prefixArgs: [] },
    { exec: 'bun', executable: 'bun', prefixArgs: [] },
  ])('supports the $exec package-manager command shape', async (command) => {
    createPackageManagerShim(binPath, command.executable);
    mockPackageManagerCommand(command.exec);

    await runForgeCommandAsync(['version'], {
      cwd: testRoot,
      env: createEnvironment(binPath, invocationPath),
    });

    expect(JSON.parse(readFileSync(invocationPath, 'utf8')).args).toEqual([
      ...command.prefixArgs,
      'forge',
      'version',
    ]);
  });

  it('rejects when Forge exits with a non-zero code', async () => {
    await expect(
      runForgeCommandAsync(['lint'], {
        cwd: testRoot,
        env: createEnvironment(binPath, invocationPath, {
          FORGE_EXIT_CODE: '7',
        }),
      })
    ).rejects.toThrow('Exit with error code: 7');
  });
});

function mockPackageManagerCommand(exec: string): void {
  getPackageManagerCommandMock.mockReturnValue({
    exec,
  } as ReturnType<typeof getPackageManagerCommand>);
}

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

function createPackageManagerShim(directory: string, command: string): void {
  const scriptPath = join(directory, 'fake-package-manager.cjs');
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
      '  })',
      ');',
      'process.exitCode = Number(process.env.FORGE_EXIT_CODE ?? 0);',
    ].join('\n')
  );

  if (process.platform === 'win32') {
    writeFileSync(
      join(directory, `${command}.cmd`),
      `@echo off\r\n"${process.execPath}" "%~dp0\\fake-package-manager.cjs" %*\r\n`
    );
  } else {
    const executablePath = join(directory, command);
    writeFileSync(
      executablePath,
      `#!/usr/bin/env node\nrequire('./fake-package-manager.cjs');\n`
    );
    chmodSync(executablePath, 0o755);
  }
}
