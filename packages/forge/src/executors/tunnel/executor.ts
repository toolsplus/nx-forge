import { ExecutorContext, logger, runExecutor } from '@nx/devkit';
import { combineAsyncIterables } from '@nx/devkit/src/utils/async-iterable';
import { TunnelExecutorOptions } from './schema';
import runTunnel from './lib/run-tunnel';
import { getCustomUiProjects } from './lib/extract-custom-ui-projects';

/**
 * Forge tunnel executor that serves all Custom UI projects in the manifest.yml
 * on the tunnel port configured in the manifest.yml.
 *
 * Additionally, this will start a build process for the Forge app in watch mode
 * and launch the `forge tunnel` command in the configured output directory.
 *
 * @see https://github.com/nrwl/nx/issues/3748#issuecomment-990980640
 * @see https://gist.github.com/chrisui/a3cdf050bf18eccd499fba29b609b90a
 * @see https://github.com/nrwl/nx/blob/cded83b2c5bf3e4252c03d4dbcbb5b203b0faed0/packages/webpack/src/executors/ssr-dev-server/ssr-dev-server.impl.ts
 */
export default async function runTunnelExecutor(
  options: TunnelExecutorOptions,
  context: ExecutorContext
) {
  const customUiProjectConfigs = await getCustomUiProjects(context);
  let runAllCustomUiServe = undefined;

  if (customUiProjectConfigs.length > 0) {
    const [customUiHeadConfig, ...customUiRestConfig] = customUiProjectConfigs;

    // execute the serve target on custom UI projects
    runAllCustomUiServe = await runExecutor(
      { project: customUiHeadConfig.projectName, target: 'serve' },
      { port: customUiHeadConfig.port },
      context
    );

    for (const { projectName, port } of customUiRestConfig ?? []) {
      runAllCustomUiServe = combineAsyncIterables(
        runAllCustomUiServe,
        await runExecutor(
          { project: projectName, target: 'serve' },
          { port },
          context
        )
      );
    }
  }

  const runForgeAppBuild = await runExecutor(
    { project: context.projectName, target: 'build' },
    { watch: true },
    context
  );

  // execute the tunnel target on the focused project
  const runForgeTunnel = promiseToIterator(
    runTunnel({ ...options, customUiProjectConfigs }, context)
  );

  // once all executors are loaded, watch out for any failures
  // we combine (interleave) all executor iterators here
  const combined = combineAsyncIterables(
    runAllCustomUiServe,
    runForgeAppBuild,
    runForgeTunnel
  );

  try {
    for await (const output of combined) {
      if (!output.success) return output;
    }
  } catch (err) {
    logger.error(`Failed to tunnel Forge app: ${err}`);
    throw err;
  }

  return { success: true };
}

async function* promiseToIterator<T extends { success: boolean }>(
  v: Promise<T>
): AsyncIterableIterator<T> {
  yield await v;
}
