import spawn from 'cross-spawn';

export interface StoppableProcess {
  readonly pid?: number;
  kill(signal: NodeJS.Signals): boolean;
}

/**
 * Stops the `forge tunnel` process and the processes it started.
 *
 * On POSIX systems, SIGTERM lets the Forge CLI deregister the tunnel. Windows has no
 * signals: the process is a `cmd.exe` running the `forge.cmd` shim, and
 * terminating it would leave the Forge CLI running, so terminate the whole tree.
 *
 * @param child The `forge tunnel` process
 * @param platform Platform to stop the process on
 */
export const stopProcessTree = (
  child: StoppableProcess,
  platform: NodeJS.Platform = process.platform
): void => {
  if (platform !== 'win32') {
    child.kill('SIGTERM');
    return;
  }
  if (child.pid !== undefined) {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
    });
  }
};
