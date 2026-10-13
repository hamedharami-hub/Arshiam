import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { WeatherLocationPicker } from "./WeatherLocationPicker";

const mocks = vi.hoisted(() => ({ gps: vi.fn(), search: vi.fn(), save: vi.fn() }));
vi.mock("@/lib/weather", () => ({ locateByGps: mocks.gps, searchCity: mocks.search, setWeatherLocation: mocks.save }));
beforeEach(() => { mocks.gps.mockReset(); mocks.search.mockReset(); mocks.save.mockReset().mockReturnValue(true); });
it("does not save a GPS result after the user closes the picker", async () => {
  let resolve!: (value: unknown) => void;
  mocks.gps.mockImplementation(() => new Promise(done => { resolve = done; }));
  const onDone = vi.fn();
  const { unmount } = render(<WeatherLocationPicker location={null} isEn onDone={onDone} />);
  fireEvent.click(screen.getByTestId("weather-use-gps"));
  unmount();
  await act(async () => resolve({ lat: 10, lon: 20 }));
  expect(mocks.save).not.toHaveBeenCalled();
  expect(onDone).not.toHaveBeenCalled();
});
it("ignores old-query results and permits the new search", async () => {
  let resolve!: (value: unknown) => void;
  mocks.search.mockImplementationOnce(() => new Promise(done => { resolve = done; })).mockResolvedValueOnce([{ name: "New city", lat: 30, lon: 40 }]);
  render(<WeatherLocationPicker location={null} isEn />);
  const input = screen.getByLabelText("City name");
  fireEvent.change(input, { target: { value: "Old city" } });
  fireEvent.click(screen.getByTestId("weather-city-search"));
  fireEvent.change(input, { target: { value: "New city" } });
  fireEvent.click(screen.getByTestId("weather-city-search"));
  await waitFor(() => expect(screen.getByTestId("weather-city-result-0")).toHaveTextContent("New city"));
  await act(async () => resolve([{ name: "Old city", lat: 10, lon: 20 }]));
  expect(screen.getByTestId("weather-city-result-0")).toHaveTextContent("New city");
  expect(screen.queryByText("Old city")).toBeNull();
});
