import { EventEmitter } from 'node:events';
import { forwardTerminationSignals } from './forward-termination-signals';
import { stopProcessTree } from './stop-process-tree';

jest.mock('./stop-process-tree', () => ({ stopProcessTree: jest.fn() }));

const stopProcessTreeMock = jest.mocked(stopProcessTree);

const createChildProcess = () =>
  Object.assign(new EventEmitter(), {
    kill: jest.fn().mockReturnValue(true),
  });

describe('forwardTerminationSignals', () => {
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const;
  const listenerCounts = () =>
    signals.map((signal) => process.listenerCount(signal));

  it.each(signals)(
    'should stop the child when the process receives %s',
    (signal) => {
      stopProcessTreeMock.mockClear();
      const child = createChildProcess();
      forwardTerminationSignals(child);

      process.emit(signal, signal);

      expect(stopProcessTreeMock).toHaveBeenCalledWith(child);
      child.emit('exit', 0, null);
    }
  );

  it('should remove its signal listeners when the child exits', () => {
    const before = listenerCounts();
    const child = createChildProcess();

    forwardTerminationSignals(child);
    expect(listenerCounts()).toEqual(before.map((count) => count + 1));

    child.emit('exit', 0, null);
    expect(listenerCounts()).toEqual(before);
  });

  it('should remove its signal listeners when the child fails to start', () => {
    const before = listenerCounts();
    const child = createChildProcess();

    forwardTerminationSignals(child);
    child.emit('error', new Error('spawn forge ENOENT'));

    expect(listenerCounts()).toEqual(before);
  });
});
