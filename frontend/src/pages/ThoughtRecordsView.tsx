import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { DraftConflictNotice } from "@/components/mind/DraftConflictNotice";
import { ConcernNav } from "@/components/mind/ConcernNav";
import { DraftPrivacy } from "@/components/mind/DraftPrivacy";
import { readMindSession } from "@/lib/mind/sessionService";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ABCView from "@/pages/ABCView";
import { getMindDraft, useMindDraft, type MindDraft } from "@/lib/mindDraft";
import { useWorkspaceDraft } from "@/lib/mind/workspaceDraft";
import { useRecoverableExit } from "@/hooks/useRecoverableExit";
import { getOpConfig } from "@/lib/aiSettings";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import {
  Plus,
  X,
  Sparkles,
  Brain,
  BookOpen,
  Loader2,
  ListPlus,
  Check,
  ArrowRight,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import {
  DISTORTION_LABELS,
  DISTORTION_HINTS,
  getDistortionLabel,
  getDistortionHint,
  type Distortion,
} from "@/lib/distortions";
import { createMindAIContext, executeMindAI, type CbtAnalysisOutput } from "@/lib/mindAI";
import { createTaskFromMind } from "@/lib/taskFromMind";
import {
  deleteThoughtRecord,
  subscribeThoughtRecords,
  upsertThoughtRecord,
  type ThoughtRecordItem,
} from "@/lib/firestoreDataService";
import { useBilingual } from "@/hooks/useBilingual";

const EMOTIONS_FA = [
  "اضطراب",
  "خشم",
  "غم",
  "شرم",
  "گناه",
  "ناامیدی",
  "سردرگمی",
  "تنهایی",
];
const EMOTIONS_EN = [
  "Anxiety",
  "Anger",
  "Sadness",
  "Shame",
  "Guilt",
  "Hopelessness",
  "Confusion",
  "Loneliness",
];

export default function ThoughtRecordsView() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const concernId = params.get("session");
  return <ThoughtRecordsWorkspace key={`${user?.id || "guest"}:${concernId || "standalone"}`} concernId={concernId} />;
}

function emptyForm() {
  return {
    situation: "", automatic_thought: "", emotions: [] as string[],
    emotion_intensity_before: null as number | null, emotion_intensity_after: null as number | null,
    evidence_for: [""], evidence_against: [""], alternative_thought: "", takeaway: "", next_step: "",
    distortions: [] as Distortion[],
  };
}

