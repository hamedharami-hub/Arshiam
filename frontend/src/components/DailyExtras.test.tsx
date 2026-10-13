import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { setDailyExtrasSettings } from "@/lib/dailyExtrasSettings";
import { DailyExtras } from "./DailyExtras";
vi.mock("./weather/WeatherPanel", () => ({ WeatherPanel: ({ date }: { date?: string }) => <div data-testid="weather-mock">{date || "today"}</div> }));
beforeEach(() => { localStorage.clear(); });
it("mounts no weather or news while disabled", () => {
  render(<DailyExtras isEn />);
  expect(screen.queryByTestId("daily-extras")).toBeNull();
});
it("enables calendar weather independently of Today", () => {
  setDailyExtrasSettings({ calendarWeather: true });
  render(<DailyExtras isEn calendarDate="2026-10-13" />);
  expect(screen.getByTestId("weather-mock")).toHaveTextContent("2026-10-13");
});
