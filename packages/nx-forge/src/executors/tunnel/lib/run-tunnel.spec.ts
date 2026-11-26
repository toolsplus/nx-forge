import { EventEmitter } from 'node:events';
import { ExecutorContext } from '@nx/devkit';
import runTunnel from './run-tunnel';
import { spawnForgeCommand } from '../../../utils/forge/async-commands';
import { waitUntilServerIsListening } from './wait-until-server-is-listening';
import { stopProcessTree } from './stop-process-tree';

jest.mock('../../../utils/forge/async-commands', () => ({
  spawnForgeCommand: jest.fn(),
}));
jest.mock('./wait-until-server-is-listening', () => ({
  waitUntilServerIsListening: jest.fn(),
}));
jest.mock('./stop-process-tree', () => ({ stopProcessTree: jest.fn() }));

const options = {
  outputPath: 'dist/apps/my-app',
  debug: false,
  verbose: false,
  preTunnelTimeout: 5000,
};

const startTunnel = (signal?: AbortSignal) => {
  const tunnelProcess = new EventEmitter();
  jest
    .mocked(spawnForgeCommand)
    .mockReturnValue(
      tunnelProcess as unknown as ReturnType<typeof spawnForgeCommand>
    );
  const result = runTunnel(
    { ...options, customUIProjectConfigs: [], signal },
    {} as ExecutorContext
  );
  return { tunnelProcess, result };
};

describe('runTunnel', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not start the Forge CLI if the executor stopped while it waited for the Custom UIs', async () => {
    const stop = new AbortController();
    jest.mocked(waitUntilServerIsListening).mockImplementation(async () => {
      stop.abort();
    });

    const result = await runTunnel(
      {
        ...options,
        customUIProjectConfigs: [{ projectName: 'my-ui', port: 3000 }],
        signal: stop.signal,
      },
      {} as ExecutorContext
    );

    expect(result).toEqual({ id: 'tunnel', success: false });
    expect(spawnForgeCommand).not.toHaveBeenCalled();
  });

  (process.platform === 'win32' ? it.skip : it)(
    'should start the Forge CLI outside the terminal process group, so that Ctrl+C does not reach it',
    async () => {
      const { tunnelProcess, result } = startTunnel();
      await Promise.resolve();

      expect(spawnForgeCommand).toHaveBeenCalledWith(
        ['tunnel'],
        expect.objectContaining({ detached: true })
      );
      tunnelProcess.emit('exit', 0);
      await result;
    }
  );

  it('should stop the Forge CLI only once, so that it can deregister the tunnel', async () => {
    const stop = new AbortController();
    const { tunnelProcess, result } = startTunnel(stop.signal);
    await Promise.resolve();

    process.emit('SIGINT', 'SIGINT');
    stop.abort();
    process.emit('SIGTERM', 'SIGTERM');

    expect(stopProcessTree).toHaveBeenCalledTimes(1);
    expect(stopProcessTree).toHaveBeenCalledWith(tunnelProcess);
    tunnelProcess.emit('exit', 0);
    await expect(result).resolves.toEqual({ id: 'tunnel', success: false });
  });
});
