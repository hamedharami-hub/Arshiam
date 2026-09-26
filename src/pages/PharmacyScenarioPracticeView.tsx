import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, ClipboardCheck, RotateCcw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBilingual } from "@/hooks/useBilingual";
import { filterPharmacyPracticeScenarios, type PharmacyScenarioModeFilter } from "@/lib/pharmacyScenarioPractice";
import { PHARMACY_PRACTICE_SCENARIOS } from "@/lib/pharmacyScenarioPracticeData";

const PRACTICE_STEPS = ["case", "questions", "response", "debrief"] as const;
type PracticeStep = 0 | 1 | 2 | 3;

const initialScenarioId =
  PHARMACY_PRACTICE_SCENARIOS.find((scenario) => scenario.mode === "MODE_B_SLANG")?.id
  ?? PHARMACY_PRACTICE_SCENARIOS[0]?.id
  ?? "";

export default function PharmacyScenarioPracticeView() {
  const { T, lang } = useBilingual();
  const isEn = lang === "en";
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<PharmacyScenarioModeFilter>("all");
  const [selectedId, setSelectedId] = useState(initialScenarioId);
  const [step, setStep] = useState<PracticeStep>(0);
  const [unlockedStep, setUnlockedStep] = useState<PracticeStep>(0);
  const [revealedAnswers, setRevealedAnswers] = useState<Set<string>>(() => new Set());
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  const filteredScenarios = useMemo(
    () => filterPharmacyPracticeScenarios(PHARMACY_PRACTICE_SCENARIOS, query, mode),
    [mode, query],
  );
  const scenario = filteredScenarios.find((item) => item.id === selectedId) ?? filteredScenarios[0] ?? null;
  const selectedOption = scenario?.dialogueOptions.find((option) => option.id === selectedOptionId) ?? null;

  const resetPractice = () => {
    setStep(0);
    setUnlockedStep(0);
    setRevealedAnswers(new Set());
    setSelectedOptionId(null);
  };
  const updateQuery = (value: string) => {
    setQuery(value);
    resetPractice();
  };
  const updateMode = (value: PharmacyScenarioModeFilter) => {
    setMode(value);
    resetPractice();
  };
  const selectScenario = (id: string) => {
    setSelectedId(id);
    resetPractice();
  };
  const revealAnswer = (key: string) => {
    setRevealedAnswers((previous) => new Set(previous).add(key));
  };
  const allQuestionsRevealed = Boolean(scenario && scenario.questions.every((question) => revealedAnswers.has(question.key)));
  const canContinue = step === 0
    || (step === 1 && allQuestionsRevealed)
    || (step === 2 && (Boolean(selectedOption) || !scenario?.dialogueOptions.length));

  const continueStep = () => {
    if (!canContinue || step >= PRACTICE_STEPS.length - 1) return;
    const next = (step + 1) as PracticeStep;
    setStep(next);
    setUnlockedStep((current) => Math.max(current, next) as PracticeStep);
  };
  const getModeLabel = (scenarioMode: string) => {
    if (scenarioMode === "MODE_A_ADMIN") return T("مکالمهٔ اجرایی", "Operational case");
    if (scenarioMode === "MODE_C_CONFLICT") return T("تعارض/پیچیدگی", "Complex case");
    return T("درخواست OTC و مکالمه", "OTC & communication");
  };

  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 px-3 py-4 sm:px-5 sm:py-6" dir={isEn ? "ltr" : "rtl"}>
      <header className="flex items-start gap-3">
        <div className="rounded-2xl bg-primary/10 p-3 text-primary" aria-hidden="true"><ClipboardCheck className="h-6 w-6" /></div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{T("تمرین تعاملی سناریوهای Pharmacy", "Pharmacy scenario practice")}</h1>
          <p className="text-sm text-muted-foreground">{T("پرونده را مرحله‌به‌مرحله بخوان، پاسخ بیمار را باز کن و بعد تصمیم منبع را ببین.", "Work through a case, reveal the patient's replies, then compare your choice with the source label.")}</p>
        </div>
      </header>

      <Card role="note" className="flex items-start gap-3 border-amber-500/40 bg-amber-500/5 p-4 text-sm">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
        <p className="leading-relaxed">
          {T(
            "تمام پرونده‌ها snapshot منبع Pharmacy هستند و بازبینی مستقل نشده‌اند. برچسب‌های «پیشنهادی» فقط همان علامت داخل منبع را بازتاب می‌دهند، نه تأیید بالینی ما. این تمرین برای مطالعه است و جایگزین راهنمای جاری، ارزیابی بیمار یا سیاست محل کار نیست.",
            "These cases are snapshots from the Pharmacy source and have not been independently reviewed. “Recommended” only reflects a flag in that source, not our clinical endorsement. For study only; not a substitute for current guidance, patient assessment, or workplace policy.",
          )}
        </p>
      </Card>

      <section className="grid gap-3 md:grid-cols-[minmax(14rem,1fr)_14rem_minmax(15rem,1.4fr)]" aria-label={T("انتخاب سناریو", "Choose a scenario")}>
        <div className="relative min-w-0">
          <Search className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${isEn ? "left-3" : "right-3"}`} aria-hidden="true" />
          <Input
            type="search"
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            aria-label={T("جست‌وجوی پرونده", "Search cases")}
            placeholder={T("نام یا موضوع پرونده…", "Case title or topic…")}
            className={isEn ? "ps-9" : "pe-9"}
          />
        </div>
        <Select value={mode} onValueChange={(value) => updateMode(value as PharmacyScenarioModeFilter)}>
          <SelectTrigger aria-label={T("نوع سناریو", "Scenario type")}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{T("همهٔ انواع", "All types")}</SelectItem>
            <SelectItem value="MODE_B_SLANG">{T("OTC و مکالمه", "OTC & communication")}</SelectItem>
            <SelectItem value="MODE_C_CONFLICT">{T("تعارض/پیچیدگی", "Complex cases")}</SelectItem>
            <SelectItem value="MODE_A_ADMIN">{T("اجرایی/اداری", "Operational/admin")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={scenario?.id ?? "none"} onValueChange={selectScenario} disabled={!filteredScenarios.length}>
          <SelectTrigger aria-label={T("پروندهٔ فعال", "Active case")}><SelectValue placeholder={T("پرونده‌ای نیست", "No cases")} /></SelectTrigger>
          <SelectContent>
            {filteredScenarios.map((item) => (
              <SelectItem key={item.id} value={item.id}>{isEn ? item.titleEn : item.titleFa}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground md:col-span-3" aria-live="polite">
          {T(`${filteredScenarios.length} پرونده`, `${filteredScenarios.length} cases`)}
        </p>
      </section>

      {scenario ? (
        <>
          <Card className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <h2 className="break-words text-lg font-semibold leading-snug">{isEn ? scenario.titleEn : scenario.titleFa}</h2>
                <p className="break-words text-sm text-muted-foreground">{isEn ? scenario.categoryEn : scenario.categoryFa}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary">{getModeLabel(scenario.mode)}</Badge>
                <Badge variant="outline" className="text-amber-700 dark:text-amber-300">{T("بازبینی‌نشده", "Unreviewed")}</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Progress value={(step / (PRACTICE_STEPS.length - 1)) * 100} aria-label={T("پیشرفت پرونده", "Case progress")} />
              <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PRACTICE_STEPS.map((stepId, index) => {
                  const labels = [T("پرونده", "Case"), T("پرسش‌ها", "Questions"), T("پاسخ", "Response"), T("مرور", "Debrief")];
                  return (
                    <li key={stepId}>
                      <button
                        type="button"
                        disabled={index > unlockedStep}
                        aria-current={step === index ? "step" : undefined}
                        onClick={() => setStep(index as PracticeStep)}
                        className="w-full rounded-lg border px-2 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-45 enabled:hover:bg-accent aria-[current=step]:border-primary aria-[current=step]:bg-primary/10 aria-[current=step]:font-semibold"
                      >
                        <span className="me-1 inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs">{index + 1}</span>
                        {labels[index]}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>

            {step === 0 && (
              <section aria-labelledby="scenario-case-heading" className="space-y-3">
                <h3 id="scenario-case-heading" className="text-base font-semibold">{T("شرح اولیهٔ بیمار", "Initial presentation")}</h3>
                {(scenario.patientName || scenario.patientAge !== null || scenario.patientGender) && (
                  <div className="flex flex-wrap gap-2 text-sm">
                    {scenario.patientName && <Badge variant="outline">{scenario.patientName}</Badge>}
                    {scenario.patientAge !== null && <Badge variant="outline">{T(`${scenario.patientAge} سال`, `${scenario.patientAge} years`)}</Badge>}
                    {scenario.patientGender && <Badge variant="outline">{scenario.patientGender}</Badge>}
                  </div>
                )}
                <p className="rounded-xl bg-muted/50 p-4 text-sm leading-relaxed">
                  {(isEn ? scenario.presentationEn : scenario.presentationFa) || T("شرح اولیه‌ای در منبع ثبت نشده است.", "No initial presentation is recorded in the source.")}
                </p>
              </section>
            )}

            {step === 1 && (
              <section aria-labelledby="scenario-questions-heading" className="space-y-3">
                <div>
                  <h3 id="scenario-questions-heading" className="text-base font-semibold">{T("پرسش‌های ارزیابی", "Assessment questions")}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{T("پاسخ بیمار را جداگانه باز کن؛ قبل از آن نتیجه نمایش داده نمی‌شود.", "Reveal each patient reply when ready; the outcome stays hidden until later.")}</p>
                </div>
                {scenario.questions.length ? scenario.questions.map((question) => {
                  const revealed = revealedAnswers.has(question.key);
                  return (
                    <Card key={question.key} className="space-y-2 p-3 sm:p-4">
                      <p className="font-medium leading-relaxed">{(isEn ? question.questionEn : question.questionFa) || (isEn ? question.labelEn : question.labelFa) || question.key}</p>
                      {revealed ? (
                        <p className="rounded-lg bg-muted/60 p-3 text-sm leading-relaxed">{isEn ? question.answerEn : question.answerFa}</p>
                      ) : (
                        <Button type="button" variant="outline" size="sm" onClick={() => revealAnswer(question.key)}>
                          {T("نمایش پاسخ بیمار", "Reveal patient reply")}
                        </Button>
                      )}
                    </Card>
                  );
                }) : <p className="rounded-lg bg-muted/50 p-4 text-sm">{T("پرسش ساختاریافته‌ای برای این پرونده ثبت نشده است.", "No structured questions are recorded for this case.")}</p>}
              </section>
            )}

            {step === 2 && (
              <section aria-labelledby="scenario-response-heading" className="space-y-3">
                <div>
                  <h3 id="scenario-response-heading" className="text-base font-semibold">{T("پاسخ خودت را انتخاب کن", "Choose your response")}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{T("این انتخاب‌ها عیناً از گزینه‌های منبع آمده‌اند.", "Options are reproduced from the source snapshot.")}</p>
                </div>
                {scenario.dialogueOptions.length ? scenario.dialogueOptions.map((option, index) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selectedOptionId === option.id}
                    onClick={() => setSelectedOptionId(option.id)}
                    className="w-full rounded-xl border p-3 text-start transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-primary aria-pressed:bg-primary/5 sm:p-4"
                  >
                    <span className="mb-2 block text-xs font-semibold text-muted-foreground">{T(`گزینهٔ ${index + 1}`, `Option ${index + 1}`)}</span>
                    <span className="block whitespace-pre-line text-sm leading-relaxed">{isEn ? option.textEn : option.textFa}</span>
                    {selectedOptionId === option.id && (
                      <span className="mt-3 block rounded-lg bg-muted/60 p-3 text-sm leading-relaxed">
                        <span className="mb-1 block text-xs font-semibold text-muted-foreground">{T("واکنش بیمار طبق منبع", "Patient reply in source")}</span>
                        {isEn ? option.patientReplyEn : option.patientReplyFa}
                        {(option.sourceMarksRecommended || option.sourceMarksRedFlagResponse) && (
                          <span className="mt-2 block font-medium text-emerald-700 dark:text-emerald-300">
                            {T("این گزینه در snapshot منبع علامت‌گذاری شده است.", "This option is flagged in the source snapshot.")}
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                )) : <p className="rounded-lg bg-muted/50 p-4 text-sm">{T("گزینهٔ پاسخی در منبع ثبت نشده است.", "No response options are recorded in the source.")}</p>}
              </section>
            )}

            {step === 3 && (
              <section aria-labelledby="scenario-debrief-heading" className="space-y-4">
                <h3 id="scenario-debrief-heading" className="text-base font-semibold">{T("مرور محتوای منبع", "Source debrief")}</h3>
                {selectedOption && (
                  <Card className="space-y-2 border-primary/30 p-4">
                    <p className="text-xs font-semibold text-muted-foreground">{T("انتخاب تو", "Your choice")}</p>
                    <p className="whitespace-pre-line text-sm leading-relaxed">{isEn ? selectedOption.textEn : selectedOption.textFa}</p>
                    <p className="text-sm text-muted-foreground">{selectedOption.sourceMarksRecommended ? T("منبع این گزینه را توصیه‌شده علامت زده است؛ این علامت بازبینی مستقل نیست.", "The source flags this option as recommended; that flag is not an independent review.") : T("منبع این گزینه را به‌عنوان پاسخ پیشنهادی علامت نزده است.", "The source does not flag this option as its recommended response.")}</p>
                  </Card>
                )}
                {scenario.outcome && (
                  <Card className="space-y-2 p-4">
                    <Badge variant="outline">{scenario.outcome.requiresReferral ? T("ارجاع در متن منبع", "Referral in source") : T("نتیجه در متن منبع", "Outcome in source")}</Badge>
                    <p className="text-sm font-semibold leading-relaxed">{isEn ? scenario.outcome.recommendationEn : scenario.outcome.recommendationFa}</p>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{isEn ? scenario.outcome.explanationEn : scenario.outcome.explanationFa}</p>
                  </Card>
                )}
                {scenario.redFlags.length > 0 && (
                  <Card className="space-y-2 border-rose-500/30 p-4">
                    <h4 className="font-semibold">{T("علائم/نکات هشدار درج‌شده در منبع", "Flags and cautions listed in source")}</h4>
                    <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed">
                      {scenario.redFlags.map((flag, index) => <li key={`${scenario.id}-flag-${index}`}>{isEn ? flag.en || flag.fa : flag.fa || flag.en}</li>)}
                    </ul>
                  </Card>
                )}
                <a href={scenario.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline">
                  {T("بازکردن فایل سناریو در GitHub", "Open scenario source on GitHub")}
                </a>
              </section>
            )}

            <footer className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={resetPractice} className="gap-2">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />{T("شروع دوباره", "Restart")}
              </Button>
              <div className="flex gap-2">
                {step > 0 && (
                  <Button type="button" variant="outline" onClick={() => setStep((step - 1) as PracticeStep)} className="gap-2">
                    {isEn ? <ArrowLeft className="h-4 w-4" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                    {T("قبلی", "Back")}
                  </Button>
                )}
                {step < 3 ? (
                  <Button type="button" onClick={continueStep} disabled={!canContinue} className="gap-2">
                    {T("ادامه", "Continue")}
                    {isEn ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : <ArrowLeft className="h-4 w-4" aria-hidden="true" />}
                  </Button>
                ) : (
                  <Button type="button" onClick={resetPractice}>{T("پایان تمرین", "Finish practice")}</Button>
                )}
              </div>
            </footer>
          </Card>
        </>
      ) : (
        <Card className="px-5 py-12 text-center">
          <Search className="mx-auto mb-3 h-7 w-7 text-muted-foreground" aria-hidden="true" />
          <h2 className="font-semibold">{T("پرونده‌ای پیدا نشد", "No cases found")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{T("جست‌وجو را تغییر بده یا نوع دیگری را انتخاب کن.", "Change the search or choose another case type.")}</p>
        </Card>
      )}
    </main>
  );
}
