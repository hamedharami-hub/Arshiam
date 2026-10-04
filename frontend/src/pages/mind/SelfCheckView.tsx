import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { Back, MethodCard, SafetyNotice } from "@/components/needs/NeedsBits";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { AGREE_LABELS, FREQ_LABELS, getSelfCheck, scoreSelfCheck } from "@/lib/needs/selfChecks";
import { saveCheckResult } from "@/lib/needs/service";
import { toPersianDigits } from "@/lib/persianDigits";

/** /app/mind/check/:id — short, non-diagnostic self-check. */
export default function SelfCheckView() {
  const { id } = useParams();
  const def = getSelfCheck(id);
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const [answers, setAnswers] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  if (!def) return <div className="page-shell"><Back to="/app/mind" label={T("ذهن", "Mind")} /><p className="text-sm">{T("این خودسنجی پیدا نشد.", "Check not found.")}</p></div>;
  const L = (b: { fa: string; en: string }) => (isEn ? b.en : b.fa);
  const labels = def.scale === "frequency" ? FREQ_LABELS : AGREE_LABELS;
  const complete = def.items.every((_, i) => answers[i] !== undefined);
  const result = done && complete ? scoreSelfCheck(def, answers) : null;

  const submit = () => { if (!complete) return; setDone(true); if (user?.id) void saveCheckResult(user.id, def.id, scoreSelfCheck(def, answers).pct, answers); };

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="page-shell page-shell--lg space-y-5 pb-28 animate-fade-in" data-testid="selfcheck">
      <HeaderTitlePortal title={L(def.title)} />
      <Back to="/app/mind" label={T("ذهن", "Mind")} />
      <h1 className="text-lg font-bold">{L(def.title)}</h1>
      {def.sensitive && <SafetyNotice />}
      {!result && (
        <>
          <p className="text-xs leading-5 text-muted-foreground">{L(def.intro)}</p>
          <div className="space-y-4">
            {def.items.map((item, i) => (
              <fieldset key={i} className="surface-card space-y-2.5 p-3.5" data-testid={`selfcheck-item-${i}`}>
                <legend className="sr-only">{L(item.text)}</legend>
                <p className="text-sm font-medium leading-6">{isEn ? i + 1 : toPersianDigits(i + 1)}. {L(item.text)}</p>
                <div className="grid grid-cols-5 gap-1">
                  {labels.map((lab, v) => (
                    <button key={v} type="button" aria-pressed={answers[i] === v} onClick={() => setAnswers((a) => { const n = [...a]; n[i] = v; return n; })} data-testid={`selfcheck-${i}-${v}`}
                      className={`when-icon-btn min-h-[3rem] px-1 text-[10px] leading-4 ${answers[i] === v ? "when-icon-btn--active" : ""}`}>{L(lab)}</button>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          <button type="button" onClick={submit} disabled={!complete} className="inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-40" data-testid="selfcheck-submit">{T("نمایش نتیجه", "See result")}</button>
        </>
      )}
      {result && (
        <div className="space-y-4" data-testid="selfcheck-result">
          <section className="surface-card space-y-2 p-4">
            <p className="text-xs text-muted-foreground">{T("نتیجه", "Result")}</p>
            <p className="text-xl font-bold" data-testid="selfcheck-band">{L(result.band.label)}</p>
            <p className="text-sm leading-7">{L(result.band.message)}</p>
            <p className="text-[11px] text-muted-foreground">{L(def.intro)}</p>
          </section>
          <section className="space-y-2"><h3 className="text-sm font-bold">{T("روش‌هایی که می‌تواند کمک کند", "Methods that may help")}</h3>{result.band.methods.map((m) => <MethodCard key={m} id={m} />)}</section>
          <div className="flex gap-3">
            <button type="button" onClick={() => { setDone(false); setAnswers([]); }} className="h-10 rounded-xl bg-muted px-4 text-sm font-medium" data-testid="selfcheck-retake">{T("دوباره", "Retake")}</button>
            <Link to="/app/mind" className="inline-flex h-10 items-center rounded-xl px-3 text-sm text-primary hover:underline">{T("بازگشت به ذهن", "Back to Mind")}</Link>
          </div>
        </div>
      )}
    </div>
  );
}
