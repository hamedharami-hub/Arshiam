import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { useWeather } from "./useWeather";
import { WEATHER_EVENT } from "@/lib/weather";

const mocks = vi.hoisted(() => ({
  location: { mode: "city", name: "First city", lat: 10, lon: 20 } as { mode: string; name: string; lat: number; lon: number } | null,
  fetch: vi.fn(),
}));
vi.mock("@/lib/weather", () => ({ WEATHER_EVENT: "test:weather", getWeatherLocation: () => mocks.location, fetchWeather: mocks.fetch }));
beforeEach(() => {
  mocks.location = { mode: "city", name: "First city", lat: 10, lon: 20 };
  mocks.fetch.mockReset();
});
it("does not request weather without a selected location", () => {
  mocks.location = null;
  const { result } = renderHook(useWeather);
  expect(mocks.fetch).not.toHaveBeenCalled();
  expect(result.current).toMatchObject({ location: null, data: null, loading: false });
});
it("aborts the old location and ignores its late response", async () => {
  let first!: (data: unknown) => void;
  mocks.fetch.mockImplementationOnce(() => new Promise(resolve => { first = resolve; })).mockResolvedValueOnce({ timezone: "Second city" });
  const { result } = renderHook(useWeather);
  const oldSignal = mocks.fetch.mock.calls[0][1] as AbortSignal;
  act(() => {
    mocks.location = { mode: "city", name: "Second city", lat: 30, lon: 40 };
    window.dispatchEvent(new Event(WEATHER_EVENT));
  });
  await waitFor(() => expect(result.current.data).toEqual({ timezone: "Second city" }));
  expect(oldSignal.aborted).toBe(true);
  await act(async () => first({ timezone: "First city" }));
  expect(result.current.data).toEqual({ timezone: "Second city" });
  expect(result.current.loading).toBe(false);
});
it("cancels outstanding weather requests when the panel unmounts", () => {
  mocks.fetch.mockImplementation(() => new Promise(() => {}));
  const { unmount } = renderHook(useWeather);
  const signal = mocks.fetch.mock.calls[0][1] as AbortSignal;
  unmount();
  expect(signal.aborted).toBe(true);
});
