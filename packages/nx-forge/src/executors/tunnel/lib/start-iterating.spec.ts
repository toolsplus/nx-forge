import { startIterating } from './start-iterating';

describe('startIterating', () => {
  it('should start a lazy iterable right away and keep all its values', async () => {
    const started = jest.fn();
    async function* build() {
      started();
      yield 1;
      yield 2;
    }

    const iterator = startIterating(build());

    expect(started).toHaveBeenCalled();
    const values: number[] = [];
    for await (const value of iterator) {
      values.push(value);
    }
    expect(values).toEqual([1, 2]);
  });

  it('should return the underlying iterator', async () => {
    const finished = jest.fn();
    async function* build() {
      try {
        yield 1;
        yield 2;
      } finally {
        finished();
      }
    }

    const iterator = startIterating(build());
    await iterator.next();
    await iterator.return?.(undefined);

    expect(finished).toHaveBeenCalled();
  });

  it('should keep a failed start for the consumer without an unhandled rejection', async () => {
    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);
    async function* build(): AsyncGenerator<number> {
      throw new Error('build failed to start');
      yield 0;
    }

    const iterator = startIterating(build());
    await new Promise((resolve) => setImmediate(resolve));

    expect(unhandled).not.toHaveBeenCalled();
    await expect(iterator.next()).rejects.toThrow('build failed to start');
    process.off('unhandledRejection', unhandled);
  });
});
