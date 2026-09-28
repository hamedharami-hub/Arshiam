import { describe, expect, it } from "vitest";
import { addDaysIso, dayForDate, forecastToday, hoursForDate, weatherGroup, type WeatherData } from "./weather";

const data: WeatherData = {
  timezone: "Australia/Sydney",
  current: { time: "2026-10-04T08:00", temperature_2m: 18, weather_code: 2, apparent_temperature: 17, wind_speed_10m: 10 },
  hourly: {
    time: ["2026-10-04T00:00", "2026-10-04T01:00", "2026-10-04T03:00", "2026-10-05T00:00"],
    temperature_2m: [12, 11, 10, 14],
    weather_code: [0, 1, 61, 95],
    precipitation_probability: [0, 5, 80, 90],
    wind_speed_10m: [5, 6, 7, 20],
  },
  daily: {
    time: ["2026-10-04", "2026-10-05"],
    weather_code: [61, 95],
    temperature_2m_max: [21, 19],
    temperature_2m_min: [10, 12],
    precipitation_probability_max: [80, 90],
    sunrise: [], sunset: [],
  },
  fetched_at: "2026-10-03T21:00:00Z",
};

describe("weather helpers", () => {
  it("maps WMO codes", () => {
    expect(weatherGroup(0)).toBe("clear");
    expect(weatherGroup(2)).toBe("partly");
    expect(weatherGroup(63)).toBe("rain");
    expect(weatherGroup(81)).toBe("rain");
    expect(weatherGroup(73)).toBe("snow");
    expect(weatherGroup(96)).toBe("storm");
  });
  it("picks hours of a local day — DST day (23 h, 02:00 missing) included", () => {
    expect(hoursForDate(data, "2026-10-04").map((h) => h.time.slice(11))).toEqual(["00:00", "01:00", "03:00"]);
    expect(hoursForDate(data, "2026-10-05")).toHaveLength(1);
  });
  it("today/tomorrow come from the forecast location", () => {
    const today = forecastToday(data);
    expect(today).toBe("2026-10-04");
    expect(dayForDate(data, addDaysIso(today, 1))).toMatchObject({ max: 19, min: 12, code: 95 });
    expect(dayForDate(data, "2026-12-01")).toBeNull();
  });
});
