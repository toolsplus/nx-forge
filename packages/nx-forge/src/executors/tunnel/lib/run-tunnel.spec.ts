import { ExecutorContext } from '@nx/devkit';
import runTunnel from './run-tunnel';
import { spawnForgeCommand } from '../../../utils/forge/async-commands';
import { waitUntilServerIsListening } from './wait-until-server-is-listening';

jest.mock('../../../utils/forge/async-commands', () => ({
  spawnForgeCommand: jest.fn(),
}));
jest.mock('./wait-until-server-is-listening', () => ({
  waitUntilServerIsListening: jest.fn(),
}));

describe('runTunnel', () => {
  it('should not start the Forge CLI if the executor stopped while it waited for the Custom UIs', async () => {
    const stop = new AbortController();
    jest.mocked(waitUntilServerIsListening).mockImplementation(async () => {
      stop.abort();
    });

    const result = await runTunnel(
      {
        outputPath: 'dist/apps/my-app',
        debug: false,
        verbose: false,
        preTunnelTimeout: 5000,
        customUIProjectConfigs: [{ projectName: 'my-ui', port: 3000 }],
        signal: stop.signal,
      },
      {} as ExecutorContext
    );

    expect(result).toEqual({ id: 'tunnel', success: false });
    expect(spawnForgeCommand).not.toHaveBeenCalled();
  });
});
