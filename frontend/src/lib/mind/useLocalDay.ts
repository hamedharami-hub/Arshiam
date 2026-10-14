import { useEffect, useState } from "react";
import { getLocalDateString } from "@/lib/taskDate";

/** Re-evaluate local date on midnight, clock/zone changes and app resumption. */
export function useLocalDay(): string {
  const [day, setDay] = useState(() => getLocalDateString(new Date()));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      setDay(getLocalDateString(new Date()));
      clearTimeout(timer);
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      // Periodic recheck covers a zone/clock change while the app stays visible.
      timer = setTimeout(refresh, Math.min(midnight.getTime() - now.getTime() + 50, 60_000));
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearTimeout(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  return day;
}
