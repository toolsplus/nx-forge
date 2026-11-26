import { ExecutorContext, logger } from '@nx/devkit';
import { statSync } from 'node:fs';
import path from 'node:path';
import { spawnForgeCommand } from '../../../utils/forge/async-commands';
import { TunnelExecutorOptions } from '../schema';
import { waitUntilServerIsListening } from './wait-until-server-is-listening';
import { forwardTerminationSignals } from './forward-termination-signals';
import { stopProcessTree } from './stop-process-tree';
import { BUNDLE_DIRECTORY } from '../../../shared/forge-output-path';

/**
 * Waits until the build has written the bundle to the output path.
 *
 * Checks repeatedly with exponential backoff, and once more at the deadline,
 * until either the function times out, or `<outputPath>/functions/index.js`
 * exists.
 *
 * @param outputPath App output path
 * @param timeoutMs Timeout in ms
 * @param initialDelayMs Initial delay before re-checking the condition
 */
export async function waitForBundle(
  outputPath: string,
  timeoutMs: number,
  initialDelayMs = 200
): Promise<boolean> {
  const bundleEntry = path.join(outputPath, BUNDLE_DIRECTORY, 'index.js');
  const bundleExists = () =>
    statSync(bundleEntry, { throwIfNoEntry: false })?.isFile() ?? false;

  const deadline = Date.now() + timeoutMs;
  let delay = initialDelayMs;
  while (!bundleExists()) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new Error(
        `Tunnel preparation timed out: The build did not write ${bundleEntry} within ${timeoutMs} ms.

        You can set a longer time out using the 'preTunnelTimeout' option of the tunnel executor.`
      );
    }
    // Wake up at the deadline at the latest, so that a bundle written late
    // in the timeout window is still seen.
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(delay, remaining))
    );
    delay = Math.min(delay * 2, 1000);
  }
  return true;
}

/**
 * Starts the `forge tunnel` process in the app's output directory. The execution of `forge tunnel` will be delayed
 * until all configured Custom UI dev servers are listening on their configured tunnel port.
 *
 * When this process is asked to stop, it stops `forge tunnel` with SIGTERM, so that the tunnel is deregistered.
 *
 * @param options Tunnel executor options
 * @param context Executor context for this call
 */
export default async function runTunnel(
  options: TunnelExecutorOptions & {
    customUIProjectConfigs: {
      projectName: string;
      port: number;
    }[];
    /** Aborting it stops `forge tunnel` and the processes it started. */
    signal?: AbortSignal;
  },
  context: ExecutorContext
): Promise<{ id: 'tunnel'; success: boolean }> {
  if (options.customUIProjectConfigs.length > 0) {
    logger.info(
      `Wait for all Custom UI 'serve' targets to have started and servers are listening...`
    );

    await Promise.all(
      options.customUIProjectConfigs.map(({ port }) =>
        waitUntilServerIsListening(port, context)
      )
    );

    logger.info(
      `All Custom UI 'serve' targets have started and servers are listening`
    );
  }

  const args = [
    'tunnel',
    ...(options.verbose === true ? ['--verbose'] : []),
    ...(options.debug === true ? ['--debug'] : []),
  ];

  // The executor may have stopped while this waited for the Custom UIs.
  if (options.signal?.aborted) {
    return { id: 'tunnel', success: false };
  }

  logger.info(`Running: > forge ${args.join(' ')}`);

  const tunnelProcess = spawnForgeCommand(args, {
    cwd: options.outputPath,
    env: {
      // Unset NODE_ENV, if this is set to 'development' it may cause issues
      // starting the tunnel process
      // https://stackoverflow.com/questions/69566849/installing-forge-cli-is-bringing-spawn-ts-node-enoent-error
      NODE_ENV: undefined,
    },
    // Under Nx, the Forge CLI does not get Ctrl+C as a key press, because its
    // output is not a terminal. In the terminal's process group, it would get
    // the SIGINT instead and exit without deregistering the tunnel. On
    // Windows, a detached process would open a new console window.
    detached: process.platform !== 'win32',
  });
  // The Forge CLI deregisters the tunnel on the first SIGTERM. Another signal
  // while it does so makes it exit before the tunnel is deregistered.
  let stopped = false;
  const stopTunnel = () => {
    if (!stopped) {
      stopped = true;
      stopProcessTree(tunnelProcess);
    }
  };
  forwardTerminationSignals(tunnelProcess, stopTunnel);
  options.signal?.addEventListener('abort', stopTunnel, { once: true });

  return new Promise<{ id: 'tunnel'; success: boolean }>((resolve, reject) => {
    tunnelProcess.once('exit', (code: number | null) => {
      if (options.signal?.aborted) {
        resolve({ id: 'tunnel', success: false });
        return;
      }
      if (code === 0) {
        logger.info('Exiting the forge tunnel process...');
        resolve({
          id: 'tunnel',
          success: true,
        });
      } else {
        reject(
          new Error('Forge tunnel process terminated with error code: ' + code)
        );
      }
    });
    tunnelProcess.once('error', (err: Error) => {
      reject(new Error('Forge tunnel process failed: ' + err));
    });
  });
}
