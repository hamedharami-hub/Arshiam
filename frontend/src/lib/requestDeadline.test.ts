import { afterEach, expect, it, vi } from "vitest";
import { requestDeadline } from "./requestDeadline";
afterEach(() => vi.useRealTimers());
it("enforces a deadline without AbortSignal static helpers", () => {
  vi.useFakeTimers();
  const deadline = requestDeadline(15000);
  expect(deadline.signal.aborted).toBe(false);
  vi.advanceTimersByTime(15000);
  expect(deadline.signal.aborted).toBe(true);
  deadline.dispose();
  expect(vi.getTimerCount()).toBe(0);
});
it("forwards parent cancellation and cleans up timers", () => {
  vi.useFakeTimers();
  const parent = new AbortController();
  const deadline = requestDeadline(15000, parent.signal);
  parent.abort();
  expect(deadline.signal.aborted).toBe(true);
  deadline.dispose();
  expect(vi.getTimerCount()).toBe(0);
});
it("handles an already cancelled parent", () => {
  const parent = new AbortController();
  parent.abort();
  const deadline = requestDeadline(15000, parent.signal);
  expect(deadline.signal.aborted).toBe(true);
  deadline.dispose();
});
