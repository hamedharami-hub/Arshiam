import { useEffect, useState } from "react";
import { Award, Check, Droplets, History, Leaf, Plus, RefreshCw, Sparkles, Sun, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import PlantCanvas from "@/components/garden/PlantCanvas";
import PlantPickerModal from "@/components/garden/PlantPickerModal";
import { useBilingual } from "@/hooks/useBilingual";
import { toPersianDigits } from "@/lib/jalali";
import { getCurrentTimeOfDay, getGardenState, PLANT_SPECIES, plantNewSeed, saveGardenState, setTimeOfDayMode, waterActivePlant, type GardenState, type PlantType, type TimeOfDay } from "@/lib/garden";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import "./GardenView.css";

const TIMES: { mode: "auto" | TimeOfDay; fa: string; en: string }[] = [
  { mode: "auto", fa: "خودکار", en: "Auto" },
  { mode: "morning", fa: "صبح", en: "Morning" },
  { mode: "day", fa: "روز", en: "Day" },
  { mode: "sunset", fa: "غروب", en: "Sunset" },
  { mode: "night", fa: "شب", en: "Night" },
];
const STAGES = [["بذر", "Seed"], ["جوانه", "Sprout"], ["رشد", "Growing"], ["غنچه", "Bud"], ["شکوفه", "Bloom"]] as const;

function playWaterSound() {
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(590, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.25);
    gain.gain.setValueAtTime(0.12, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.6);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.6);
    oscillator.onended = () => void context.close();
  } catch { /* Sound is optional. */ }
}

