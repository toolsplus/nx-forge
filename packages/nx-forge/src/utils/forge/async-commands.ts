import { ChildProcessByStdio, spawn } from 'node:child_process';
import { Readable } from 'node:stream';
import { getPackageManagerCommand } from '@nx/devkit';

/**
 * Options for running a Forge CLI command.
 */
export type RunForgeCommandAsyncOptions = {
  /**
   * Additional environment variables for the spawned Forge process.
   */
  env?: NodeJS.ProcessEnv;

  /**
   * Working directory used for the Forge command.
   */
  cwd?: string;
};

/**
 * Runs the given Forge CLI command asynchronously.
 *
 * The spawned process inherits stdin so Forge can still prompt interactively,
 * but stdout and stderr are piped through the parent process instead of being
 * inherited directly. This avoids terminal-state corruption issues that can
 * happen when Forge output interleaves with other long-running Nx task output.
 *
 * @param args List of string arguments passed to the forge command, e.g. ['lint'], ['version'], or ['deploy', '--verbose']
 * @param opts Execution options
 */
export const runForgeCommandAsync = (
  args: string[],
  opts: RunForgeCommandAsyncOptions = {}
): Promise<void> => {
  const cliProcess = spawn(buildForgeCommand(args), {
    cwd: opts.cwd,
    env: { ...process.env, ...opts.env },
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true,
  });
  pipeChildOutput(cliProcess);
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

/**
 * Builds the shell command used to invoke the workspace-local Forge CLI.
 *
 * Running Forge through the package manager keeps command resolution
 * consistent across executors, including when the working directory is a
 * nested output directory such as a packaged Forge app.
 *
 * @param args Forge CLI arguments
 * @returns Shell command for spawning Forge
 */
function buildForgeCommand(args: string[]): string {
  const forgeCmd = ['forge', ...args].join(' ');

  const pmc = getPackageManagerCommand();
  return `${pmc.exec} ${forgeCmd}`;
}

/**
 * Pipes child process output to the parent process and removes those pipes when
 * the child exits or errors.
 *
 * Using piped stdout/stderr avoids leaving the terminal in an inconsistent
 * state while still preserving interactive stdin for Forge prompts.
 *
 * @param cliProcess Spawned Forge child process
 */
function pipeChildOutput(
  cliProcess: ChildProcessByStdio<null, Readable, Readable>
): void {
  cliProcess.stdout.pipe(process.stdout);
  cliProcess.stderr.pipe(process.stderr);

  const cleanup = () => {
    cliProcess.stdout.unpipe(process.stdout);
    cliProcess.stderr.unpipe(process.stderr);
  };

  cliProcess.once('exit', cleanup);
  cliProcess.once('error', cleanup);
}
