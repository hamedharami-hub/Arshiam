import { useEffect, useState } from "react";
import { ChevronLeft, Coins, Gift } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { useBilingual } from "@/hooks/useBilingual";
import { toPersianDigits } from "@/lib/jalali";
import { ISLAND_CHEER_EVENT, ISLAND_EVENT, getDayPhase, getIslandState, getWeekProgress, type DayPhase, type IslandState } from "@/lib/island";
import { IslandScene } from "./IslandScene";
import "./island.css";

const noop = () => undefined;
const noLabel = () => "";

/** Compact live island preview for the Today page. Residents keep walking and cheer on task completion. */
export function IslandMiniCard() {
  const { T, isEn } = useBilingual();
  const [state, setState] = useState<IslandState>(getIslandState);
  const [phase, setPhase] = useState<DayPhase>(() => getDayPhase());
  const [cheerKey, setCheerKey] = useState(0);

  useEffect(() => {
    const onUpdate = () => setState(getIslandState());
    const onCheer = () => setCheerKey((k) => k + 1);
    const timer = window.setInterval(() => setPhase(getDayPhase()), 60_000);
    window.addEventListener(ISLAND_EVENT, onUpdate);
    window.addEventListener(ISLAND_CHEER_EVENT, onCheer);
    return () => { window.clearInterval(timer); window.removeEventListener(ISLAND_EVENT, onUpdate); window.removeEventListener(ISLAND_CHEER_EVENT, onCheer); };
  }, []);

  if (state.showOnToday === false) return null;
  const week = getWeekProgress(state);
  const num = (n: number) => (isEn ? String(n) : toPersianDigits(n));
  const left = week.goal - week.tasks;
  const weekText = week.claimed
    ? T("هدیهٔ این هفته گرفته شد", "Weekly gift claimed")
    : week.ready
      ? T("هدیهٔ هفته آماده است!", "Weekly gift is ready!")
      : T(`${num(left)} تسک تا هدیهٔ هفته`, `${left} ${left === 1 ? "task" : "tasks"} to the weekly gift`);

  return (
    <NavLink
      to="/app/island"
      data-testid="today-island-card"
      aria-label={T("رفتن به جزیرهٔ من", "Open My Island")}
      className="group mb-3 flex items-center gap-3 overflow-hidden rounded-2xl border bg-card p-2 pe-3 transition-[transform,opacity] duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className={`island-sea island-sea-${phase} pointer-events-none h-20 w-28 shrink-0 overflow-hidden rounded-xl sm:w-36`} aria-hidden="true">
        <div className="-mt-2 scale-[1.15]">
          <IslandScene buildings={state.buildings} selectedId={null} ghostType={null} hover={null} phase={phase} cheerKey={cheerKey} cheerText={T("آفرین!", "Yay!")} interactive={false} labelFor={noLabel} onHover={noop} onTile={noop} onBuilding={noop} />
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold">{T("جزیرهٔ من", "My Island")}</p>
          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground" data-testid="today-island-points"><Coins className="size-3.5 text-primary" />{num(state.points)}</span>
        </div>
        <Progress value={(week.tasks / week.goal) * 100} className="h-1.5" aria-label={T("پیشرفت هدیهٔ هفته", "Weekly gift progress")} />
        <p className={`flex items-center gap-1 truncate text-xs ${week.ready ? "font-medium text-primary" : "text-muted-foreground"}`} data-testid="today-island-week"><Gift className="size-3.5 shrink-0" />{weekText} · {num(week.tasks)}/{num(week.goal)}</p>
      </div>
      <ChevronLeft className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:-translate-x-0.5 ltr:rotate-180 ltr:group-hover:translate-x-0.5" />
    </NavLink>
  );
}