export default function GardenView() {
  const { T, isEn } = useBilingual();
  const [garden, setGarden] = useState<GardenState>(getGardenState);
  const [watering, setWatering] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingSeed, setPendingSeed] = useState<PlantType | null>(null);
  const [tab, setTab] = useState("greenhouse");
  const [waterAmount, setWaterAmount] = useState(15);

  useEffect(() => {
    const onUpdate = (event: Event) => setGarden((event as CustomEvent<GardenState>).detail || getGardenState());
    window.addEventListener("arshnaz-garden-updated", onUpdate);
    return () => window.removeEventListener("arshnaz-garden-updated", onUpdate);
  }, []);

  const plant = garden.activePlant;
  const meta = PLANT_SPECIES[plant?.type || "rose"];
  const progress = plant ? Math.min(100, Math.round(plant.currentPoints / meta.pointsToBloom * 100)) : 0;
  const time = garden.timeOfDayMode === "auto" || !garden.timeOfDayMode ? getCurrentTimeOfDay() : garden.timeOfDayMode;
  const remaining = plant ? Math.max(0, meta.pointsToBloom - plant.currentPoints) : 0;
  const digit = (value: number) => isEn ? value.toString() : toPersianDigits(value);
  const canWater = !!plant && plant.stage < 5 && garden.waterDrops >= waterAmount && !watering;

  const handleWater = () => {
    if (!canWater) return;
    const result = waterActivePlant(waterAmount);
    if (!result.success) return;
    if (garden.soundEnabled) playWaterSound();
    setWatering(true);
    window.setTimeout(() => setWatering(false), 950);
    if (result.bloomed) toast.success(T("گل شما شکوفا شد و به کلکسیون اضافه شد!", "Your plant bloomed and joined the collection!"));
    else if (result.stageUp) toast.success(T("گیاه وارد مرحله تازه‌ای شد!", "Your plant reached a new growth stage!"));
  };

  const handleSeedSelect = (type: PlantType) => {
    if (plant && plant.stage < 5) setPendingSeed(type);
    else plantNewSeed(type);
  };
  const toggleSound = () => saveGardenState({ ...garden, soundEnabled: !garden.soundEnabled });

  return (
    <main className="garden-page" dir={isEn ? "ltr" : "rtl"}>
      <HeaderTitlePortal title={T("گلخانه من", "My Greenhouse")} />
      <header className="garden-header" data-testid="garden-header">
        <div className="garden-header-tools">
          <div className="garden-resource" data-testid="garden-water-drops"><Droplets aria-hidden="true" /><span><strong>{digit(garden.waterDrops)}</strong>{T("قطره آب", "Water drops")}</span></div>
          <div className="garden-resource"><Sun aria-hidden="true" /><span><strong>{digit(garden.sunEnergy)}</strong>{T("انرژی خورشید", "Sun energy")}</span></div>
          <div className="garden-resource"><Sparkles aria-hidden="true" /><span><strong>{digit(garden.focusBlossoms || 0)}</strong>{T("شکوفه تمرکز", "Focus blooms")}</span></div>
          <Button variant="ghost" size="icon" className="garden-sound" data-testid="garden-sound-toggle" onClick={toggleSound} aria-label={garden.soundEnabled ? T("خاموش کردن صدا", "Mute sound") : T("روشن کردن صدا", "Enable sound")}>{garden.soundEnabled ? <Volume2 /> : <VolumeX />}</Button>
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="garden-tabs">
        <TabsList className="garden-tab-list"><TabsTrigger value="greenhouse"><Leaf className="size-4" />{T("گلخانه", "Greenhouse")}</TabsTrigger><TabsTrigger value="collection"><Award className="size-4" />{T("کلکسیون گل‌ها", "Bloom collection")} ({digit(garden.herbarium.length)})</TabsTrigger></TabsList>

        <TabsContent value="greenhouse" className="garden-main-grid">
          <section className="garden-primary">
            <div className={`garden-scene garden-scene-${time}`}>
              <div className="garden-time-picker" aria-label={T("زمان گلخانه", "Greenhouse time")}>{TIMES.map(({ mode, fa, en }) => <button type="button" key={mode} className={garden.timeOfDayMode === mode ? "active" : ""} onClick={() => setTimeOfDayMode(mode)} aria-pressed={garden.timeOfDayMode === mode}>{isEn ? en : fa}</button>)}</div>
              {plant ? <PlantCanvas plant={plant} size="lg" sceneOnly isWatering={watering} timeOfDay={time} /> : <div className="garden-empty-scene"><span>🌱</span><strong>{T("گلدان آماده کاشت است", "The pot is ready for planting")}</strong></div>}
              {watering && <span className="garden-water-animation" aria-hidden="true">💧 💧 💧</span>}
              <Button className="garden-scene-switch" onClick={() => setPickerOpen(true)}><RefreshCw className="size-4" />{plant ? T("تعویض بذر", "Change seed") : T("کاشت بذر", "Plant a seed")}</Button>
            </div>
            <div className="garden-growth-panel"><div className="garden-growth-heading"><h2>{T("مسیر رشد", "Growth journey")}</h2><span>{plant ? `${digit(plant.currentPoints)} / ${digit(meta.pointsToBloom)}` : "—"} {T("امتیاز", "points")}</span></div><Progress value={progress} className="h-2.5" aria-label={T("پیشرفت رشد گیاه", "Plant growth progress")} /><ol className="garden-stages">{STAGES.map(([fa, en], index) => <li key={fa} className={plant && index + 1 <= plant.stage ? "reached" : ""}><span>{plant && index + 1 < plant.stage ? <Check className="size-3.5" /> : index + 1}</span>{isEn ? en : fa}</li>)}</ol></div>
            <div className="garden-water-panel"><div><h2>{T("آبیاری گل", "Water your plant")}</h2><p>{plant?.stage === 5 ? T("این گل شکوفا شده است؛ برای ادامه بذر تازه بکارید.", "This plant has bloomed. Plant a new seed to continue.") : T(`تا شکوفایی ${digit(remaining)} امتیاز باقی مانده است.`, `${remaining} points remain until bloom.`)}</p></div><div className="garden-water-actions"><div className="garden-water-options" aria-label={T("مقدار آبیاری", "Watering amount")}>{[5, 15, 30].map(amount => <button type="button" key={amount} aria-pressed={waterAmount === amount} className={waterAmount === amount ? "selected" : ""} onClick={() => setWaterAmount(amount)}>{digit(amount)} <Droplets className="size-3.5" /></button>)}</div>{plant?.stage === 5 ? <Button onClick={() => setPickerOpen(true)}><Plus className="size-4" />{T("کاشت گل تازه", "Plant another flower")}</Button> : <Button className="garden-water-button" disabled={!canWater} onClick={handleWater} data-testid="garden-water-button"><Droplets className="size-4" />{T("آبیاری", "Water plant")}</Button>}</div></div>
            {plant && garden.waterDrops < waterAmount && plant.stage < 5 && <p className="garden-water-hint">{T("قطره کافی ندارید؛ کارهای روزانه را کامل کنید یا مقدار آبیاری را کمتر کنید.", "Not enough drops. Complete daily activities or choose a smaller amount.")}</p>}
          </section>
          <aside className="garden-sidebar">
            <section className="garden-info-panel"><div className="garden-plant-title"><span className="garden-plant-icon" style={{ background: meta.glowColor }}>{plant ? meta.badge : "🌱"}</span><div><h2>{plant ? (isEn ? meta.name_en : plant.name) : T("گل خود را انتخاب کنید", "Choose your flower")}</h2><p dir="ltr">{plant ? meta.latinName : ""}</p></div></div><p>{plant ? (isEn ? meta.description_en : meta.description) : T("از میان شش گیاه، بذر دلخواه خود را بکارید.", "Choose a seed from six plants to begin.")}</p>{plant && <div className="garden-affinity"><Sparkles className="size-4" />{isEn ? meta.affinity_en : meta.affinity}</div>}</section>
            <section className="garden-info-panel"><h2><History className="size-4" />{T("تاریخچه مراقبت", "Care history")}</h2>{plant?.contributions.length ? <ol className="garden-history">{plant.contributions.slice(0, 5).map((item, index) => <li key={`${item.date}-${index}`}><span className="garden-history-dot" /><div><strong>{item.reason}</strong><small>{new Date(item.date).toLocaleDateString(isEn ? "en-AU" : "fa-IR")} · {digit(item.points)} {T("امتیاز", "pts")}</small></div></li>)}</ol> : <p>{T("با کاشت بذر، داستان مراقبت شروع می‌شود.", "Your care story begins when you plant a seed.")}</p>}</section>
            <section className="garden-info-panel"><h2><Droplets className="size-4" />{T("قطره آب از کجا می‌آید؟", "How to earn water")}</h2><ul className="garden-rewards"><li><span>{T("تکمیل تسک", "Complete a task")}</span><b>+10 💧</b></li><li><span>{T("انجام عادت", "Complete a habit")}</span><b>+15 💧</b></li><li><span>{T("چک‌این روزانه", "Daily check-in")}</span><b>+20 💧</b></li><li><span>{T("جلسه تمرکز", "Focus session")}</span><b>{T("بسته به زمان", "Based on duration")}</b></li></ul></section>
          </aside>
        </TabsContent>

        <TabsContent value="collection" className="garden-collection"><div className="garden-collection-heading"><div><h2>{T("گل‌های شکوفاشده", "Your blooms")}</h2><p>{T("ردپای قدم‌های خوب شما در باغ", "A record of the good steps you have taken")}</p></div><span>{digit(garden.totalHarvests)} {T("شکوفایی", "blooms")}</span></div>{garden.herbarium.length ? <div className="garden-collection-grid">{garden.herbarium.map(item => { const species = PLANT_SPECIES[item.type] || PLANT_SPECIES.rose; return <article className="garden-bloom" key={item.id}><span className="garden-bloom-icon" style={{ background: species.glowColor }}>{species.badge}</span><div><h3>{isEn ? species.name_en : item.name}</h3><p>{species.latinName}</p><small>{T("شکوفایی:", "Bloomed:")} {new Date(item.bloomedAt).toLocaleDateString(isEn ? "en-AU" : "fa-IR")}</small></div><Award className="size-5" /></article>; })}</div> : <div className="garden-collection-empty"><Award className="size-10" /><h3>{T("هنوز گلی شکوفا نشده است", "No blooms yet")}</h3><p>{T("با مراقبت از گیاه فعلی، اولین گل این مجموعه را بسازید.", "Care for your current plant to grow your first bloom.")}</p><Button onClick={() => setTab("greenhouse")}>{T("رفتن به گلخانه", "Go to greenhouse")}</Button></div>}</TabsContent>
      </Tabs>
      <PlantPickerModal open={pickerOpen} onOpenChange={setPickerOpen} onSelect={handleSeedSelect} currentType={plant?.type} />
      <AlertDialog open={pendingSeed !== null} onOpenChange={open => { if (!open) setPendingSeed(null); }}><AlertDialogContent dir={isEn ? "ltr" : "rtl"}><AlertDialogHeader><AlertDialogTitle>{T("تعویض بذر فعلی؟", "Replace the current seed?")}</AlertDialogTitle><AlertDialogDescription>{T("رشد گل فعلی ذخیره نمی‌شود. گل‌های شکوفاشده در کلکسیون می‌مانند.", "The current plant's progress will be lost. Completed blooms stay in your collection.")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{T("انصراف", "Cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => { if (pendingSeed) plantNewSeed(pendingSeed); setPendingSeed(null); }}>{T("تعویض بذر", "Replace seed")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </main>
  );
}
