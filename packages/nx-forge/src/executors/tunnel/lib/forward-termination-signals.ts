import { EventEmitter } from 'node:events';
import { StoppableProcess, stopProcessTree } from './stop-process-tree';

const TERMINATION_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const;

type ChildProcessLike = Pick<EventEmitter, 'once' | 'off'> & StoppableProcess;

/**
 * Stops the child process (with SIGTERM on POSIX systems) when this process
 * is asked to stop, until the child exits.
 *
 * `forge tunnel` deregisters the tunnel on SIGTERM. It only handles SIGINT
 * when its input is a terminal, so a SIGINT from a process that is not
 * attached to one would leave the tunnel registered.
 *
 * @param child The `forge tunnel` process
 */
export const forwardTerminationSignals = (child: ChildProcessLike): void => {
  const stopChild = () => stopProcessTree(child);
  const removeListeners = () => {
    TERMINATION_SIGNALS.forEach((signal) => process.off(signal, stopChild));
    child.off('exit', removeListeners);
    child.off('error', removeListeners);
  };

  TERMINATION_SIGNALS.forEach((signal) => process.on(signal, stopChild));
  child.once('exit', removeListeners);
  child.once('error', removeListeners);
};
