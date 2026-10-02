import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, MessageCircle, Shuffle, UserRound, Camera, Download, Gift, PartyPopper, Share2, Moon, Sunrise, Sun, Sunset, Coins, Hammer, History, Info, Lock, MousePointerClick, Sparkles, Trash2, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { BuildingPreview, IslandScene } from "@/components/island/IslandScene";
import { ZoomPan } from "@/components/island/ZoomPan";
import { IslandAlbum } from "@/components/island/IslandAlbum";
import type { ResidentTalk } from "@/components/island/IslandScene";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { addToAlbum } from "@/lib/islandAlbum";
import { captureIsland, downloadBlob, makeThumb, shareBlob } from "@/lib/islandSnapshot";
import "@/components/island/island.css";
import { useBilingual } from "@/hooks/useBilingual";
import { toPersianDigits } from "@/lib/jalali";
import {
  BUILDINGS, GIFTS, ISLAND_CHEER_EVENT, ISLAND_EVENT, MATERIALS, claimWeeklyGift, consumeCheers, getDayPhase, getWeekProgress, refreshIslandWeek, getResidentLine, getResidentName, setResidentName, setShowIslandOnToday, type DayPhase, type GiftType, canBuild, getBuildingSpec, getIslandLevel, getIslandState, getNextMaterial,
  isMaterialUnlocked, moveBuilding, placeBuilding, removeBuilding, type BuildingType, type IslandState, type PlacedBuilding,
} from "@/lib/island";

