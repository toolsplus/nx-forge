import { ExecutorContext, logger } from '@nx/devkit';
import { join } from 'path';
import { spawn } from 'child_process';
import { TunnelExecutorOptions } from '../schema';
import { waitUntilServerIsListening } from './wait-until-server-is-listening';

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
    customUiProjectConfigs: {
      projectName: string;
      port: number;
    }[];
  },
  context: ExecutorContext
): Promise<{ success: boolean }> {
  logger.info(
    `Wait for all Custom UI 'serve' targets to have started and servers are listening...`
  );

  await Promise.all(
    options.customUiProjectConfigs.map(({ port }) =>
      waitUntilServerIsListening(port, context)
    )
  );

  logger.info(
    `All Custom UI 'serve' targets have started and servers are listening`
  );

  const args = [
    'tunnel',
    ...(options.verbose === true ? ['--verbose'] : []),
    ...(options.debug === true ? ['--debug'] : []),
  ];

  const command = `forge ${args.join(' ')}`;
  logger.log(`Running: ${command}`);

  // https://2ality.com/2018/05/child-process-streams.html#running-commands-in-child-processes
  const tunnelProcess = spawn('forge', args, {
    cwd: options.outputPath,
    env: {
      ...process.env,
      // Mount the root node_modules folder into the tunnel container to avoid having to npm install in the dist directory
      // https://github.com/toolsplus/forge-turbo/issues/1#issue-1451384347
      FORGE_TUNNEL_MOUNT_DIRECTORIES: `${join(
        context.root,
        'node_modules'
      )}:/app/node_modules`,
    },
    stdio: 'inherit',
  });

  return new Promise<{ success: boolean }>((resolve, reject) => {
    tunnelProcess.once('exit', (code: number) => {
      if (code === 0) {
        logger.info('Exiting the forge tunnel process...');
        resolve({
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
