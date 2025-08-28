import { ExecutorContext, logger } from '@nx/devkit';
import { spawn } from 'node:child_process';
import * as process from 'node:process';
import { TunnelExecutorOptions } from '../schema';
import { waitUntilServerIsListening } from './wait-until-server-is-listening';
import { statSync, readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * Checks if the tunnel executor is ready to run the Forge tunnel process.
 *
 * Checks if:
 * - the manifest.yml exists in the output path
 * - the `src` directory in the output path is non-empty
 *
 * This will perform these checks repeatedly with exponential backoff until,
 * either the function times out, or all checks complete successfully.
 *
 * @param outputPath App output path
 * @param timeoutMs Timeout in ms
 * @param initialDelayMs Initial delay before re-checking the condition
 */
export async function isTunnelPreparationComplete(
  outputPath: string,
  timeoutMs: number,
  initialDelayMs = 200
): Promise<boolean> {
  const manifestExists = () =>
    statSync(path.join(outputPath, 'manifest.yml'), {
      throwIfNoEntry: false,
    })?.isFile() ?? false;
  const isOutputPathSrcDirNonEmpty = () =>
    (statSync(path.join(outputPath, 'src'), {
      throwIfNoEntry: false,
    })?.isDirectory() &&
      readdirSync(path.join(outputPath, 'src')).length > 0) ??
    false;

  const timeout = new Promise<boolean>((_, reject) => {
    setTimeout(
      () =>
        reject(
          new Error(
            `Tunnel preparation timed out: Did not completed within ${timeoutMs} ms.

            You can set a longer time out using the 'preTunnelTimeout' option of the tunnel executor.`
          )
        ),
      timeoutMs
    );
  });

  const tunnelReadyCondition = async function (): Promise<boolean> {
    let delay = initialDelayMs;
    while (true) {
      try {
        if (manifestExists() && isOutputPathSrcDirNonEmpty()) {
          return true;
        }
      } catch (err) {
        throw new Error(
          `Unexpected error checking tunnel preparation complete: ${err}`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  };

  return Promise.race([tunnelReadyCondition(), timeout]);
}

/**
 * Starts the `forge tunnel` process in the app's output directory. The execution of `forge tunnel` will be delayed
 * until all configured Custom UI dev servers are listening on their configured tunnel port.
 *
 * This will set the `FORGE_TUNNEL_MOUNT_DIRECTORIES` env variable on the tunnel process to mount the Nx workspace
 * root `node_modules` folder into the tunnel container. This makes sure that the Forge bundler running in the tunnel
 * Docker container knows about installed npm dependencies.
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

  const command = `forge ${args.join(' ')}`;
  logger.info(`Running: > ${command}`);

  // https://2ality.com/2018/05/child-process-streams.html#running-commands-in-child-processes
  const tunnelProcess = spawn(command, {
    cwd: options.outputPath,
    env: {
      ...process.env,
      // Unset NODE_ENV, if this is set to 'development' it may cause issues
      // starting the tunnel process
      // https://stackoverflow.com/questions/69566849/installing-forge-cli-is-bringing-spawn-ts-node-enoent-error
      NODE_ENV: undefined,
    },
    stdio: 'inherit',
    shell: true,
  });

  return new Promise<{ id: 'tunnel'; success: boolean }>((resolve, reject) => {
    tunnelProcess.once('exit', (code: number) => {
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
