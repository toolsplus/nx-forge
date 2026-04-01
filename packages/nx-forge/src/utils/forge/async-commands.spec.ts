import { PassThrough } from 'node:stream';

import { getPackageManagerCommand } from '@nx/devkit';
import { spawn } from 'node:child_process';

import { runForgeCommandAsync } from './async-commands';

jest.mock('node:child_process', () => ({
  spawn: jest.fn(),
}));

jest.mock('@nx/devkit', () => ({
  getPackageManagerCommand: jest.fn(),
}));

describe('runForgeCommandAsync', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (getPackageManagerCommand as jest.Mock).mockReturnValue({ exec: 'npx' });
  });

  it('should spawn Forge via the package manager and pipe output through the parent process', async () => {
    const cliProcess = createMockChildProcess();

    (spawn as jest.Mock).mockReturnValue(cliProcess);

    const promise = runForgeCommandAsync(['deploy', '--verbose'], {
      cwd: '/tmp/app',
      env: { FORGE_USER_VAR: '1' },
    });

    expect(spawn).toHaveBeenCalledWith('npx forge deploy --verbose', {
      cwd: '/tmp/app',
      env: expect.objectContaining({ FORGE_USER_VAR: '1' }),
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
    });
    expect(cliProcess.stdout.pipe).toHaveBeenCalledWith(process.stdout);
    expect(cliProcess.stderr.pipe).toHaveBeenCalledWith(process.stderr);

    cliProcess.emit('exit', 0);

    await expect(promise).resolves.toBeUndefined();
    expect(cliProcess.stdout.unpipe).toHaveBeenCalledWith(process.stdout);
    expect(cliProcess.stderr.unpipe).toHaveBeenCalledWith(process.stderr);
  });

  it('should resolve Forge via the package manager even from nested working directories', async () => {
    const cliProcess = createMockChildProcess();

    (spawn as jest.Mock).mockReturnValue(cliProcess);

    const promise = runForgeCommandAsync(['tunnel', '--debug'], {
      cwd: '/tmp/dist/forge/my-app',
    });

    expect(spawn).toHaveBeenCalledWith('npx forge tunnel --debug', {
      cwd: '/tmp/dist/forge/my-app',
      env: expect.any(Object),
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
    });

    cliProcess.emit('exit', 0);

    await expect(promise).resolves.toBeUndefined();
  });

  it('should reject when the Forge command exits with a non-zero status', async () => {
    const cliProcess = createMockChildProcess();

    (spawn as jest.Mock).mockReturnValue(cliProcess);

    const promise = runForgeCommandAsync(['register']);

    cliProcess.emit('exit', 2);

    await expect(promise).rejects.toThrow('Exit with error code: 2');
    expect(cliProcess.stdout.unpipe).toHaveBeenCalledWith(process.stdout);
    expect(cliProcess.stderr.unpipe).toHaveBeenCalledWith(process.stderr);
  });
});

function createMockChildProcess() {
  const cliProcess = new PassThrough() as PassThrough & {
    stdout: PassThrough;
    stderr: PassThrough;
  };

  cliProcess.stdout = new PassThrough();
  cliProcess.stderr = new PassThrough();

  jest.spyOn(cliProcess.stdout, 'pipe');
  jest.spyOn(cliProcess.stdout, 'unpipe');
  jest.spyOn(cliProcess.stderr, 'pipe');
  jest.spyOn(cliProcess.stderr, 'unpipe');

  return cliProcess;
}
