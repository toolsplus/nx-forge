import { EventEmitter } from 'node:events';

const TERMINATION_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const;

type ChildProcessLike = Pick<EventEmitter, 'once' | 'off'>;

/**
 * Stops the child process when this process is asked to stop, until the
 * child exits.
 *
 * @param child The `forge tunnel` process
 * @param stop Stops the child
 */
export const forwardTerminationSignals = (
  child: ChildProcessLike,
  stop: () => void
): void => {
  const removeListeners = () => {
    TERMINATION_SIGNALS.forEach((signal) => process.off(signal, stop));
    child.off('exit', removeListeners);
    child.off('error', removeListeners);
  };

  TERMINATION_SIGNALS.forEach((signal) => process.on(signal, stop));
  child.once('exit', removeListeners);
  child.once('error', removeListeners);
};
