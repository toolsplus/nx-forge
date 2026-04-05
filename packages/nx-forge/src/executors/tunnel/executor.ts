import { ExecutorContext, logger } from '@nx/devkit';
import { TunnelExecutorOptions } from './schema';
import { createTunnelPlan } from './lib/create-tunnel-plan';
import {
  createProcessGroup,
  ExitResult,
  spawnForgeTunnelProcess,
  spawnNxTarget,
} from './lib/isolated-processes';
import { waitForTunnelPreparation, logTunnelCommand } from './lib/run-tunnel';
import { prepareForgeOutput } from '../package/lib/prepare-forge-output';
import { waitUntilServerIsListening } from './lib/wait-until-server-is-listening';

/**
 * Forge tunnel executor that prepares the packaged Forge output once, then
 * orchestrates isolated child processes for Custom UI dev servers, Forge build
 * watch, and the Forge CLI tunnel process.
 */
export default async function runTunnelExecutor(
  options: TunnelExecutorOptions,
  context: ExecutorContext
) {
  const processGroup = createProcessGroup();
  const interruption = createInterruptionPromise(processGroup);

  try {
    const plan = await createTunnelPlan(options, context);

    logger.info('Preparing Forge output...');
    const initialBuildProcess = spawnNxTarget(plan.buildTarget, {
      cwd: context.root,
      label: `${plan.projectName}:build`,
    });
    processGroup.add(initialBuildProcess);
    await raceWithInterruption(initialBuildProcess.completion, interruption);
    await raceWithInterruption(
      prepareForgeOutput(plan.packageOptions, context),
      interruption
    );
    await raceWithInterruption(
      waitForTunnelPreparation({
        manifestPathAbsolute: plan.manifestPathAbsolute,
        runtimePathAbsolute: plan.buildRuntimePathAbsolute,
      }),
      interruption
    );

    for (const customUiProject of plan.customUiProjects) {
      processGroup.addPersistent(
        spawnNxTarget(
          {
            project: customUiProject.projectName,
            target: 'serve',
            configuration: context.configurationName,
          },
          {
            cwd: context.root,
            label: `${customUiProject.projectName}:serve`,
            overrides: { port: customUiProject.port },
          }
        )
      );
    }

    processGroup.addPersistent(
      spawnNxTarget(plan.buildTarget, {
        cwd: context.root,
        label: `${plan.projectName}:build --watch`,
        overrides: plan.buildWatchOverrides,
      })
    );

    if (plan.customUiProjects.length > 0) {
      logger.info(
        `Waiting for ${plan.customUiProjects.length} Custom UI dev server(s) to listen...`
      );
      await raceWithInterruption(
        Promise.all(
          plan.customUiProjects.map(({ projectName, port }) =>
            waitUntilServerIsListening(port, context).catch((error) => {
              throw new Error(
                `Custom UI project '${projectName}' did not start listening on port ${port}: ${String(
                  error
                )}`
              );
            })
          )
        ),
        interruption
      );
    }

    logTunnelCommand(plan.tunnelOptions);
    const tunnelProcess = spawnForgeTunnelProcess({
      cwd: plan.packageOutputPathAbsolute,
      debug: plan.tunnelOptions.debug,
      verbose: plan.tunnelOptions.verbose,
    });
    processGroup.add(tunnelProcess);
    const tunnelStartedAt = Date.now();

    const tunnelExit = await Promise.race([
      tunnelProcess.completion.then((exit) => ({
        kind: 'tunnel-exit' as const,
        exit,
      })),
      processGroup.waitForUnexpectedExit(),
      interruption.promise,
    ]);

    throw createUnexpectedTunnelExitError(tunnelExit.exit, tunnelStartedAt);
  } catch (err) {
    await processGroup.shutdown();
    if (isTunnelInterruptedError(err)) {
      logger.info('Tunnel stopped.');
      return { success: true };
    }
    logger.error(err instanceof Error ? err.message : String(err));
    return { success: false };
  } finally {
    interruption.cleanup();
  }
}

function createInterruptionPromise(processGroup: ReturnType<typeof createProcessGroup>) {
  let settled = false;
  let cleanup = () => undefined;

  const promise = new Promise<never>((_, reject) => {
    const handleSignal = (signal: NodeJS.Signals) => {
      if (settled) {
        return;
      }

      settled = true;
      void processGroup.shutdown(signal).finally(() => {
        reject(new TunnelInterruptedError(signal));
      });
    };

    process.on('SIGINT', handleSignal);
    process.on('SIGTERM', handleSignal);

    cleanup = () => {
      process.off('SIGINT', handleSignal);
      process.off('SIGTERM', handleSignal);
    };
  });

  return {
    cleanup() {
      cleanup();
    },
    promise,
  };
}

class TunnelInterruptedError extends Error {
  constructor(readonly signal: NodeJS.Signals) {
    super(`Tunnel executor interrupted by ${signal}.`);
  }
}

function isTunnelInterruptedError(error: unknown): error is TunnelInterruptedError {
  return error instanceof TunnelInterruptedError;
}

async function raceWithInterruption<T>(
  promise: Promise<T>,
  interruption: { promise: Promise<never> }
) {
  return Promise.race([promise, interruption.promise]);
}

function createUnexpectedTunnelExitError(
  exit: ExitResult,
  startedAt: number
) {
  const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  return new Error(
    `Forge tunnel exited unexpectedly after ${elapsedSeconds}s ` +
      `(code: ${String(exit.code)}, signal: ${String(exit.signal)}). ` +
      `Review the Forge CLI output above for the underlying error.`
  );
}
