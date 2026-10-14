import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { Back, MethodCard, SafetyNotice } from "@/components/needs/NeedsBits";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { AGREE_LABELS, FREQ_LABELS, getSelfCheck, reviewSelfCheck, scoreSelfCheck, selfCheckPresentation } from "@/lib/needs/selfChecks";
import type { SelfCheckDef } from "@/lib/needs/types";
import { saveCheckResult } from "@/lib/needs/service";
import { useWorkspaceDraft } from "@/lib/mind/workspaceDraft";
import { toPersianDigits } from "@/lib/persianDigits";
import { useRecoverableExit } from "@/hooks/useRecoverableExit";
import { DraftPrivacy } from "@/components/mind/DraftPrivacy";

type Draft = { answers: (number | null)[]; reflection: string; reflectionItem: number | null; reviewed: boolean; resultId: string | null };
const EMPTY: Draft = { answers: [], reflection: "", reflectionItem: null, reviewed: false, resultId: null };

/** Account and check identity remount the editor, including in A → B → A. */
export default function SelfCheckView() {
  const { id } = useParams();
  const { user } = useAuth();
  const { T } = useBilingual();
  const def = getSelfCheck(id);
  if (!def) return <div className="page-shell"><Back to="/app/mind" label={T("ذهن", "Mind")} /><p className="text-sm">{T("این خودسنجی پیدا نشد.", "Check not found.")}</p></div>;
  return <SelfCheckEditor key={JSON.stringify([user?.id ?? null, def.id])} ownerId={user?.id} legacyDef={def} />;
}

