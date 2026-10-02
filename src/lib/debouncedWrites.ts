/** Debounce per record, serialize writes and flush before navigation/unmount. */
export function createDebouncedWrites(delay = 1200) {
  const pending = new Map<string, { write: () => Promise<unknown>; timer: ReturnType<typeof setTimeout> }>();
  const running = new Map<string, Promise<unknown>>();
  const cancel = (key: string) => {
    const item = pending.get(key);
    if (item) clearTimeout(item.timer);
    pending.delete(key);
  };
  const flush = (key: string): Promise<unknown> => {
    const item = pending.get(key);
    if (!item) return running.get(key) ?? Promise.resolve();
    cancel(key);
    const operation = (running.get(key) ?? Promise.resolve()).catch(() => undefined).then(item.write);
    running.set(key, operation);
    void operation.finally(() => { if (running.get(key) === operation) running.delete(key); }).catch(() => undefined);
    return operation;
  };
  return {
    schedule(key: string, write: () => Promise<unknown>) {
      cancel(key);
      pending.set(key, { write, timer: setTimeout(() => { void flush(key).catch(() => undefined); }, delay) });
    },
    flush, cancel,
    flushAll: () => Promise.allSettled([...pending.keys()].map(flush)),
    settle: (key: string) => running.get(key) ?? Promise.resolve(),
  };
}
