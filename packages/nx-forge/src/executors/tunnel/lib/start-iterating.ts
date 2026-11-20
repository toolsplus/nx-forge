/**
 * Starts an async iterable right away and returns an iterator over all its
 * values.
 *
 * Nx returns async generator executors, such as the esbuild executor, without
 * starting them. A watch build therefore only starts once something consumes
 * it, which would be too late to wait for its first bundle.
 *
 * @param iterable Output of a started executor
 */
export const startIterating = <T>(
  iterable: AsyncIterable<T>
): AsyncIterableIterator<T> => {
  const iterator = iterable[Symbol.asyncIterator]();
  const first = iterator.next();
  // The consumer handles a rejection once it takes the first value. Until
  // then, do not let Node report it as unhandled.
  first.catch(() => undefined);
  let firstTaken = false;

  return {
    next: () => {
      if (firstTaken) {
        return iterator.next();
      }
      firstTaken = true;
      return first;
    },
    return: (value?: unknown) =>
      iterator.return
        ? iterator.return(value)
        : Promise.resolve({ done: true, value: value as T }),
    [Symbol.asyncIterator]() {
      return this;
    },
  };
};
