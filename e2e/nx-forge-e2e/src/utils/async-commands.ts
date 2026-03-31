import { exec } from 'child_process';
import { detectPackageManager, getPackageManagerCommand } from '@nx/devkit';

const getCommandEnv = (env?: NodeJS.ProcessEnv): NodeJS.ProcessEnv => {
  const commandEnv = { ...process.env, ...env };

  // The parent test process in this environment provides NO_COLOR=1.
  // Nx then forces FORCE_COLOR for forked tasks, which produces noisy
  // warnings on stderr unless NO_COLOR is removed for the child command.
  delete commandEnv.NO_COLOR;

  return commandEnv;
};

/**
 * Runs the given command asynchronously inside the provided working directory.
 *
 * This is a local re-implementation of the helper from `@nx/plugin/testing`
 * so the e2e suite can control the child process environment.
 *
 * The upstream helper forwards `process.env` as-is, but in this execution
 * environment the parent test process provides `NO_COLOR=1`. Nx then forces
 * `FORCE_COLOR` for forked tasks, which adds warnings to stderr and makes
 * output assertions flaky. Removing `NO_COLOR` here keeps the child command
 * output stable while preserving the original helper behavior otherwise.
 *
 * @see https://github.com/nrwl/nx/blob/e8c31d7ac72a6eeb98d07b61f6ae945a2612d8ac/packages/plugin/src/utils/testing-utils/async-commands.ts#L15
 */
export const runCommandAsync = (
  command: string,
  opts: { cwd: string; silenceError?: boolean; env?: NodeJS.ProcessEnv }
): Promise<{ stdout: string; stderr: string }> => {
  return new Promise((resolve, reject) => {
    exec(
      command,
      {
        cwd: opts.cwd,
        env: getCommandEnv(opts.env),
        windowsHide: true,
      },
      (err, stdout, stderr) => {
        if (!opts.silenceError && err) {
          reject(err);
        }
        resolve({ stdout, stderr });
      }
    );
  });
};

/**
 * Runs an Nx command asynchronously inside the provided working directory.
 *
 * This mirrors `runNxCommandAsync` from `@nx/plugin/testing`, but delegates to
 * the local `runCommandAsync` above so the same NO_COLOR cleanup is applied to
 * Nx child processes used by this e2e suite.
 *
 * @see https://github.com/nrwl/nx/blob/e8c31d7ac72a6eeb98d07b61f6ae945a2612d8ac/packages/plugin/src/utils/testing-utils/async-commands.ts#L36
 */
export const runNxCommandAsync = (
  command: string,
  opts: { cwd: string; silenceError?: boolean; env?: NodeJS.ProcessEnv }
): Promise<{ stdout: string; stderr: string }> => {
  const pmc = getPackageManagerCommand(detectPackageManager(opts.cwd));

  return runCommandAsync(`${pmc.exec} nx ${command}`, {
    ...opts,
  });
};

/**
 * Runs the given Forge CLI command asynchronously inside the provided working directory.
 *
 * Note that this implementation is only meant to be used in testing code. It is using `exec`
 * to run the Forge CLI command. `exec` returns `stdout` and `stderr` as strings which is convenient
 * for validating or processing the console output in tests.
 *
 * @see https://github.com/nrwl/nx/blob/e8c31d7ac72a6eeb98d07b61f6ae945a2612d8ac/packages/plugin/src/utils/testing-utils/async-commands.ts#L40
 *
 * @param command Forge CLI command to execute, e.g. lint, install, register
 * @param opts Execution options
 * @returns Console outputs
 */
export const runForgeCommandAsync = (
  command: string,
  opts: { cwd: string; silenceError?: boolean; env?: NodeJS.ProcessEnv }
): Promise<{ stdout: string; stderr: string }> => {
  const pmc = getPackageManagerCommand();
  return new Promise((resolve, reject) => {
    exec(
      `${pmc.exec} forge ${command}`,
      {
        cwd: opts.cwd,
        env: getCommandEnv(opts.env),
      },
      (err, stdout, stderr) => {
        if (!opts.silenceError && err) {
          console.error('Failed to run Forge command:', err, stdout, stderr);
          reject(err);
        }
        resolve({ stdout, stderr });
      }
    );
  });
};
