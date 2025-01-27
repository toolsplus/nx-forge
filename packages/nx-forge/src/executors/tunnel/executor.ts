import { ExecutorContext, logger, runExecutor } from '@nx/devkit';
import { combineAsyncIterables } from '@nx/devkit/src/utils/async-iterable';
import { TunnelExecutorOptions } from './schema';
import runTunnel, { isTunnelPreparationComplete } from './lib/run-tunnel';
import { getCustomUiProjects } from './lib/extract-custom-ui-projects';
import { startCustomUIs } from './lib/start-custom-uis';

/**
 * Forge tunnel executor that serves dependent Custom UI projects on the tunnel
 * port configured in the manifest.yml.
 *
 * Additionally, this will start a build process for the Forge app in watch mode,
 * call the package executor once to copy Forge app assets to the output directory
 * and launch the `forge tunnel` process in the configured output directory.
 *
 * @see https://github.com/nrwl/nx/issues/3748#issuecomment-990980640
 * @see https://gist.github.com/chrisui/a3cdf050bf18eccd499fba29b609b90a
 * @see https://github.com/nrwl/nx/blob/cded83b2c5bf3e4252c03d4dbcbb5b203b0faed0/packages/webpack/src/executors/ssr-dev-server/ssr-dev-server.impl.ts
 */
export default async function runTunnelExecutor(
  options: TunnelExecutorOptions,
  context: ExecutorContext
) {
  const customUIProjectConfigs = await getCustomUiProjects(context);

  const customUIIters = await startCustomUIs(customUIProjectConfigs, context);

  const forgeAppBuildIter = await runExecutor(
    { project: context.projectName, target: 'build' },
    { watch: true },
    context
  );

  await runExecutor(
    { project: context.projectName, target: 'package' },
    {},
    context
  );

  try {
    const preTunnelTimeout = options.preTunnelTimeout ?? 5000;
    await isTunnelPreparationComplete(options.outputPath, preTunnelTimeout);
  } catch (err) {
    logger.error(err.message);
    return { success: false };
  }

  // execute the tunnel target on the focused project
  const forgeTunnelIter = promiseToIterator(
    runTunnel({ ...options, customUIProjectConfigs }, context)
  );

  const combined: AsyncGenerator<{ success: boolean; id?: string }> =
    combineAsyncIterables(forgeAppBuildIter, ...customUIIters, forgeTunnelIter);

  try {
    for await (const output of combined) {
      if (!output.success)
        throw new Error(`A started process failed: ${JSON.stringify(output)}`);

      if (output?.id === 'tunnel') {
        logger.info('Tunnel process has been terminated.');
        const { value } = await combined.return({ success: true });
        return value;
      }
    }
  } catch (err) {
    logger.error(`Failed to tunnel Forge app: ${err}`);
    return await combined.return({ success: false });
  }
}

async function* promiseToIterator<
  ID extends string,
  T extends { id: ID; success: boolean }
>(v: Promise<T>): AsyncIterableIterator<T> {
  yield await v;
}