function SelfCheckEditor({ ownerId, legacyDef }: { ownerId?: string; legacyDef: SelfCheckDef }) {
  const { T, isEn } = useBilingual();
  const def = selfCheckPresentation(legacyDef);
  const draft = useWorkspaceDraft<Draft>(ownerId, `selfcheck:${def.id}`, EMPTY);
  const { answers, reflection, reflectionItem, reviewed } = draft.value;
  const latest = useRef(draft);
  latest.current = draft;
  useRecoverableExit(() => (!!latest.current.value.reflection || latest.current.value.answers.some(value => value !== null)) && !latest.current.durable,
    T("پاسخ‌ها روی دستگاه حفظ نشده‌اند؛ قبل از خروج آن‌ها را کپی کن. خارج می‌شوی؟", "Answers are not retained on this device. Copy them before leaving. Leave anyway?"));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [resetFailed, setResetFailed] = useState(false);
  const busy = useRef(false);
  const savedAnswers = useRef(false);
  const savedSnapshot = useRef<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    // An accepted remote version can contain different answers. Keep an account
    // success claim only for the exact responses that were actually saved.
    if (savedAnswers.current && savedSnapshot.current !== JSON.stringify(answers)) {
      savedAnswers.current = false;
      savedSnapshot.current = null;
      setSaveState("idle");
    }
  }, [answers]);
  const L = (b: { fa: string; en: string }) => (isEn ? b.en : b.fa);
  const labels = def.scale === "frequency" ? FREQ_LABELS : AGREE_LABELS;
  const review = reviewSelfCheck(def, answers);
  const resultVisible = reviewed && review.complete;

  const submit = async () => {
    // Ref guard closes the same-event-loop double-click gap before React renders.
    if (!review.complete || busy.current || savedAnswers.current || draft.conflict) return;
    busy.current = true;
    const resultId = draft.value.resultId || `${legacyDef.id}_${crypto.randomUUID()}`;
    const retained = draft.setValue({ ...draft.value, reviewed: true, resultId });
    if (!ownerId || draft.temporary) { busy.current = false; return; }
    if (!retained) { busy.current = false; setSaveState("failed"); return; }
    setSaveState("saving");
    const snapshot = answers.slice() as number[];
    try {
      const saved = await saveCheckResult(ownerId, legacyDef.id, scoreSelfCheck(legacyDef, snapshot).pct, snapshot, { resultId, language: isEn ? "en" : "fa", interpretationVersion: "reported-responses-v1" });
      if (mounted.current) {
        if (latest.current.conflict || JSON.stringify(latest.current.value.answers) !== JSON.stringify(snapshot)) { setSaveState("idle"); return; }
        savedAnswers.current = saved === true; savedSnapshot.current = saved === true ? JSON.stringify(snapshot) : null; setSaveState(saved === true ? "saved" : "failed");
      }
    } catch {
      if (mounted.current) setSaveState("failed");
    } finally { busy.current = false; }
    // Retain the full draft: this legacy service saves answers, not reflection.
  };

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="page-shell page-shell--lg space-y-5 pb-28 animate-fade-in" data-testid="selfcheck">
      <HeaderTitlePortal title={L(def.title)} />
      <Back to="/app/mind" label={T("ذهن", "Mind")} />
      <h1 className="text-lg font-bold">{L(def.title)}</h1>
      <DraftPrivacy {...draft} />
      {def.sensitive && <SafetyNotice />}
      <p className="text-xs leading-5 text-muted-foreground">{L(def.intro)}</p>
      <p role="status" className="text-xs text-muted-foreground">{draft.durable
        ? T("پیش‌نویس روی این دستگاه نگهداری شده؛ همگام‌سازی حساب نیست.", "Draft retained on this device; this is not account sync.")
        : T("نگهداری پایدار روی دستگاه تأیید نشده؛ پیش از خروج پاسخ‌ها و تأملت را کپی کن.", "Durable device storage is not confirmed; copy your answers and reflection before leaving.")}</p>
      {draft.conflict && <section role="alert" className="surface-card space-y-2 p-3">
        <p>{T("نسخهٔ دیگری از این پیش‌نویس تغییر کرده؛ نسخهٔ فعلی جایگزین نشده است.", "Another draft version changed; your working copy has not been replaced.")}</p>
        <button type="button" disabled={saveState === "saving"} onClick={() => draft.acceptRemote()}>{T("پذیرفتن نسخهٔ دیگر", "Accept other version")}</button>
        <button type="button" disabled={saveState === "saving"} onClick={() => draft.keepLocal()}>{T("نگه‌داشتن نسخهٔ من", "Keep my version")}</button>
      </section>}
      {!resultVisible && <>
        <p className="text-xs text-muted-foreground">{T("بازهٔ زمانی مشخصی برای این فرم شخصی تعیین نشده است؛ پاسخ‌ها را فقط در زمینهٔ تجربهٔ خودت مرور کن.", "This personal form has no specified timeframe; review answers in the context of your own experience.")}</p>
        <div className="space-y-4">
          {def.items.map((item, i) => <fieldset key={i} className="surface-card space-y-2.5 p-3.5" data-testid={`selfcheck-item-${i}`}>
            <legend className="sr-only">{L(item.text)}</legend>
            <p className="text-sm font-medium leading-6">{isEn ? i + 1 : toPersianDigits(i + 1)}. {L(item.text)}</p>
            <div className="grid grid-cols-5 gap-1">{labels.map((lab, v) => <button key={v} type="button" aria-pressed={answers[i] === v}
              onClick={() => { const next = [...answers]; while (next.length <= i) next.push(null); next[i] = v; draft.setValue({ ...draft.value, answers: next, resultId: next[i] === answers[i] ? draft.value.resultId : null }); }}
              data-testid={`selfcheck-${i}-${v}`} className={`when-icon-btn min-h-[3rem] px-1 text-[10px] leading-4 ${answers[i] === v ? "when-icon-btn--active" : ""}`}>{L(lab)}</button>)}</div>
          </fieldset>)}
        </div>
        <button type="button" onClick={submit} disabled={!review.complete || draft.conflict} className="inline-flex min-h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-40" data-testid="selfcheck-submit">{ownerId && !draft.temporary ? T("مرور پاسخ‌ها و ثبت در حساب", "Review answers & save to account") : T("مرور پاسخ‌ها", "Review answers")}</button>
      </>}
      {resultVisible && <div className="space-y-4" data-testid="selfcheck-result">
        <section className="surface-card space-y-3 p-4">
          <h2 className="text-lg font-bold">{T("پاسخ‌های گزارش‌شدهٔ تو", "Your reported responses")}</h2>
          <p className="text-xs text-muted-foreground">{T("این مرور توصیفی است؛ برچسب شدت یا تشخیص ندارد. اگر خواستی یک پاسخ را برای تأمل انتخاب کن؛ پایان بدون اقدام هم معتبر است.", "This is a descriptive review, not a severity label or diagnosis. You may choose a response to reflect on; finishing without an action is valid.")}</p>
          <ul className="space-y-3">{review.responses.map((response, i) => <li key={i}>
            <button type="button" aria-pressed={reflectionItem === i} className="min-h-11 w-full text-start text-sm" onClick={() => draft.setValue({ ...draft.value, reflectionItem: i })}>
              {L(response.text)} <strong>— {response.answer && L(response.answer)}</strong>
            </button>
          </li>)}</ul>
          <label htmlFor="selfcheck-reflection" className="block text-sm font-medium">{T("تأمل اختیاری: چه چیزی دربارهٔ این پاسخ برایت مهم است؟", "Optional reflection: what matters to you about this response?")}</label>
          <textarea id="selfcheck-reflection" className="w-full rounded-xl border bg-background p-3 text-sm" value={reflection} onChange={(e) => draft.setValue({ ...draft.value, reflection: e.target.value })} />
          <p role="status" data-testid="selfcheck-save-status" className="text-xs">{saveState === "saving" ? T("در حال ثبت پاسخ‌ها در حساب…", "Saving answers to account…")
            : saveState === "saved" ? T("پاسخ‌ها در حساب ثبت شدند. تأمل فقط در پیش‌نویس دستگاه است.", "Answers saved to account. Reflection stays in the device draft only.")
            : saveState === "failed" ? T("ثبت در حساب انجام نشد؛ پاسخ‌ها برای تلاش دوباره حفظ شده‌اند.", "Account save failed; answers are kept for retry.")
            : T("ثبت در حساب تأیید نشده است.", "Account storage is not confirmed.")}</p>
          {ownerId && !draft.temporary && saveState !== "saved" && <button type="button" onClick={submit} disabled={saveState === "saving" || draft.conflict} data-testid="selfcheck-retry" className="min-h-11 text-primary">{T("تلاش برای ثبت پاسخ‌ها", "Retry saving answers")}</button>}
        </section>
        <details className="space-y-2"><summary className="min-h-11 cursor-pointer text-sm font-bold">{T("روش‌های اختیاری برای این موضوع", "Optional methods for this topic")}</summary>{review.methods.map((m) => <MethodCard key={m} id={m} />)}</details>
        {resetFailed && <p role="alert">{T("پاک‌کردن پیش‌نویس انجام نشد؛ نسخهٔ فعلی حفظ شده است.", "Could not clear the draft; your working copy is kept.")}</p>}
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={saveState === "saving"} onClick={() => { if (draft.clear()) { savedAnswers.current = false; setSaveState("idle"); setResetFailed(false); } else setResetFailed(true); }} className="min-h-11 rounded-xl bg-muted px-4 text-sm font-medium" data-testid="selfcheck-retake">{T("پاک‌کردن پیش‌نویس و شروع دوباره", "Clear draft & retake")}</button>
          <Link to="/app/mind" className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm text-primary hover:underline">{T("فعلاً کافی است", "Finish for now")}</Link>
        </div>
      </div>}
    </div>
  );
}
