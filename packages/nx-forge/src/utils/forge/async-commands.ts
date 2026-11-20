import { delimiter, join } from 'path';
import { workspaceRoot } from '@nx/devkit';

// Node cannot directly launch `.cmd` shims on Windows. cross-spawn resolves
// those shims while preserving each Forge argument.
import spawn from 'cross-spawn';

/**
 * Puts the workspace's `node_modules/.bin` first on the PATH, like
 * `nx:run-commands`, so that a Forge CLI installed in the workspace wins over
 * a global one.
 */
const withWorkspaceBin = (env: NodeJS.ProcessEnv): NodeJS.ProcessEnv => {
  const pathKey =
    Object.keys(env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
  const workspaceBin = join(workspaceRoot, 'node_modules', '.bin');
  return {
    ...env,
    [pathKey]: [workspaceBin, env[pathKey]].filter(Boolean).join(delimiter),
  };
};

/**
 * Starts the Forge CLI of the workspace, or the one on the PATH.
 *
 * It does not go through the package manager: Yarn Classic would run the
 * command in the workspace root instead of `cwd`, because the artifact
 * directory has no `package.json`. Without a wrapper, signals also reach
 * Forge directly.
 *
 * @param args List of string arguments passed to the forge command
 * @param opts Execution options
 */
export const spawnForgeCommand = (
  args: string[],
  opts: { env?: NodeJS.ProcessEnv; cwd?: string } = {}
) =>
  spawn('forge', args, {
    cwd: opts.cwd,
    env: withWorkspaceBin({ ...process.env, ...opts.env }),
    stdio: [process.stdin, process.stdout, process.stderr],
  });

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
  const cliProcess = spawnForgeCommand(args, opts);
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
