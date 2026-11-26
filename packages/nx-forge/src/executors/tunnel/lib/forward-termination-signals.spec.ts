import { EventEmitter } from 'node:events';
import { forwardTerminationSignals } from './forward-termination-signals';

describe('forwardTerminationSignals', () => {
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const;
  const listenerCounts = () =>
    signals.map((signal) => process.listenerCount(signal));

  it.each(signals)(
    'should stop the child when the process receives %s',
    (signal) => {
      const child = new EventEmitter();
      const stop = jest.fn();
      forwardTerminationSignals(child, stop);

      process.emit(signal, signal);

      expect(stop).toHaveBeenCalled();
      child.emit('exit', 0, null);
    }
  );

  it('should remove its signal listeners when the child exits', () => {
    const before = listenerCounts();
    const child = new EventEmitter();

    forwardTerminationSignals(child, jest.fn());
    expect(listenerCounts()).toEqual(before.map((count) => count + 1));

    child.emit('exit', 0, null);
    expect(listenerCounts()).toEqual(before);
  });

  it('should remove its signal listeners when the child fails to start', () => {
    const before = listenerCounts();
    const child = new EventEmitter();

    forwardTerminationSignals(child, jest.fn());
    child.emit('error', new Error('spawn forge ENOENT'));

    expect(listenerCounts()).toEqual(before);
  });
});
