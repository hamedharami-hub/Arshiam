import { useEffect, useState } from "react";
import { toPersianDigits } from "@/lib/jalali";

export function Countdown({ target, className }: { target: string | Date; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const t = typeof target === "string" ? new Date(target).getTime() : target.getTime();
  const diff = t - now;
  // Once the deadline has passed, don't show a negative running countdown —
  // the date itself + overdue badge already convey it.
  if (diff < 0) return null;

  const abs = diff;
  const d = Math.floor(abs / 86_400_000);
  const h = Math.floor((abs % 86_400_000) / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  const s = Math.floor((abs % 60_000) / 1000);

  const parts: string[] = [];
  if (d > 0) parts.push(`${d} روز`);
  if (d > 0 || h > 0) parts.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  else parts.push(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);

  const text = toPersianDigits(parts.join(" "));
  return (
    <span className={`tabular-nums text-muted-foreground ${className || ""}`}>
      {text}
    </span>
  );
}
