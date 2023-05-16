import { exec } from 'child_process';
import { getPackageManagerCommand } from '@nx/devkit';
import { tmpProjPath } from '@nx/plugin/testing';

/**
 * Runs the given Forge CLI command asynchronously inside the e2e directory (if cwd is not provided).
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
  opts: { silenceError?: boolean; env?: NodeJS.ProcessEnv; cwd?: string } = {
    silenceError: false,
  }
): Promise<{ stdout: string; stderr: string }> => {
  const pmc = getPackageManagerCommand();
  return new Promise((resolve, reject) => {
    exec(
      `${pmc.exec} forge ${command}`,
      {
        cwd: opts.cwd ?? tmpProjPath(),
        env: { ...process.env, ...opts.env },
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
