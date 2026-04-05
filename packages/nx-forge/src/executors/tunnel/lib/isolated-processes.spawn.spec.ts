jest.mock('node:child_process', () => ({
  ...jest.requireActual('node:child_process'),
  spawn: jest.fn(),
}));

import type { ChildProcess } from 'node:child_process';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import {
  spawnForgeTunnelProcess,
  spawnNxTarget,
} from './isolated-processes';

describe('process spawning', () => {
  let stdoutWriteSpy: jest.SpyInstance;
  let stderrWriteSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutWriteSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    stderrWriteSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutWriteSpy.mockRestore();
    stderrWriteSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('runs forge directly instead of routing through npx', () => {
    jest.mocked(spawn).mockReturnValue(createChildProcessStub());

    spawnForgeTunnelProcess({
      cwd: '/workspace/dist/apps/forge-app',
      debug: true,
      verbose: true,
    });

    expect(spawn).toHaveBeenCalledWith(
      'forge',
      ['tunnel', '--verbose', '--debug'],
      expect.objectContaining({
        cwd: '/workspace/dist/apps/forge-app',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    );
  });

  it('forces Nx child processes into static terminal output', () => {
    jest.mocked(spawn).mockReturnValue(createChildProcessStub());

    spawnNxTarget(
      {
        project: 'custom-ui-app',
        target: 'serve',
        configuration: 'development',
      },
      {
        cwd: '/workspace',
        label: 'custom-ui-app:serve',
        overrides: { port: 4201 },
      }
    );

    const [command, args, options] = jest.mocked(spawn).mock.calls[0];

    expect(command).toBe('pnpm');
    expect(args).toEqual([
      'exec',
      'nx',
      'run',
      'custom-ui-app:serve:development',
      '--port=4201',
    ]);
    expect(options).toEqual(
      expect.objectContaining({
        env: expect.objectContaining({
          NX_TASKS_RUNNER_DYNAMIC_OUTPUT: 'false',
          NX_TUI: 'false',
        }),
      })
    );
  });

  it('prefixes output and normalizes carriage returns before writing to the terminal', () => {
    const child = createChildProcessStub();
    jest.mocked(spawn).mockReturnValue(child);

    spawnForgeTunnelProcess({
      cwd: '/workspace/dist/apps/forge-app',
      verbose: true,
    });

    child.stdout.emit('data', 'first line\rrewritten line\npartial');
    child.stdout.emit('end');
    child.stderr.emit('data', 'problem\n');

    expect(stdoutWriteSpy).toHaveBeenCalledWith('[forge tunnel] first line\n');
    expect(stdoutWriteSpy).toHaveBeenCalledWith(
      '[forge tunnel] rewritten line\n'
    );
    expect(stdoutWriteSpy).toHaveBeenCalledWith('[forge tunnel] partial\n');
    expect(stderrWriteSpy).toHaveBeenCalledWith('[forge tunnel] problem\n');
  });
});

function createChildProcessStub() {
  const child = new EventEmitter() as EventEmitter &
    Partial<ChildProcess> & {
      pid: number;
      killed: boolean;
      exitCode: number | null;
      signalCode: NodeJS.Signals | null;
      stdout: EventEmitter & { setEncoding: jest.Mock };
      stderr: EventEmitter & { setEncoding: jest.Mock };
    };
  child.once = child.addListener.bind(child);
  Object.assign(child, {
    pid: 1234,
    killed: false,
    exitCode: null,
    signalCode: null,
    stdout: Object.assign(new EventEmitter(), { setEncoding: jest.fn() }),
    stderr: Object.assign(new EventEmitter(), { setEncoding: jest.fn() }),
  });
  return child as ChildProcess &
    EventEmitter & {
      stdout: EventEmitter & { setEncoding: jest.Mock };
      stderr: EventEmitter & { setEncoding: jest.Mock };
    };
}
