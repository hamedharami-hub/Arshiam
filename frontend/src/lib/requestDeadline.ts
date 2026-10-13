/** A request deadline compatible with WebViews lacking AbortSignal.timeout/any. */
export function requestDeadline(milliseconds: number, parent?: AbortSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (parent?.aborted) abort();
  else parent?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, milliseconds);
  return {
    signal: controller.signal,
    dispose: () => { clearTimeout(timer); parent?.removeEventListener("abort", abort); },
  };
}
