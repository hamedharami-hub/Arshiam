import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Coins, Hammer, History, Info, Lock, MousePointerClick, Sparkles, Trash2, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { BuildingPreview, IslandScene } from "@/components/island/IslandScene";
import "@/components/island/island.css";
import { useBilingual } from "@/hooks/useBilingual";
import { toPersianDigits } from "@/lib/jalali";
import {
  BUILDINGS, ISLAND_EVENT, MATERIALS, canBuild, getBuildingSpec, getIslandLevel, getIslandState, getNextMaterial,
  isMaterialUnlocked, moveBuilding, placeBuilding, removeBuilding, type BuildingType, type IslandState, type PlacedBuilding,
} from "@/lib/island";

export default function IslandView() {
  const { T, isEn } = useBilingual();
  const [state, setState] = useState<IslandState>(getIslandState);
  const [buildType, setBuildType] = useState<BuildingType | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onUpdate = (e: Event) => setState((e as CustomEvent<IslandState>).detail || getIslandState());
    window.addEventListener(ISLAND_EVENT, onUpdate);
    return () => window.removeEventListener(ISLAND_EVENT, onUpdate);
  }, []);

  const digit = useCallback((v: number) => (isEn ? v.toLocaleString("en") : toPersianDigits(v)), [isEn]);
  const name = useCallback((type: BuildingType) => { const s = getBuildingSpec(type); return isEn ? s.en : s.fa; }, [isEn]);
  const selected = state.buildings.find((b) => b.id === selectedId) || null;
  const level = getIslandLevel(state.buildings.length);
  const levelPct = level.next ? Math.round(((state.buildings.length - level.current) / (level.next - level.current)) * 100) : 100;
  const nextMat = getNextMaterial(state.lifetime);
  const prevUnlock = [...MATERIALS].reverse().find((m) => m.unlockAt <= state.lifetime)?.unlockAt || 0;
  const matPct = nextMat ? Math.round(((state.lifetime - prevUnlock) / (nextMat.unlockAt - prevUnlock)) * 100) : 100;
  const isNight = useMemo(() => { const h = new Date().getHours(); return h >= 20 || h < 6; }, []);

  const clearModes = () => { setBuildType(null); setSelectedId(null); setMoving(false); };

  const labelFor = useCallback((x: number, y: number, b?: PlacedBuilding) =>
    b ? `${name(b.type)} (${digit(x + 1)}, ${digit(y + 1)})` : T(`زمین خالی ${digit(x + 1)}، ${digit(y + 1)}`, `Empty tile ${x + 1}, ${y + 1}`), [name, digit, T]);

  const onTile = useCallback((x: number, y: number) => {
    const occupant = state.buildings.find((b) => b.x === x && b.y === y);
    if (moving && selectedId) {
      if (occupant && occupant.id !== selectedId) { toast.info(T("این زمین پر است؛ زمین خالی دیگری انتخاب کنید.", "That tile is taken — pick an empty one.")); return; }
      moveBuilding(selectedId, x, y);
      setMoving(false);
      toast.success(T("سازه جابه‌جا شد", "Moved"));
      return;
    }
    if (occupant) { setBuildType(null); setSelectedId(occupant.id); return; }
    if (buildType) {
      const res = placeBuilding(buildType, x, y);
      if (res.ok) {
        toast.success(T(`${name(buildType)} ساخته شد!`, `${name(buildType)} built!`));
        if (res.state.points < getBuildingSpec(buildType).cost) setBuildType(null);
      } else if (res.reason === "points") toast.info(T("امتیاز کافی نیست؛ با انجام کارها امتیاز بیشتری جمع کنید.", "Not enough points yet — complete tasks to earn more."));
      return;
    }
    setSelectedId(null);
  }, [state.buildings, moving, selectedId, buildType, name, T]);

  const onBuilding = useCallback((b: PlacedBuilding) => {
    if (moving) { onTile(b.x, b.y); return; }
    setBuildType(null);
    setSelectedId(b.id);
  }, [moving, onTile]);

  const handleRemove = () => {
    if (!selected) return;
    const cost = getBuildingSpec(selected.type).cost;
    removeBuilding(selected.id);
    toast.success(T(`${digit(cost)} امتیاز کامل به کیف شما برگشت`, `${cost} points fully refunded`));
    clearModes();
  };

  const modeHint = moving
    ? T("زمین خالی مقصد را انتخاب کنید", "Choose an empty tile to move to")
    : buildType
      ? T(`روی یک زمین خالی بزنید تا «${name(buildType)}» ساخته شود`, `Tap an empty tile to build “${name(buildType)}”`)
      : T("یک سازه از فهرست انتخاب کنید یا روی سازه‌ها بزنید", "Pick a building from the list or tap a building");

  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 p-4 pb-28 md:p-6" dir={isEn ? "ltr" : "rtl"} data-testid="island-page">
      <HeaderTitlePortal title={T("جزیرهٔ من", "My Island")} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label={T("وضعیت جزیره", "Island status")}>
        <Stat icon={<Coins className="size-5" />} label={T("امتیاز قابل خرج", "Points to spend")} value={digit(state.points)} testId="island-points" />
        <Stat icon={<Sparkles className="size-5" />} label={T("کل امتیاز کسب‌شده", "Lifetime points")} value={digit(state.lifetime)} testId="island-lifetime" />
        <div className="rounded-2xl border bg-card p-4" data-testid="island-level">
          <div className="flex items-center justify-between text-sm text-muted-foreground"><span className="flex items-center gap-2"><Trophy className="size-4 text-primary" />{T("سطح جزیره", "Island level")}</span><strong className="text-lg text-foreground">{digit(level.level)}</strong></div>
          <Progress value={levelPct} className="mt-3 h-2" aria-label={T("پیشرفت سطح", "Level progress")} />
          <p className="mt-2 text-xs text-muted-foreground">{level.next ? T(`${digit(level.next - state.buildings.length)} سازه تا سطح بعد`, `${level.next - state.buildings.length} buildings to next level`) : T("بالاترین سطح!", "Max level!")}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4" data-testid="island-next-material">
          <div className="flex items-center justify-between text-sm text-muted-foreground"><span className="flex items-center gap-2"><Hammer className="size-4 text-primary" />{T("مصالح بعدی", "Next material")}</span><strong className="text-foreground">{nextMat ? (isEn ? nextMat.en : nextMat.fa) : T("همه باز شد", "All unlocked")}</strong></div>
          <Progress value={matPct} className="mt-3 h-2" aria-label={T("پیشرفت مصالح", "Material progress")} />
          <p className="mt-2 text-xs text-muted-foreground">{nextMat ? T(`${digit(nextMat.unlockAt - state.lifetime)} امتیاز دیگر`, `${nextMat.unlockAt - state.lifetime} more points`) : T("همهٔ مصالح در اختیار شماست", "Every material is yours")}</p>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="island-sea rounded-3xl border shadow-sm" aria-label={T("نقشه جزیره", "Island map")}>
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 p-3">
            <p className="flex items-center gap-2 rounded-full bg-background/80 px-3 py-1.5 text-sm backdrop-blur-md" data-testid="island-mode-hint"><MousePointerClick className="size-4 text-primary" />{modeHint}</p>
            {(buildType || moving || selectedId) && <Button size="sm" variant="secondary" className="rounded-full" onClick={clearModes} data-testid="island-cancel-mode"><X className="size-4" />{T("لغو", "Cancel")}</Button>}
          </div>
          <div className="px-2 pb-4">
            <IslandScene buildings={state.buildings} selectedId={selectedId} ghostType={moving && selected ? selected.type : buildType} hover={hover} isNight={isNight} labelFor={labelFor} onHover={setHover} onTile={onTile} onBuilding={onBuilding} />
          </div>
        </section>

        <aside className="space-y-4">
          {selected ? (
            <section className="island-pop rounded-2xl border bg-card p-4" data-testid="island-selected-panel">
              <div className="flex items-start gap-3">
                <BuildingPreview type={selected.type} className="size-20 shrink-0 rounded-xl bg-muted/60" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold">{name(selected.type)}</h2>
                  <p className="text-sm text-muted-foreground">{isEn ? getBuildingSpec(selected.type).descEn : getBuildingSpec(selected.type).descFa}</p>
                  <Badge variant="secondary" className="mt-2">{T("ارزش:", "Value:")} {digit(getBuildingSpec(selected.type).cost)}</Badge>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant={moving ? "default" : "outline"} onClick={() => setMoving((v) => !v)} data-testid="island-move-btn"><ArrowRightLeft className="size-4" />{moving ? T("در حال جابه‌جایی…", "Moving…") : T("جابه‌جایی", "Move")}</Button>
                <Button variant="outline" onClick={handleRemove} data-testid="island-remove-btn"><Trash2 className="size-4" />{T("برداشتن", "Remove")}</Button>
              </div>
              <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" />{T("با برداشتن سازه، تمام امتیازش برمی‌گردد. در جزیره هیچ امتیازی از دست نمی‌رود.", "Removing refunds the full cost. Nothing is ever lost on your island.")}</p>
            </section>
          ) : null}

          <section className="rounded-2xl border bg-card p-4">
            <Tabs defaultValue="build">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="build" data-testid="island-tab-build"><Hammer className="size-4" />{T("ساخت", "Build")}</TabsTrigger>
                <TabsTrigger value="history" data-testid="island-tab-history"><History className="size-4" />{T("تاریخچه", "History")}</TabsTrigger>
              </TabsList>
              <TabsContent value="build" className="mt-3 space-y-4">
                {MATERIALS.map((mat) => {
                  const unlocked = isMaterialUnlocked(mat.id, state.lifetime);
                  const items = BUILDINGS.filter((b) => b.material === mat.id);
                  return (
                    <div key={mat.id} data-testid={`island-material-${mat.id}`}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 font-medium"><span className="size-3 rounded-full" style={{ background: mat.color }} />{isEn ? mat.en : mat.fa}</span>
                        {!unlocked && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="size-3" />{T(`با ${digit(mat.unlockAt)} امتیاز کل`, `at ${mat.unlockAt} lifetime pts`)}</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {items.map((b) => {
                          const status = canBuild(state, b.type);
                          const active = buildType === b.type;
                          return (
                            <button
                              key={b.type}
                              type="button"
                              data-testid={`island-build-${b.type}`}
                              disabled={status === "locked"}
                              aria-pressed={active}
                              onClick={() => { setSelectedId(null); setMoving(false); setBuildType(active ? null : b.type); }}
                              className={`flex min-h-[44px] items-center gap-2 rounded-xl border p-2 text-start transition-[transform,opacity] duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 ${active ? "border-primary bg-primary/10" : "bg-background"}`}
                            >
                              <BuildingPreview type={b.type} className="size-11 shrink-0" />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium">{isEn ? b.en : b.fa}</span>
                                <span className={`flex items-center gap-1 text-xs ${status === "points" ? "text-muted-foreground" : "text-primary"}`}>{status === "locked" ? <Lock className="size-3" /> : <Coins className="size-3" />}{digit(b.cost)}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </TabsContent>
              <TabsContent value="history" className="mt-3">
                {state.log.length ? (
                  <ol className="space-y-2" data-testid="island-history-list">
                    {state.log.slice(0, 12).map((item, i) => (
                      <li key={`${item.date}-${i}`} className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                        <span className="min-w-0 truncate">{item.reason}</span>
                        <Badge variant="secondary">+{digit(item.points)}</Badge>
                      </li>
                    ))}
                  </ol>
                ) : <p className="text-sm text-muted-foreground">{T("هنوز امتیازی ثبت نشده است.", "No points yet.")}</p>}
              </TabsContent>
            </Tabs>
          </section>

          <section className="rounded-2xl border bg-card p-4" data-testid="island-earn-info">
            <h2 className="mb-3 flex items-center gap-2 font-semibold"><Coins className="size-4 text-primary" />{T("امتیاز از کجا می‌آید؟", "How to earn points")}</h2>
            <ul className="space-y-2 text-sm">
              {[[T("تکمیل تسک", "Complete a task"), "+10"], [T("تکمیل زیرتسک", "Complete a subtask"), "+5"], [T("انجام عادت", "Complete a habit"), "+15"], [T("چک‌این روزانه", "Daily check-in"), "+20"], [T("جلسه تمرکز", "Focus session"), T("بسته به زمان", "By duration")]].map(([label, val]) => (
                <li key={label} className="flex justify-between"><span className="text-muted-foreground">{label}</span><b>{val}</b></li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">{T("بدون جریمه: امتیاز هرگز کم نمی‌شود؛ فقط خودتان آن را برای ساختن خرج می‌کنید.", "No penalties: points never drop — you only spend them to build.")}</p>
          </section>
        </aside>
      </div>
    </main>
  );
}

function Stat({ icon, label, value, testId }: { icon: React.ReactNode; label: string; value: string; testId: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-card p-4" data-testid={testId}>
      <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</span>
      <span className="min-w-0"><span className="block text-xs text-muted-foreground">{label}</span><strong className="text-xl">{value}</strong></span>
    </div>
  );
}