export default function IslandView() {
  const { T, isEn } = useBilingual();
  const [state, setState] = useState<IslandState>(getIslandState);
  const [buildType, setBuildType] = useState<BuildingType | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [cheerKey, setCheerKey] = useState(0);
  const [snapshot, setSnapshot] = useState<{ url: string; blob: Blob } | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [residentIdx, setResidentIdx] = useState<number | null>(null);
  const [talk, setTalk] = useState<ResidentTalk | null>(null);
  const [nameDraft, setNameDraft] = useState("");

  useEffect(() => {
    const onUpdate = (e: Event) => setState((e as CustomEvent<IslandState>).detail || getIslandState());
    window.addEventListener(ISLAND_EVENT, onUpdate);
    return () => window.removeEventListener(ISLAND_EVENT, onUpdate);
  }, []);

  // Residents celebrate tasks finished since the last visit, and live while the island is open.
  useEffect(() => {
    const { autoGift } = refreshIslandWeek();
    if (autoGift) toast.success(T("هدیهٔ هفتهٔ قبل به انبار هدیه‌ها اضافه شد", "Last week's gift was added to your gifts"));
    const celebrate = () => {
      const n = consumeCheers();
      if (!n) return;
      setCheerKey((k) => k + 1);
      toast.success(T(`ساکنان جزیره برای ${toPersianDigits(n)} کار انجام‌شده جشن گرفتند!`, `Your residents are cheering for ${n} finished ${n === 1 ? "task" : "tasks"}!`), { icon: <PartyPopper className="size-4" /> });
    };
    const first = window.setTimeout(celebrate, 900);
    window.addEventListener(ISLAND_CHEER_EVENT, celebrate);
    return () => { window.clearTimeout(first); window.removeEventListener(ISLAND_CHEER_EVENT, celebrate); };
  }, [T]);

  useEffect(() => () => { if (snapshot) URL.revokeObjectURL(snapshot.url); }, [snapshot]);
  useEffect(() => {
    if (snapshot) window.setTimeout(() => document.querySelector('[data-testid="island-snapshot-panel"]')?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }, [snapshot]);

  const week = getWeekProgress(state);
  const giftCount = (type: BuildingType) => state.gifts?.[type as GiftType] || 0;

  const handleClaim = () => {
    const gift = claimWeeklyGift();
    if (!gift) return;
    const spec = getBuildingSpec(gift);
    toast.success(T(`هدیهٔ هفته: «${spec.fa}» به انبار شما اضافه شد!`, `Weekly gift: “${spec.en}” added to your gifts!`), { icon: <Gift className="size-4" /> });
    setSelectedId(null); setMoving(false); setBuildType(gift);
  };

  const handleSnapshot = async () => {
    const svg = document.querySelector<SVGSVGElement>('[data-testid="island-map"]');
    if (!svg) return;
    setCapturing(true);
    try {
      const date = new Date().toLocaleDateString(isEn ? "en-AU" : "fa-IR-u-ca-persian", { year: "numeric", month: "long", day: "numeric" });
      const blob = await captureIsland(svg, {
        title: T("جزیرهٔ من", "My Island"),
        subtitle: T(`${date} · سطح ${toPersianDigits(getIslandLevel(state.buildings.length).level)} · ${toPersianDigits(state.buildings.length)} سازه`, `${date} · Level ${getIslandLevel(state.buildings.length).level} · ${state.buildings.length} buildings`),
        phase,
        rtl: !isEn,
      });
      setSnapshot((prev) => { if (prev) URL.revokeObjectURL(prev.url); return { url: URL.createObjectURL(blob), blob }; });
      try {
        await addToAlbum({ image: blob, thumb: await makeThumb(blob), level: getIslandLevel(state.buildings.length).level, buildings: state.buildings.length, phase });
      } catch { /* album is best-effort */ }
    } catch {
      toast.error(T("ساخت تصویر ممکن نشد؛ دوباره تلاش کنید.", "Couldn't create the picture — please try again."));
    } finally {
      setCapturing(false);
    }
  };
  const snapName = () => `arshnaz-island-${new Date().toISOString().slice(0, 10)}.png`;
  const handleShare = async () => {
    if (!snapshot) return;
    const ok = await shareBlob(snapshot.blob, snapName(), T("جزیرهٔ من", "My Island"));
    if (!ok) { downloadBlob(snapshot.blob, snapName()); toast.info(T("اشتراک‌گذاری در این دستگاه پشتیبانی نمی‌شود؛ تصویر دانلود شد.", "Sharing isn't supported here — the picture was downloaded.")); }
  };

  const sayLine = useCallback((i: number, seed: number) => {
    const s = getIslandState();
    setTalk({ index: i, name: getResidentName(s, i, isEn), text: getResidentLine(s, i, isEn, seed), key: Date.now() });
  }, [isEn]);
  useEffect(() => {
    if (!talk) return;
    const t = window.setTimeout(() => setTalk(null), 5000);
    return () => window.clearTimeout(t);
  }, [talk]);
  const onResident = useCallback((i: number) => {
    setSelectedId(null); setMoving(false); setBuildType(null);
    setResidentIdx(i);
    setNameDraft(getIslandState().residentNames?.[i] || "");
    sayLine(i, Math.floor(Math.random() * 5));
  }, [sayLine]);
  const saveName = () => {
    if (residentIdx === null) return;
    setResidentName(residentIdx, nameDraft);
    toast.success(T("نام ساکن ذخیره شد", "Resident name saved"));
    sayLine(residentIdx, 0);
  };

  const digit = useCallback((v: number) => (isEn ? v.toLocaleString("en") : toPersianDigits(v)), [isEn]);
  const name = useCallback((type: BuildingType) => { const s = getBuildingSpec(type); return isEn ? s.en : s.fa; }, [isEn]);
  const selected = state.buildings.find((b) => b.id === selectedId) || null;
  const level = getIslandLevel(state.buildings.length);
  const levelPct = level.next ? Math.round(((state.buildings.length - level.current) / (level.next - level.current)) * 100) : 100;
  const nextMat = getNextMaterial(state.lifetime);
  const prevUnlock = [...MATERIALS].reverse().find((m) => m.unlockAt <= state.lifetime)?.unlockAt || 0;
  const matPct = nextMat ? Math.round(((state.lifetime - prevUnlock) / (nextMat.unlockAt - prevUnlock)) * 100) : 100;
  const [phase, setPhase] = useState<DayPhase>(() => getDayPhase());
  useEffect(() => {
    const id = window.setInterval(() => setPhase(getDayPhase()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const initialZoom = useMemo(() => (typeof window !== "undefined" && window.innerWidth < 640 ? 1.5 : 1), []);
  const PHASE_META: Record<DayPhase, { icon: React.ReactNode; fa: string; en: string }> = {
    morning: { icon: <Sunrise className="size-4" />, fa: "صبح", en: "Morning" },
    day: { icon: <Sun className="size-4" />, fa: "روز", en: "Day" },
    sunset: { icon: <Sunset className="size-4" />, fa: "غروب", en: "Sunset" },
    night: { icon: <Moon className="size-4" />, fa: "شب", en: "Night" },
  };

  const clearModes = () => { setBuildType(null); setSelectedId(null); setMoving(false); setResidentIdx(null); };

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
    if (occupant) { setBuildType(null); setResidentIdx(null); setSelectedId(occupant.id); return; }
    if (buildType) {
      const res = placeBuilding(buildType, x, y);
      if (res.ok) {
        toast.success(T(`${name(buildType)} ساخته شد!`, `${name(buildType)} built!`));
        if (canBuild(res.state, buildType) !== "ok") setBuildType(null);
      } else if (res.ok === false && res.reason === "points") toast.info(T("امتیاز کافی نیست؛ با انجام کارها امتیاز بیشتری جمع کنید.", "Not enough points yet — complete tasks to earn more."));
      return;
    }
    setSelectedId(null);
  }, [state.buildings, moving, selectedId, buildType, name, T]);

  const onBuilding = useCallback((b: PlacedBuilding) => {
    if (moving) { onTile(b.x, b.y); return; }
    setBuildType(null);
    setResidentIdx(null);
    setSelectedId(b.id);
  }, [moving, onTile]);

  const handleRemove = () => {
    if (!selected) return;
    const spec = getBuildingSpec(selected.type);
    removeBuilding(selected.id);
    if (spec.gift) toast.success(T("هدیه به انبار هدیه‌ها برگشت", "Gift returned to your stock"));
    else toast.success(T(`${digit(spec.cost)} امتیاز کامل به کیف شما برگشت`, `${spec.cost} points fully refunded`));
    clearModes();
  };

  const modeHint = moving
    ? T("زمین خالی مقصد را انتخاب کنید", "Choose an empty tile to move to")
    : buildType
      ? T(`روی یک زمین خالی بزنید تا «${name(buildType)}» ساخته شود`, `Tap an empty tile to build “${name(buildType)}”`)
      : T("سازه‌ای از فهرست انتخاب کنید، یا روی سازه‌ها و ساکنان بزنید", "Pick a building, or tap buildings and residents");

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
        <section className={`island-sea island-sea-${phase} overflow-hidden rounded-3xl border shadow-sm lg:sticky lg:top-4 lg:self-start`} aria-label={T("نقشه جزیره", "Island map")}>
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 p-3">
            <p className="flex items-center gap-2 rounded-full bg-background/80 px-3 py-1.5 text-sm backdrop-blur-md" data-testid="island-mode-hint"><MousePointerClick className="size-4 text-primary" />{modeHint}</p>
            <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" className="rounded-full" onClick={handleSnapshot} disabled={capturing} data-testid="island-snapshot-btn"><Camera className="size-4" />{capturing ? T("در حال ثبت…", "Capturing…") : T("عکس یادگاری", "Snapshot")}</Button>
            <span className="flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 text-sm backdrop-blur-md" data-testid="island-day-phase">{PHASE_META[phase].icon}{isEn ? PHASE_META[phase].en : PHASE_META[phase].fa}</span>
            </div>
            {(buildType || moving || selectedId || residentIdx !== null) && <Button size="sm" variant="secondary" className="rounded-full" onClick={clearModes} data-testid="island-cancel-mode"><X className="size-4" />{T("لغو", "Cancel")}</Button>}
          </div>
          <div className="px-2 pb-4">
            <ZoomPan initialScale={initialZoom} labels={{ zoomIn: T("بزرگ‌نمایی", "Zoom in"), zoomOut: T("کوچک‌نمایی", "Zoom out"), reset: T("اندازهٔ اولیه", "Reset view"), hint: T("برای جابه‌جایی نقشه بکشید", "Drag to move the map") }}>
              <IslandScene buildings={state.buildings} selectedId={selectedId} ghostType={moving && selected ? selected.type : buildType} hover={hover} phase={phase} cheerKey={cheerKey} cheerText={T("آفرین!", "Yay!")} talk={talk} onResident={onResident} labelFor={labelFor} onHover={setHover} onTile={onTile} onBuilding={onBuilding} />
            </ZoomPan>
          </div>
          {snapshot && (
            <div className="island-pop relative z-10 mx-3 mb-3 flex flex-col gap-3 rounded-2xl bg-background/90 p-3 backdrop-blur-md sm:flex-row sm:items-center" data-testid="island-snapshot-panel">
              <img src={snapshot.url} alt={T("عکس یادگاری جزیره", "Island snapshot")} className="w-full rounded-xl border sm:w-48" data-testid="island-snapshot-image" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium">{T("عکس یادگاری در آلبوم ذخیره شد", "Snapshot saved to your album")}</p>
                <p className="text-xs text-muted-foreground">{T("ذخیره کنید یا با دوستانتان به اشتراک بگذارید.", "Save it or share it with friends.")}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => downloadBlob(snapshot.blob, snapName())} data-testid="island-snapshot-download"><Download className="size-4" />{T("ذخیره", "Save")}</Button>
                  <Button size="sm" variant="outline" onClick={handleShare} data-testid="island-snapshot-share"><Share2 className="size-4" />{T("اشتراک‌گذاری", "Share")}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setSnapshot(null)} data-testid="island-snapshot-close"><X className="size-4" />{T("بستن", "Close")}</Button>
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          {residentIdx !== null && (
            <section className="island-pop rounded-2xl border bg-card p-4" data-testid="island-resident-panel">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-semibold"><UserRound className="size-4 text-primary" />{getResidentName(state, residentIdx, isEn)}</h2>
                <Button size="icon" variant="ghost" className="size-9" onClick={() => setResidentIdx(null)} aria-label={T("بستن", "Close")} data-testid="island-resident-close"><X className="size-4" /></Button>
              </div>
              {talk?.index === residentIdx && (
                <p className="mt-2 flex items-start gap-2 rounded-xl bg-primary/10 p-3 text-sm" data-testid="island-resident-line"><MessageCircle className="mt-0.5 size-4 shrink-0 text-primary" />{talk.text}</p>
              )}
              <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); saveName(); }}>
                <Label htmlFor="resident-name" className="text-xs text-muted-foreground">{T("نام این ساکن", "This resident's name")}</Label>
                <div className="flex gap-2">
                  <Input id="resident-name" value={nameDraft} maxLength={20} placeholder={getResidentName({ ...state, residentNames: [] }, residentIdx, isEn)} onChange={(e) => setNameDraft(e.target.value)} data-testid="island-resident-name-input" />
                  <Button type="submit" data-testid="island-resident-name-save">{T("ذخیره", "Save")}</Button>
                </div>
              </form>
              <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => sayLine(residentIdx, Math.floor(Math.random() * 5) + 1)} data-testid="island-resident-another"><Shuffle className="size-4" />{T("یک حرف دیگر بزن", "Say something else")}</Button>
            </section>
          )}
          {selected ? (
            <section className="island-pop rounded-2xl border bg-card p-4" data-testid="island-selected-panel">
              <div className="flex items-start gap-3">
                <BuildingPreview type={selected.type} className="size-20 shrink-0 rounded-xl bg-muted/60" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold">{name(selected.type)}</h2>
                  <p className="text-sm text-muted-foreground">{isEn ? getBuildingSpec(selected.type).descEn : getBuildingSpec(selected.type).descFa}</p>
                  <Badge variant="secondary" className="mt-2">{getBuildingSpec(selected.type).gift ? T("هدیهٔ ویژه", "Special gift") : `${T("ارزش:", "Value:")} ${digit(getBuildingSpec(selected.type).cost)}`}</Badge>
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
                <div data-testid="island-gifts-section">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium"><Gift className="size-3.5 text-primary" />{T("هدیه‌های ویژه", "Special gifts")}</span>
                    <span className="text-xs text-muted-foreground">{T("رایگان", "Free")}</span>
                  </div>
                  {GIFTS.some((g) => giftCount(g.type) > 0 || state.buildings.some((b) => b.type === g.type)) ? (
                    <div className="grid grid-cols-2 gap-2">
                      {GIFTS.filter((g) => giftCount(g.type) > 0 || state.buildings.some((b) => b.type === g.type)).map((g) => {
                        const n = giftCount(g.type);
                        const active = buildType === g.type;
                        return (
                          <button key={g.type} type="button" data-testid={`island-build-${g.type}`} disabled={n === 0} aria-pressed={active}
                            onClick={() => { setSelectedId(null); setMoving(false); setBuildType(active ? null : g.type); }}
                            className={`flex min-h-[44px] items-center gap-2 rounded-xl border p-2 text-start transition-[transform,opacity] duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 ${active ? "border-primary bg-primary/10" : "bg-background"}`}>
                            <BuildingPreview type={g.type} className="size-11 shrink-0" />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">{isEn ? g.en : g.fa}</span>
                              <span className="text-xs text-primary">{n > 0 ? T(`${digit(n)} عدد در انبار`, `${n} in stock`) : T("همه چیده شده", "All placed")}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">{T("با انجام ۵ تسک در هفته، هدیهٔ ویژه‌ای اینجا ظاهر می‌شود.", "Finish 5 tasks in a week and a special gift appears here.")}</p>}
                </div>
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

          <section className="rounded-2xl border bg-card p-4" data-testid="island-weekly-gift">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-semibold"><Gift className="size-4 text-primary" />{T("هدیهٔ هفته", "Weekly gift")}</h2>
              <span className="text-sm tabular-nums text-muted-foreground" data-testid="island-weekly-count">{digit(week.tasks)} / {digit(week.goal)}</span>
            </div>
            <Progress value={(week.tasks / week.goal) * 100} className="mt-3 h-2" aria-label={T("پیشرفت هدیهٔ هفته", "Weekly gift progress")} />
            <p className="mt-2 text-xs text-muted-foreground">
              {week.claimed ? T("هدیهٔ این هفته را گرفته‌اید. هفتهٔ بعد هدیهٔ تازه‌ای منتظر شماست!", "You've claimed this week's gift. A new one awaits next week!")
                : week.ready ? T("آفرین! هدیهٔ ویژهٔ این هفته آماده است.", "Well done! This week's special gift is ready.")
                : T(`با انجام ${digit(week.goal - week.tasks)} تسک دیگر در این هفته، یک تزئین ویژهٔ رایگان بگیرید.`, `Finish ${week.goal - week.tasks} more ${week.goal - week.tasks === 1 ? "task" : "tasks"} this week to get a free special decoration.`)}
            </p>
            {week.ready && <Button className="mt-3 w-full" onClick={handleClaim} data-testid="island-claim-gift"><Gift className="size-4" />{T("دریافت هدیه", "Claim gift")}</Button>}
          </section>

          <section className="rounded-2xl border bg-card p-4" data-testid="island-earn-info">
            <h2 className="mb-3 flex items-center gap-2 font-semibold"><Coins className="size-4 text-primary" />{T("امتیاز از کجا می‌آید؟", "How to earn points")}</h2>
            <ul className="space-y-2 text-sm">
              {[[T("تکمیل تسک", "Complete a task"), "+10"], [T("تکمیل زیرتسک", "Complete a subtask"), "+5"], [T("انجام عادت", "Complete a habit"), "+15"], [T("چک‌این روزانه", "Daily check-in"), "+20"], [T("جلسه تمرکز", "Focus session"), T("بسته به زمان", "By duration")]].map(([label, val]) => (
                <li key={label} className="flex justify-between"><span className="text-muted-foreground">{label}</span><b>{val}</b></li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3">
              <Label htmlFor="island-on-today" className="text-sm">{T("نمایش جزیره در صفحهٔ امروز", "Show island on Today")}</Label>
              <Switch id="island-on-today" checked={state.showOnToday !== false} onCheckedChange={(v) => setShowIslandOnToday(v)} data-testid="island-show-on-today" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{T("بدون جریمه: امتیاز هرگز کم نمی‌شود؛ فقط خودتان آن را برای ساختن خرج می‌کنید.", "No penalties: points never drop — you only spend them to build.")}</p>
          </section>
        </aside>
      </div>

      <IslandAlbum onCapture={handleSnapshot} capturing={capturing} />
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
