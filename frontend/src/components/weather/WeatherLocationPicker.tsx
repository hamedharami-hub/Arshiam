import { useEffect, useRef, useState } from "react";
import { Crosshair, Loader2, MapPin, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { locateByGps, searchCity, setWeatherLocation, type CitySuggestion, type WeatherLocation } from "@/lib/weather";

/** GPS or manual city. GPS is only requested after the user taps the button. */
export function WeatherLocationPicker({ location, isEn, onDone }: { location: WeatherLocation | null; isEn: boolean; onDone?: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CitySuggestion[]>([]);
  const [busy, setBusy] = useState<"gps" | "search" | null>(null);
  const [gpsDenied, setGpsDenied] = useState(false);
  const [err, setErr] = useState<{ message: string; kind: "gps" | "search" } | null>(null);
  const [noResults, setNoResults] = useState(false);
  const operation = useRef(0);
  const busyRef = useRef(false);
  useEffect(() => () => { operation.current++; }, []);

  const requestGps = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    const ticket = ++operation.current;
    setBusy("gps");
    setErr(null);
    setNoResults(false);
    try {
      const { lat, lon } = await locateByGps();
      if (ticket !== operation.current) return;
      if (!setWeatherLocation({ mode: "gps", name: isEn ? "Current location" : "موقعیت فعلی", lat, lon })) {
        setErr({ message: isEn ? "Location could not be saved. Try again." : "موقعیت ذخیره نشد؛ دوباره تلاش کن.", kind: "gps" });
        return;
      }
      setGpsDenied(false);
      onDone?.();
    } catch (e: any) {
      if (ticket !== operation.current) return;
      if (e?.code === 1) setGpsDenied(true);
      else setErr({ message: isEn ? "Could not get your location." : "موقعیت پیدا نشد.", kind: "gps" });
    } finally {
      if (ticket === operation.current) { busyRef.current = false; setBusy(null); }
    }
  };

  const search = async () => {
    if (q.trim().length < 2 || busyRef.current) return;
    busyRef.current = true;
    const ticket = ++operation.current;
    setBusy("search");
    setErr(null);
    setNoResults(false);
    setResults([]);
    try {
      const items = await searchCity(q.trim(), isEn ? "en" : "fa");
      if (ticket !== operation.current) return;
      setResults(items);
      setNoResults(items.length === 0);
    } catch {
      if (ticket !== operation.current) return;
      setErr({ message: isEn ? "City search failed. Check your connection and retry." : "جستجوی شهر ناموفق بود؛ اتصال را بررسی کن و دوباره تلاش کن.", kind: "search" });
    } finally {
      if (ticket === operation.current) { busyRef.current = false; setBusy(null); }
    }
  };

  return (
    <div className="space-y-3" data-testid="weather-location-picker">
      {location && (
        <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" /> {location.name}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        {isEn ? "Use your location for local weather, or pick a city manually." : "برای هواشناسی محلی از موقعیت خودت استفاده کن یا شهر را دستی انتخاب کن."}
      </p>
      <Button variant="outline" className="w-full h-11 gap-2" onClick={requestGps} disabled={busy !== null} data-testid="weather-use-gps">
        {busy === "gps" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
        {isEn ? "Use my location (GPS)" : "استفاده از موقعیت من (GPS)"}
      </Button>
      {gpsDenied && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2 text-[11px] space-y-1.5" data-testid="weather-gps-denied">
          <p>{isEn ? "Location permission is blocked. Enable it in your browser/app settings, or choose a city below." : "دسترسی موقعیت بسته است. آن را از تنظیمات مرورگر/اپ باز کن یا شهر را پایین انتخاب کن."}</p>
          <a href="/app/settings" className="inline-flex items-center gap-1 text-primary font-semibold"><Settings className="w-3 h-3" />{isEn ? "Open settings" : "باز کردن تنظیمات"}</a>
        </div>
      )}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void search(); }}>
        <Input aria-label={isEn ? "City name" : "نام شهر"} value={q} onChange={(e) => {
          setQ(e.target.value); operation.current++; busyRef.current = false;
          setBusy(null); setResults([]); setNoResults(false); setErr(null);
        }} placeholder={isEn ? "City, e.g. Sydney" : "نام شهر، مثلاً Sydney یا تهران"} className="h-11" data-testid="weather-city-input" dir="auto" />
        <Button type="submit" className="h-11 w-11 shrink-0" size="icon" disabled={busy !== null} aria-label={isEn ? "Search" : "جستجو"} data-testid="weather-city-search">
          {busy === "search" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </form>
      {err && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-[11px]" data-testid="weather-location-error">
          <span className="text-destructive">{err.message}</span>
          <button
            type="button"
            className="font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-50"
            disabled={busy !== null}
            onClick={() => (err.kind === "gps" ? void requestGps() : void search())}
            data-testid="weather-location-retry"
          >
            {isEn ? "Try again" : "تلاش دوباره"}
          </button>
        </div>
      )}
      {noResults && !err && (
        <p className="text-[11px] text-muted-foreground" data-testid="weather-no-results">
          {isEn ? "No matching city found. Check the spelling and try again." : "شهری با این نام پیدا نشد. املا را بررسی کن و دوباره تلاش کن."}
        </p>
      )}
      {results.length > 0 && (
        <ul className="space-y-1 max-h-48 overflow-y-auto">
          {results.map((r, i) => (
            <li key={`${r.lat},${r.lon}`}>
              <button
                type="button"
                className="w-full text-start rounded-lg px-3 py-2 hover:bg-muted text-sm min-h-[44px]"
                onClick={() => {
                  if (!setWeatherLocation({ mode: "city", name: r.name, lat: r.lat, lon: r.lon })) {
                    setErr({ message: isEn ? "Location could not be saved. Try again." : "موقعیت ذخیره نشد؛ دوباره تلاش کن.", kind: "search" });
                    return;
                  }
                  setResults([]); onDone?.();
                }}
                data-testid={`weather-city-result-${i}`}
              >
                <span className="font-semibold">{r.name}</span>
                <span className="text-xs text-muted-foreground"> · {[r.admin1, r.country].filter(Boolean).join("، ")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
