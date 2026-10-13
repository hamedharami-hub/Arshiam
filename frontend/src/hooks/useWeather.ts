import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWeather, getWeatherLocation, WEATHER_EVENT, type WeatherData } from "@/lib/weather";

export function useWeather() {
  const [location, setLocation] = useState(getWeatherLocation);
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    const ticket = ++generation.current;
    const controller = new AbortController();
    setData(null);
    setError(false);
    setLoading(Boolean(location));
    if (location) {
      void fetchWeather(location, controller.signal).then(result => {
        if (ticket === generation.current) setData(result);
      }).catch(() => {
        if (ticket === generation.current && !controller.signal.aborted) setError(true);
      }).finally(() => {
        if (ticket === generation.current) setLoading(false);
      });
    }
    const interval = window.setInterval(refresh, 30 * 60 * 1000);
    return () => { generation.current++; controller.abort(); window.clearInterval(interval); };
  }, [location, revision, refresh]);
  useEffect(() => {
    const update = () => setLocation(getWeatherLocation());
    window.addEventListener(WEATHER_EVENT, update);
    window.addEventListener("storage", update);
    return () => { window.removeEventListener(WEATHER_EVENT, update); window.removeEventListener("storage", update); };
  }, []);
  return { location, data, loading, error, refresh };
}
