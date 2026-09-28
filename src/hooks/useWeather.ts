import { useCallback, useEffect, useState } from "react";
import { fetchWeather, getWeatherLocation, WEATHER_EVENT, type WeatherData, type WeatherLocation } from "@/lib/weather";

const REFRESH_MS = 30 * 60 * 1000;

export function useWeather() {
  const [location, setLocation] = useState<WeatherLocation | null>(getWeatherLocation);
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (loc: WeatherLocation | null) => {
    if (!loc) return;
    setLoading(true);
    try {
      setData(await fetchWeather(loc));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(location);
    const t = window.setInterval(() => void load(location), REFRESH_MS);
    return () => window.clearInterval(t);
  }, [location, load]);

  useEffect(() => {
    const on = () => setLocation(getWeatherLocation());
    window.addEventListener(WEATHER_EVENT, on);
    return () => window.removeEventListener(WEATHER_EVENT, on);
  }, []);

  return { location, data, loading, error, refresh: () => load(location) };
}