function newThoughtId() { return `thought_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }
const pendingThoughtSaves = new Set<string>();
type ThoughtTaskPreview = { sourceId: string; title: string; privateText: string; includePrivate: boolean; due: number | null };
function aiConfigSignature() {
  const { provider, model, baseUrl } = getOpConfig("distortion_detect");
  return JSON.stringify({ provider, model, baseUrl });
}

function ThoughtRecordsWorkspace({ concernId }: { concernId: string | null }) {
  const { isEn, T } = useBilingual();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [records, setRecords] = useState<ThoughtRecordItem[]>([]);
  const [recordsStatus, setRecordsStatus] = useState<"loading" | "received" | "cached" | "unavailable">("loading");
  const [historyRetry, setHistoryRetry] = useState(0);
  const deleting = useRef<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [initial] = useState(() => {
    const read = user?.id && concernId ? readMindSession(user.id, concernId) : null;
    return { form: { ...emptyForm(), automatic_thought: read?.ok ? read.value?.text || "" : "" }, editing: false, mode: (searchParams.get("mode") === "short" ? "short" : "full") as "full" | "short", recordId: newThoughtId(), revision: 0, legacySeed: null as MindDraft | null, taskPreview: null as ThoughtTaskPreview | null };
  });
  const slot = concernId ? `thoughts:${concernId}` : "thoughts";
  const workspace = useWorkspaceDraft(user?.id, slot, initial);
  const workspaceStatus = useRef(workspace);
  workspaceStatus.current = workspace;
  const current = useRef(workspace.value);
  current.current = workspace.value;
  const revision = useRef(workspace.value.revision || 0);
  const mountId = useRef(newThoughtId());
  const requestSequence = useRef(0);
  const mounted = useRef(true);
  const saveLock = useRef(false);
  const request = useRef<AbortController | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiPreview, setAiPreview] = useState<string | null>(null);
  const taskLock = useRef(false);
  const { form, editing, mode: storedMode, taskPreview } = workspace.value;
  const [sourceMode, setSourceMode] = useState<"short" | "full" | null>(null);
  const mode = sourceMode ?? storedMode;
  useEffect(() => {
    setSourceMode(searchParams.get("record") && searchParams.get("mode") === "short" ? "short" : null);
  }, [searchParams.get("record"), searchParams.get("mode")]);
  function updateWorkspace(patch: Partial<typeof initial>) {
    revision.current++;
    request.current?.abort();
    setAiBusy(false);
    const next = { ...current.current, ...patch, revision: (current.current.revision || 0) + 1 };
    current.current = next;
    return workspace.setValue(next);
  }
  function setForm(next: ReturnType<typeof emptyForm> | ((prev: ReturnType<typeof emptyForm>) => ReturnType<typeof emptyForm>)) {
    updateWorkspace({ form: typeof next === "function" ? next(current.current.form) : next });
    setAiAlternative("");
    setAiExplanations({});
    setAiObservations([]);
    setAiMissingInfo([]);
  }
  const setEditing = (editing: boolean) => updateWorkspace({ editing });
  const setMode = (mode: "full" | "short") => { setSourceMode(mode); updateWorkspace({ mode }); };
  const setTaskPreview = (taskPreview: ThoughtTaskPreview | null) => updateWorkspace({ taskPreview });
  const { draft, clear: clearDraft } = useMindDraft(user?.id);
  const seededRef = useRef(false);
  const focusRecordId = searchParams.get("record");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [aiAlternative, setAiAlternative] = useState("");
  const [aiObservations, setAiObservations] = useState<CbtAnalysisOutput["observations"]>([]);
  const [aiMissingInfo, setAiMissingInfo] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");

  const emotionsList = isEn ? EMOTIONS_EN : EMOTIONS_FA;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; request.current?.abort(); };
  }, []);
  useEffect(() => {
    if (workspace.conflict) { revision.current++; request.current?.abort(); setAiBusy(false); }
  }, [workspace.conflict]);
  useRecoverableExit(() => (!!taskPreview || JSON.stringify(form) !== JSON.stringify(emptyForm())) && (!workspace.durable || workspace.conflict), T("پیش‌نویس کامل محفوظ نیست. پیش از خروج متن را کپی کنید. خارج می‌شوید؟", "The full draft is not safely preserved. Copy your text before leaving. Leave?"), { watchSearch: true });
  function clearSeed() {
    const seed = current.current.legacySeed;
    const latest = getMindDraft(user?.id);
    if (seed && latest && seed.text === latest.text && seed.path === latest.path && seed.updatedAt === latest.updatedAt) clearDraft();
  }

  // Stale AI suggestion invalidator when inputs change
  function updateFormField<K extends keyof ReturnType<typeof emptyForm>>(key: K, value: ReturnType<typeof emptyForm>[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "automatic_thought" || key === "situation") {
      if (aiAlternative || Object.keys(aiExplanations).length > 0) {
        setAiAlternative("");
        setAiExplanations({});
        setAiObservations([]);
        setAiMissingInfo([]);
      }
    }
  }

  useEffect(() => {
    if (!user) return;
    setRecordsStatus("loading");
    let active = true;
    let received = false;
    const timer = setTimeout(() => {
      if (active && mounted.current && !received) setRecordsStatus("unavailable");
    }, 10000);
    let unsub = () => {};
    try {
      unsub = subscribeThoughtRecords(user.id, (data, source) => {
        if (!active || !mounted.current) return;
        received = true;
        clearTimeout(timer);
        setRecords(data);
        setRecordsStatus(source?.fromCache ? "cached" : "received");
      }, () => { if (active && mounted.current) { clearTimeout(timer); setRecordsStatus("unavailable"); } });
    } catch { setRecordsStatus("unavailable"); }
    return () => { active = false; clearTimeout(timer); unsub(); };
  }, [user?.id, historyRetry]);

  async function detect() {
    if (aiBusy || !user) return;
    if (aiPreview !== aiConfigSignature()) {
      setAiPreview(aiConfigSignature());
      toast.error(T("سرویس تغییر کرده؛ پیش‌نمایش تازه را دوباره تأیید کنید", "Provider changed; confirm the refreshed preview"));
      return;
    }
    if (!form.automatic_thought.trim()) {
      toast.error(T("اول فکر خودکار را بنویس", "Write the automatic thought first"));
      return;
    }
    setAiPreview(null);
    const controller = new AbortController();
    request.current = controller;
    const inputRevision = revision.current;
    const input = current.current;
    const isCurrent = () => mounted.current && !workspaceStatus.current.conflict && current.current === input && !controller.signal.aborted && request.current === controller && revision.current === inputRevision;
    setAiBusy(true);
    try {
      const ctx = createMindAIContext({
        operation: "cbt_analysis",
        promptVersion: "cbt_v2.0",
        language: isEn ? "en" : "fa",
        tool: "thought_records",
        fields: {
          situation: { value: form.situation, provenance: "user_report" },
          automatic_thought: { value: form.automatic_thought, provenance: "user_report" },
          evidence_for: {
            value: form.evidence_for.filter((x: string) => x.trim()),
            provenance: "user_report",
          },
          evidence_against: {
            value: form.evidence_against.filter((x: string) => x.trim()),
            provenance: "user_report",
          },
        },
      });

      const res = await executeMindAI<CbtAnalysisOutput>(ctx, { signal: controller.signal, cacheScope: `${user.id}:${input.recordId}:${inputRevision}:${isEn ? "en" : "fa"}:${mountId.current}:${++requestSequence.current}`, timeoutMs: 15000 });
      if (!isCurrent()) return;
      const d = res.data;

      const explMap: Record<string, string> = {};
      d.possible_patterns.forEach((p) => {
        explMap[p.distortionKey] = p.confidenceExplanation;
      });

      setAiExplanations(explMap);
      setAiAlternative(d.alternative_perspective || "");
      setAiObservations(d.observations || []);
      setAiMissingInfo(d.missing_information || []);

      toast.success(
        d.possible_patterns.length
          ? isEn
            ? `${d.possible_patterns.length} pattern(s) suggested`
            : `${d.possible_patterns.length} الگوی پیشنهادی شناسایی شد`
          : T("الگوی مشخصی پیشنهاد نشد؛ این واقع‌بینانه بودن فکر را ثابت نمی‌کند", "No clear pattern suggested; this does not establish that the thought is realistic")
      );
    } catch (e: any) {
      if (isCurrent()) toast.error(e.message || T("خطا در تشخیص", "Detection error"));
    } finally {
      if (mounted.current && request.current === controller) setAiBusy(false);
    }
  }

  useEffect(() => {
    if (seededRef.current || !draft?.text || (draft.path && draft.path !== "think")) return;
    seededRef.current = true;
    if (!current.current.form.situation) updateWorkspace({ form: { ...current.current.form, situation: draft.text }, editing: true, legacySeed: draft });
  }, [draft]);

  useEffect(() => {
    if (!focusRecordId) return;
    setActiveTab("history");
    const t = setTimeout(() => document.getElementById(`record-${focusRecordId}`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 400);
    return () => clearTimeout(t);
  }, [focusRecordId, records.length]);

  async function save() {
    if (saveLock.current || deleting.current === current.current.recordId || workspace.conflict) return;
    if (!user || !form.situation.trim() || !form.automatic_thought.trim()) {
      toast.error(T("موقعیت و فکر خودکار را پر کن", "Please fill in situation and automatic thought"));
      return;
    }
    const saveKey = `${user.id}:${current.current.recordId}`;
    if (pendingThoughtSaves.has(saveKey)) { toast.error(T("ذخیره قبلی هنوز در جریان است؛ کمی بعد دوباره تلاش کنید", "The previous save is still running; retry shortly")); return; }
    pendingThoughtSaves.add(saveKey);
    saveLock.current = true;
    setSaving(true);
    const savedRevision = revision.current;
    const snapshot = current.current;
    const isCurrent = () => mounted.current && !workspaceStatus.current.conflict && current.current === snapshot && savedRevision === revision.current;
    const payload = {
      user_id: user.id,
      situation: form.situation.trim(),
      automatic_thought: form.automatic_thought.trim(),
      emotion_intensity_before: form.emotion_intensity_before,
      emotion_intensity_after: form.emotion_intensity_after,
      emotions: form.emotions,
      evidence_for: form.evidence_for.filter((x: string) => x.trim()),
      evidence_against: form.evidence_against.filter((x: string) => x.trim()),
      alternative_thought: form.alternative_thought.trim() || null,
      takeaway: form.takeaway?.trim() || null,
      next_step: form.next_step?.trim() || null,
      distortions: form.distortions,
    };

    try {
    const savedId = await upsertThoughtRecord(user.id, { ...payload, id: current.current.recordId });
    if (!mounted.current) return;
    if (savedId) {
      if (!isCurrent()) { toast.success(T("نسخه قبلی ذخیره شد؛ ویرایش تازه حفظ شد", "Earlier version saved; newer edits preserved")); return; }
      if (!workspace.clear()) { toast.error(T("رکورد ذخیره شد، اما پاک‌کردن پیش‌نویس ناموفق بود", "Record saved, but draft cleanup failed")); return; }
      clearSeed();
      toast.success(T("ثبت شد", "Saved"));
      updateWorkspace({ form: emptyForm(), editing: false, recordId: newThoughtId(), legacySeed: null });
      setAiAlternative("");
      setAiExplanations({});
    } else {
      toast.error(T("خطا در ذخیره رکورد", "Error saving record"));
    }
    } catch {
      if (mounted.current) toast.error(T("خطا در ذخیره رکورد", "Error saving record"));
    } finally {
      pendingThoughtSaves.delete(saveKey);
      saveLock.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  async function confirmTask() {
    if (!user || !taskPreview || taskLock.current || workspace.conflict || !taskPreview.title.trim()) return;
    taskLock.current = true;
    const preview = taskPreview;
    const inputRevision = revision.current;
    try {
      const result = await createTaskFromMind({
        id: `task_${preview.sourceId}`, user_id: user.id, title: preview.title.trim(),
        description: preview.includePrivate ? preview.privateText : undefined,
        due_in_days: preview.due, source_type: "cbt_thought", source_id: preview.sourceId,
      });
      if (!mounted.current) return;
      if (result.ok) {
        if (revision.current !== inputRevision || current.current.taskPreview !== preview || workspaceStatus.current.conflict) {
          toast.success(T("قدم قبلی در کارها موجود است؛ ویرایش تازه حفظ شد", "Earlier step is in Tasks; newer edits preserved"));
          return;
        }
        setTaskPreview(null);
        toast.success(T("قدم در کارها موجود است", "Step is in Tasks"), { action: { label: T("بازکردن", "Open"), onClick: () => navigate(`/app/tasks/${encodeURIComponent(result.task!.id)}`) } });
      } else toast.error(result.error || T("ساخت تسک ناموفق بود؛ دوباره تلاش کنید", "Task creation failed; please retry"));
    } finally { taskLock.current = false; }
  }

  // Monthly stats
  const distortionFreq: Record<string, number> = {};
  records.forEach((r) =>
    (r.distortions || []).forEach((d: string) => {
      distortionFreq[d] = (distortionFreq[d] || 0) + 1;
    })
  );

  return (
    <div
      dir={isEn ? "ltr" : "rtl"}
      className="page-shell page-shell--lg space-y-6 animate-fade-in"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <HeaderTitlePortal title={T("بررسی فکر", "Think it through")} />
          <p className="text-muted-foreground text-sm">
            {T(
              "مسیر ۵ مرحله‌ای: اتفاق ← فکر خودکار ← احساس ← شواهد ← برداشت متعادل‌تر.",
              "5-step path: Situation → Automatic Thought → Emotion → Evidence → Balanced Perspective."
            )}
          </p>
        </div>
        {!editing && (
          <Button onClick={() => setEditing(true)}>
            <Plus className="w-4 h-4 ms-1" /> {T("ثبت جدید", "New Record")}
          </Button>
        )}
      </div>

      <div className="inline-flex rounded-lg border border-border p-0.5 text-sm" role="tablist" aria-label={T("حالت بررسی", "Mode")}>
        {([["full", T("مسیر کامل", "Full path")], ["short", T("حالت کوتاه: اتفاق ← برداشت ← واکنش", "Quick: event → view → reaction")]] as const).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)} data-testid={`think-mode-${k}`}
            className={`rounded-md px-3 py-1.5 ${mode === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{label}</button>
        ))}
      </div>
      {mode === "short" && <ABCView embedded />}
      {(editing || taskPreview) && <div role="status" className="text-sm text-muted-foreground">
        {workspace.conflict ? T("نسخه دیگری موجود است؛ ویرایش شما حفظ شده", "Another draft exists; your edits are preserved") : workspace.durable ? T("پیش‌نویس روی این دستگاه محفوظ است؛ هنوز در حساب ثبت نشده", "Draft preserved on this device; not yet saved to your account") : T("پیش‌نویس فقط در حافظه است؛ متن را پیش از خروج کپی کنید", "Draft is only in memory; copy your text before leaving")}
        <ConcernNav ownerId={user?.id} concernId={concernId} toolId="thoughts" slot={slot} />
        <DraftPrivacy {...workspace} />
        <DraftConflictNotice conflict={workspace.conflict} acceptRemote={() => { revision.current++; request.current?.abort(); workspace.acceptRemote(); setAiAlternative(""); setAiExplanations({}); setAiObservations([]); setAiMissingInfo([]); }} keepLocal={workspace.keepLocal} />
      </div>}
      {taskPreview && <Card role="dialog" aria-label={T("پیش‌نمایش قدم", "Step preview")}><CardContent className="p-4 space-y-3">
        <p>{T("مقصد: کارها؛ ساخت فقط پس از تأیید شما", "Destination: Tasks; created only after your confirmation")}</p>
        <Label htmlFor="thought-task-title">{T("عنوان تسک", "Task title")}</Label><Input id="thought-task-title" value={taskPreview.title} onChange={(e) => setTaskPreview({ ...taskPreview, title: e.target.value })} />
        <Label htmlFor="thought-task-due">{T("موعد اختیاری", "Optional due date")}</Label><select id="thought-task-due" value={taskPreview.due ?? ""} onChange={(e) => setTaskPreview({ ...taskPreview, due: e.target.value === "" ? null : Number(e.target.value) })}><option value="">{T("بدون موعد", "No due date")}</option><option value="0">{T("امروز", "Today")}</option><option value="1">{T("فردا", "Tomorrow")}</option></select>
        <label className="flex gap-2"><input type="checkbox" checked={taskPreview.includePrivate} onChange={(e) => setTaskPreview({ ...taskPreview, includePrivate: e.target.checked })} />{T("متن خصوصی را هم کپی کن", "Also copy private text")}</label>
        {taskPreview.includePrivate && <Textarea aria-label={T("جزئیات خصوصی", "Private details")} value={taskPreview.privateText} onChange={(e) => setTaskPreview({ ...taskPreview, privateText: e.target.value })} />}
        <Button onClick={confirmTask}>{T("تأیید ساخت قدم", "Confirm step creation")}</Button><Button variant="ghost" onClick={() => setTaskPreview(null)}>{T("انصراف", "Cancel")}</Button>
      </CardContent></Card>}
      {mode === "full" && (<>
      {/* Guide Accordion */}
      <Card className="border-primary/20">
        <CardContent className="p-0">
          <Accordion type="single" collapsible>
            <AccordionItem value="guide" className="border-0">
              <AccordionTrigger className="px-5 py-4 hover:no-underline">
                <div className="flex items-center gap-2 text-start">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <span className="font-medium">
                    {T("راهنمای تمرین CBT: چگونه از این فرم استفاده کنم؟", "CBT Guide: How to use this framework?")}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 space-y-4 text-sm leading-7">
                <section>
                  <div className="font-semibold text-foreground mb-1">
                    {T("🧠 اصول روان‌شناختی CBT", "🧠 Principles of CBT")}
                  </div>
                  <p className="text-muted-foreground">
                    {T(
                      "در درمان شناختی-رفتاری، احساسات شدید ناخوشایند معمولاً ناشی از تفسیرهای خودکار و تک‌بعدی از وقایع هستند. این ابزار برای «آزمون واقعیت» افکار است، نه سرکوب آن‌ها. هیچ تضمینی برای کاهش ناگهانی احساس وجود ندارد؛ مشاهده و ثبت آگاهانه شواهد خود گامی ارزشمند است.",
                      "In Cognitive Behavioral Therapy, intense distress often arises from automatic, rigid interpretations rather than the events themselves. This framework is a tool for reality-testing thoughts, not suppressing them."
                    )}
                  </p>
                </section>
                <section>
                  <div className="font-semibold text-foreground mb-1">
                    {T("📝 مراحل ۵ گانه", "📝 The 5 Steps")}
                  </div>
                  <ol className="text-muted-foreground list-decimal pe-5 space-y-1.5">
                    <li><strong className="text-foreground">{T("۱. چه اتفاقی افتاد؟", "1. What happened?")}</strong> {T("فقط واقعیت بیرونی، عینی و بدون قضاوت.", "Objective facts only, without interpretations.")}</li>
                    <li><strong className="text-foreground">{T("۲. چه فکری از ذهنت گذشت؟", "2. What thought crossed your mind?")}</strong> {T("جمله اولیه ذهنی همان‌طور که حس شد.", "The verbatim automatic thought.")}</li>
                    <li><strong className="text-foreground">{T("۳. چه احساسی داشتی؟", "3. What did you feel?")}</strong> {T("نام‌گذاری احساس و شدت اختیاری (۰ تا ۱۰۰).", "Naming the emotion and optional intensity (0-100).")}</li>
                    <li><strong className="text-foreground">{T("۴. شواهد موافق و مخالف:", "4. Evidence for & against:")}</strong> {T("وزن‌دهی واقع‌بینانه به داده‌های واقعی.", "Objective facts supporting and contradicting the thought.")}</li>
                    <li><strong className="text-foreground">{T("۵. برداشت متعادل‌تر:", "5. Balanced perspective:")}</strong> {T("دیدگاهی واقع‌بینانه که تمام شواهد را ببیند.", "A realistic alternative accounting for all facts.")}</li>
                  </ol>
                </section>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Editing Form */}
      {editing && (
        <Card className="border-2 border-primary/30">
          <CardHeader>
            <CardTitle>{T("ثبت فکر جدید", "New Thought Record")}</CardTitle>
            <CardDescription>
              {T("تمام مراحل را با آرامش و صداقت پر کن. شدت احساس اختیاری است.", "Take your time. Emotion rating is optional.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Step 1: Situation */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">
                {T("۱. چه اتفاقی افتاد؟ (فقط فکت عینی)", "1. What happened? (Objective facts only)")}
              </Label>
              <Textarea
                maxLength={300}
                value={form.situation}
                onChange={(e) => updateFormField("situation", e.target.value)}
                rows={2}
                placeholder={T("کجا بودی، چه ساعتی بود، چه کسی چه گفت؟ بدون تفسیر...", "Where were you, who was there, what happened objectively...")}
              />
            </div>

            {/* Step 2: Automatic Thought */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">
                {T("۲. چه فکری از ذهنت گذشت؟ (فکر خودکار)", "2. What thought popped into your mind? (Automatic thought)")}
              </Label>
              <Textarea
                maxLength={250}
                value={form.automatic_thought}
                onChange={(e) => updateFormField("automatic_thought", e.target.value)}
                rows={2}
                placeholder={T("اولین فکری که از ذهنت رد شد، عیناً...", "The immediate sentence that crossed your mind...")}
              />
            </div>

            {/* Step 3: Emotion & Optional Intensity */}
            <div className="space-y-3 p-3.5 rounded-xl border border-border/60 bg-muted/20">
              <Label className="font-semibold text-sm">
                {T("۳. چه احساسی داشتی؟", "3. What emotion did you feel?")}
              </Label>
              <div className="flex flex-wrap gap-2">
                {emotionsList.map((e) => {
                  const selected = form.emotions.includes(e);
                  return (
                    <Badge
                      key={e}
                      variant={selected ? "default" : "outline"}
                      className="cursor-pointer text-xs py-1 px-2.5 transition"
                      onClick={() =>
                        setForm({
                          ...form,
                          emotions: selected
                            ? form.emotions.filter((x: string) => x !== e)
                            : [...form.emotions, e],
                        })
                      }
                    >
                      {e}
                    </Badge>
                  );
                })}
              </div>

              {/* Intensity Before (Optional, NO default 50) */}
              <div className="pt-2 border-t border-border/40 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">
                    {T("شدت احساس در لحظه رخداد (اختیاری):", "Emotion intensity at the moment (optional):")}
                  </span>
                  <div className="flex items-center gap-2 font-mono font-semibold">
                    <span>
                      {form.emotion_intensity_before != null
                        ? `${form.emotion_intensity_before} / 100`
                        : T("ثبت نشده", "Not rated")}
                    </span>
                    {form.emotion_intensity_before != null && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => setForm({ ...form, emotion_intensity_before: null })}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <Slider
                  value={[form.emotion_intensity_before ?? 0]}
                  onValueChange={(v) => setForm({ ...form, emotion_intensity_before: v[0] })}
                  max={100}
                  step={5}
                />
              </div>
            </div>

            {/* Step 4: Evidence For & Against */}
            <div className="space-y-4">
              <Label className="font-semibold text-sm">
                {T("۴. چه شواهدی موافق یا مخالف این فکر داری؟", "4. What evidence supports or contradicts this thought?")}
              </Label>
              <ListField
                label={T("شواهد موافق (دلایل عینی که فکر را تایید می‌کنند)", "Evidence Supporting (Objective facts supporting the thought)")}
                items={form.evidence_for}
                onChange={(items) => setForm({ ...form, evidence_for: items })}
                addLabel={T("افزودن شاهد", "Add Evidence")}
              />
              <ListField
                label={T("شواهد مخالف (فکت‌های عینی که با فکر ناهمخوانند)", "Evidence Against (Objective facts contradicting the thought)")}
                items={form.evidence_against}
                onChange={(items) => setForm({ ...form, evidence_against: items })}
                addLabel={T("افزودن شاهد", "Add Evidence")}
              />
            </div>

            {/* AI Suggestion Box */}
            <div className="space-y-3 pt-2">
              <Button variant="outline" size="sm" onClick={() => setAiPreview(aiConfigSignature())} disabled={aiBusy}>
                {aiBusy ? <Loader2 className="w-4 h-4 ms-1 animate-spin" /> : <Sparkles className="w-4 h-4 ms-1 text-primary" />}
                {T("پیشنهاد الگو و فکر جایگزین با AI (اختیاری)", "Suggest Distortions & Alternative with AI (Optional)")}
              </Button>
              {aiBusy && <Button variant="ghost" onClick={() => { request.current?.abort(); request.current = null; setAiBusy(false); }}>{T("لغو انتظار؛ پردازش سرویس ممکن است ادامه یابد", "Cancel waiting; provider processing may continue")}</Button>}
              {aiPreview && <div role="dialog" aria-label={T("پیش‌نمایش ارسال AI", "AI sending preview")} className="space-y-2 rounded-lg border p-3">
                <p>{T("فقط موقعیت، فکر خودکار و شواهد زیر ارسال می‌شود؛ زمینه عمومی اضافه نمی‌شود.", "Only the situation, automatic thought and evidence below are sent; no general personalization is added.")}</p>
                <p>{getOpConfig("distortion_detect").provider} / {getOpConfig("distortion_detect").model}</p>
                <pre className="whitespace-pre-wrap text-sm">{JSON.stringify({ situation: form.situation, automatic_thought: form.automatic_thought, evidence_for: form.evidence_for.filter(x => x.trim()), evidence_against: form.evidence_against.filter(x => x.trim()) }, null, 2)}</pre>
                <Button onClick={detect}>{T("با ارسال این متن موافقم", "I agree to send this text")}</Button><Button variant="ghost" onClick={() => setAiPreview(null)}>{T("بدون ارسال ادامه می‌دهم", "Continue without sending")}</Button>
              </div>}
              {aiObservations.length > 0 && <div><h3>{T("آنچه گفتی / برداشت احتمالی", "What you said / possible interpretation")}</h3>{aiObservations.map((observation, i) => <p key={i}>«{observation.quoteOrReference}» — {observation.observation}</p>)}</div>}
              {Object.entries(aiExplanations).map(([pattern, explanation]) => <p key={pattern} className="text-sm"><strong>{getDistortionLabel(pattern as Distortion, isEn)}</strong> — {explanation}</p>)}
              {aiMissingInfo.length > 0 && <div><h3>{T("آنچه هنوز معلوم نیست", "What remains unknown")}</h3>{aiMissingInfo.map((info, i) => <p key={i}>{info}</p>)}</div>}

              {aiAlternative && (
                <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      {T("پیشنهاد هوش مصنوعی:", "AI Suggestion:")}
                    </span>
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 text-xs"
                      onClick={() => {
                        setForm({ ...form, alternative_thought: aiAlternative });
                        toast.success(T("در فکر جایگزین درج شد", "Copied to alternative thought"));
                      }}
                    >
                      <Check className="w-3.5 h-3.5 me-1" />
                      {T("پذیرش و درج در فرم", "Accept & Insert")}
                    </Button>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed italic">
                    «{aiAlternative}»
                  </p>
                </div>
              )}
            </div>

            {/* Step 5: Balanced Perspective */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">
                {T("۵. چه برداشت متعادلتری ممکن است؟ (فکر جایگزین)", "5. What more balanced perspective is possible? (Alternative thought)")}
              </Label>
              <Textarea
                rows={3}
                value={form.alternative_thought}
                onChange={(e) => setForm({ ...form, alternative_thought: e.target.value })}
                placeholder={T("جمله‌ای که هر دو دسته شواهد را منصفانه و واقع‌بینانه در بر بگیرد...", "A realistic statement that accounts for both sets of facts...")}
              />
            </div>

            {/* Intensity After (Optional, NO default 50) */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">
                  {T("شدت احساس پس از بازنگری (اختیاری):", "Emotion intensity after reframing (optional):")}
                </span>
                <div className="flex items-center gap-2 font-mono font-semibold">
                  <span>
                    {form.emotion_intensity_after != null
                      ? `${form.emotion_intensity_after} / 100`
                      : T("ثبت نشده", "Not rated")}
                  </span>
                  {form.emotion_intensity_after != null && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => setForm({ ...form, emotion_intensity_after: null })}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
              <Slider
                value={[form.emotion_intensity_after ?? 0]}
                onValueChange={(v) => setForm({ ...form, emotion_intensity_after: v[0] })}
                max={100}
                step={5}
              />
              {form.emotion_intensity_before != null && form.emotion_intensity_after != null && (
                <div className="text-xs pt-1 flex justify-between font-medium">
                  <span>{T("تغییر شدت:", "Intensity shift:")}</span>
                  <span
                    className={
                      form.emotion_intensity_before > form.emotion_intensity_after
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground"
                    }
                  >
                    {form.emotion_intensity_before > form.emotion_intensity_after
                      ? `-${form.emotion_intensity_before - form.emotion_intensity_after} ${isEn ? "points" : "واحد کاهش"}`
                      : form.emotion_intensity_before === form.emotion_intensity_after
                      ? T("بدون تغییر — ثبت احساس خود ارزشمند است", "No change — observing feelings is valuable")
                      : `+${form.emotion_intensity_after - form.emotion_intensity_before} ${isEn ? "points" : "واحد افزایش"}`}
                  </span>
                </div>
              )}
            </div>

            {/* Final Takeaway & Next Step */}
            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {T("برداشت من (اختیاری)", "My Takeaway (Optional)")}
                </Label>
                <Input
                  value={form.takeaway}
                  onChange={(e) => setForm({ ...form, takeaway: e.target.value })}
                  placeholder={T("نکته‌ای برای به خاطر سپردن...", "Key insight to remember...")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {T("قدم بعدی، اگر لازم است (بدون ساخت خودکار تسک)", "Next Step, if needed (No automatic task)")}
                </Label>
                <Input
                  value={form.next_step}
                  onChange={(e) => setForm({ ...form, next_step: e.target.value })}
                  placeholder={T("یک اقدام کوچک فردا...", "A small action step for tomorrow...")}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={save} size="lg" disabled={saving || workspace.conflict}>
                {T("ذخیره رکورد", "Save Record")}
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => {
                  setEditing(false);
                  setAiAlternative("");
                }}
              >
                {T("انصراف", "Cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Records List */}
      <div className="space-y-3">
        {recordsStatus !== "received" && <div role="status" className="text-sm text-muted-foreground">
          {recordsStatus === "loading" ? T("در انتظار دریافت ثبت‌ها…", "Waiting for records…") : recordsStatus === "cached" ? T("نسخهٔ ذخیره‌شدهٔ دستگاه؛ آخرین وضعیت سرور تأیید نشده است.", "Device-cached records; the latest server state is not confirmed.") : T("دریافت ثبت‌ها تأیید نشده؛ این به معنی نبود ثبت نیست", "Loading records is not confirmed; this does not mean your history is empty")}
          <Button variant="ghost" onClick={() => setHistoryRetry(value => value + 1)}>{T("تلاش دوباره برای دریافت", "Retry loading")}</Button>
        </div>}
        {records.map((r) => (
          <Card key={r.id} id={`record-${r.id}`} className={focusRecordId === r.id ? "ring-2 ring-primary" : ""}>
            <CardContent className="p-4 space-y-2.5 text-sm">
              <div className="flex justify-between items-start gap-2">
                <div className="font-semibold text-foreground">{r.situation}</div>
                <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString(isEn ? "en-US" : "fa-IR")}
                  <button
                    type="button"
                    className="grid h-7 w-7 place-items-center rounded-md hover:bg-destructive/10 hover:text-destructive"
                    aria-label={T("حذف این ثبت", "Delete this record")}
                    data-testid={`record-delete-${r.id}`}
                    disabled={saving || !!deletingId}
                    onClick={async () => {
                      if (!user || saveLock.current || deleting.current || !window.confirm(T("این ثبت حذف شود؟", "Delete this record?"))) return;
                      deleting.current = r.id;
                      setDeletingId(r.id);
                      try {
                        const ok = await deleteThoughtRecord(user.id, r.id);
                        if (!mounted.current) return;
                        if (!ok) toast.error(T("حذف نشد", "Could not delete"));
                        else if (current.current.recordId === r.id) updateWorkspace({ recordId: newThoughtId() });
                      } catch { if (mounted.current) toast.error(T("حذف نشد", "Could not delete")); }
                      finally { deleting.current = null; if (mounted.current) setDeletingId(null); }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="text-muted-foreground bg-muted/30 p-2.5 rounded-lg text-xs leading-relaxed">
                <strong className="text-foreground">{T("فکر خودکار: ", "Automatic Thought: ")}</strong>
                «{r.automatic_thought}»
              </div>

              {r.alternative_thought && (
                <div className="text-foreground/90 bg-primary/5 border border-primary/20 p-2.5 rounded-lg text-xs leading-relaxed">
                  <strong className="text-primary">{T("برداشت متعادل: ", "Balanced Thought: ")}</strong>
                  «{r.alternative_thought}»
                </div>
              )}

              <div className="flex gap-2 text-xs flex-wrap items-center pt-1">
                {(r.emotions || []).map((e: string) => (
                  <Badge key={e} variant="secondary" className="text-[10px]">
                    {e}
                  </Badge>
                ))}
                {r.emotion_intensity_before != null && (
                  <span className="text-muted-foreground">
                    {isEn ? `Before: ${r.emotion_intensity_before}` : `شدت قبل: ${r.emotion_intensity_before}`}
                  </span>
                )}
                {r.emotion_intensity_after != null && (
                  <span className="text-primary font-medium">
                    {isEn ? `→ After: ${r.emotion_intensity_after}` : `→ بعد: ${r.emotion_intensity_after}`}
                  </span>
                )}
              </div>

              {(r.next_step || r.alternative_thought) && (
                <div className="pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => setTaskPreview({ sourceId: r.id, title: r.next_step || T("مرور برداشت متعادل", "Review a balanced perspective"), privateText: `${r.situation}\n${r.automatic_thought}\n${r.alternative_thought || ""}`, includePrivate: false, due: null })}
                  >
                    <ListPlus className="w-3.5 h-3.5 ms-1" />
                    {T("پیش‌نمایش قدم در کارها", "Preview step in Tasks")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {recordsStatus === "received" && records.length === 0 && !editing && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {T("هنوز ثبتی وجود ندارد. اولین Thought Record را ثبت کن.", "No records yet. Create your first Thought Record.")}
          </div>
        )}
      </div>
      </>)}
    </div>
  );
}

function ListField({
  label,
  items,
  onChange,
  addLabel = "افزودن",
}: {
  label: string;
  items: string[];
  onChange: (i: string[]) => void;
  addLabel?: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {items.map((v, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={v}
            onChange={(e) => {
              const a = [...items];
              a[i] = e.target.value;
              onChange(a);
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange([...items, ""])}
      >
        <Plus className="w-3 h-3 ms-1" /> {addLabel}
      </Button>
    </div>
  );
}
