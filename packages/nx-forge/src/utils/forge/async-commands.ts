import { spawn } from 'child_process';
import { getPackageManagerCommand } from '@nx/devkit';

/**
 * Runs the given Forge CLI command asynchronously.
 *
 * @param args List of string arguments passed to the forge command, e.g. ['lint'], ['version'], or ['deploy', '--verbose']
 * @param opts Execution options
 */
export const runForgeCommandAsync = (
  args: string[],
  opts: { env?: NodeJS.ProcessEnv; cwd?: string } = {}
): Promise<void> => {
  const pmc = getPackageManagerCommand();
  const cliProcess = spawn(pmc.exec, ['forge', ...args], {
    cwd: opts.cwd,
    env: { ...process.env, ...opts.env },
    stdio: [process.stdin, process.stdout, process.stderr],
    shell: true,
  });
  return new Promise((resolve, reject) => {
    cliProcess.once('exit', (code: number) => {
      if (code === 0) {
        resolve(undefined);
      } else {
        reject(new Error('Exit with error code: ' + code));
      }
    });
    cliProcess.once('error', (err: Error) => {
      reject(err);
    });
  });
};
