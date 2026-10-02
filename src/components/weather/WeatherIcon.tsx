import { Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning } from "lucide-react";
import { weatherGroup, type WeatherGroup } from "@/lib/weather";

const ICON: Record<WeatherGroup, any> = {
  clear: Sun, partly: CloudSun, cloudy: Cloud, fog: CloudFog, drizzle: CloudDrizzle, rain: CloudRain, snow: CloudSnow, storm: CloudLightning,
};
const TONE: Record<WeatherGroup, string> = {
  clear: "text-amber-500", partly: "text-amber-500", cloudy: "text-slate-500", fog: "text-slate-400",
  drizzle: "text-sky-500", rain: "text-sky-600", snow: "text-cyan-400", storm: "text-violet-500",
};

export function WeatherIcon({ code, className = "w-4 h-4" }: { code: number; className?: string }) {
  const g = weatherGroup(code);
  const Icon = ICON[g];
  return <Icon className={`${className} ${TONE[g]}`} aria-hidden />;
}
