import { useState } from "react";
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
  const [err, setErr] = useState<string | null>(null);

  const useGps = async () => {
    setBusy("gps");
    setErr(null);
    try {
      const { lat, lon } = await locateByGps();
      setWeatherLocation({ mode: "gps", name: isEn ? "Current location" : "موقعیت فعلی", lat, lon });
      setGpsDenied(false);
      onDone?.();
    } catch (e: any) {
      if (e?.code === 1) setGpsDenied(true);
      else setErr(isEn ? "Could not get your location." : "موقعیت پیدا نشد.");
    } finally {
      setBusy(null);
    }
  };

  const search = async () => {
    if (q.trim().length < 2) return;
    setBusy("search");
    setErr(null);
    try {
      setResults(await searchCity(q.trim(), isEn ? "en" : "fa"));
    } catch {
      setErr(isEn ? "City search is unavailable offline." : "جستجوی شهر آفلاین در دسترس نیست.");
    } finally {
      setBusy(null);
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
      <Button variant="outline" className="w-full h-11 gap-2" onClick={useGps} disabled={busy !== null} data-testid="weather-use-gps">
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
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={isEn ? "City, e.g. Sydney" : "نام شهر، مثلاً Sydney یا تهران"} className="h-11" data-testid="weather-city-input" dir="auto" />
        <Button type="submit" className="h-11 w-11 shrink-0" size="icon" disabled={busy !== null} aria-label={isEn ? "Search" : "جستجو"} data-testid="weather-city-search">
          {busy === "search" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </form>
      {err && <p className="text-[11px] text-destructive">{err}</p>}
      {results.length > 0 && (
        <ul className="space-y-1 max-h-48 overflow-y-auto">
          {results.map((r, i) => (
            <li key={`${r.lat},${r.lon}`}>
              <button
                type="button"
                className="w-full text-start rounded-lg px-3 py-2 hover:bg-muted text-sm min-h-[44px]"
                onClick={() => { setWeatherLocation({ mode: "city", name: r.name, lat: r.lat, lon: r.lon }); setResults([]); onDone?.(); }}
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
