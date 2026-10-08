import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { resolveLeitnerCardContent } from "@/lib/leitnerCardLanguage";
import {
  computeDueCards,
  getLeitnerCards,
  previewNextInterval,
  reviewLeitnerCardWithRating,
} from "@/lib/leitnerService";
import type { LeitnerCard, LeitnerRating } from "@/lib/leitnerTypes";
import { toPersianDigits } from "@/lib/persianDigits";

const RATINGS: LeitnerRating[] = [1, 2, 3, 4];

function scopeCards(cards: LeitnerCard[], docId: string, folderId: string) {
  if (docId) return cards.filter((card) => card.document_id === docId);
  if (folderId) return cards.filter((card) => card.folder_id === folderId);
  return cards;
}

export default function RecallSessionView() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const { T, isEn } = useBilingual();
  const [params] = useSearchParams();
  const docId = params.get("docId") || "";
  const folderId = params.get("folderId") || "";
  const scopeKey = `${userId}|${docId}|${folderId}`;

  const [queue, setQueue] = useState<LeitnerCard[]>([]);
  const [seen, setSeen] = useState(0);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const load = useCallback(() => {
    if (!userId) {
      setQueue([]);
      setPhase("ready");
      return () => undefined;
    }
    let active = true;
    setPhase("loading");
    setRevealed(false);
    setSaveError("");
    getLeitnerCards(userId)
      .then((cards) => {
        if (!active) return;
        setQueue(computeDueCards(scopeCards(cards, docId, folderId)));
        setSeen(0);
        setPhase("ready");
      })
      .catch(() => {
        if (active) setPhase("error");
      });
    return () => {
      active = false;
    };
  }, [userId, docId, folderId]);

  useEffect(() => load(), [load]);

  const card = queue[0];
  const content = useMemo(
    () => (card ? resolveLeitnerCardContent(card, "bilingual") : null),
    [card],
  );

  const intervals = useMemo(() => {
    const labels: Partial<Record<LeitnerRating, string>> = {};
    if (!card) return labels;
    for (const rating of RATINGS) {
      try {
        const next = previewNextInterval(card, rating);
        labels[rating] = isEn ? next.textEn : next.textFa;
      } catch {
        labels[rating] = "";
      }
    }
    return labels;
  }, [card, isEn]);

  const grade = async (rating: LeitnerRating) => {
    if (!card || !userId || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      await reviewLeitnerCardWithRating(userId, card.id, rating);
      setQueue((current) => {
        const [head, ...rest] = current;
        if (!head || head.id !== card.id) return current;
        return rating === 1 ? [...rest, head] : rest;
      });
      setSeen((count) => count + 1);
      setRevealed(false);
    } catch {
      setSaveError(T("این درجه ذخیره نشد. کارت سر جایش مانده است.", "This grade was not saved. The card is still here."));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) return;
      if (!card || saving || phase !== "ready") return;
      if (!revealed && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        setRevealed(true);
        return;
      }
      const rating = Number(event.key) as LeitnerRating;
      if (revealed && rating >= 1 && rating <= 4) {
        event.preventDefault();
        void grade(rating);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const labels: Record<LeitnerRating, string> = {
    1: T("دوباره", "Again"),
    2: T("سخت", "Hard"),
    3: T("خوب", "Good"),
    4: T("آسان", "Easy"),
  };

  const remaining = isEn ? String(queue.length) : toPersianDigits(queue.length);
  const reviewed = isEn ? String(seen) : toPersianDigits(seen);

  return (
    <main dir={isEn ? "ltr" : "rtl"} className="recall-session" data-testid="recall-session" key={scopeKey}>
      <HeaderTitlePortal title={T("مرور", "Review")} />
      <header className="recall-meta">
        <p>{phase === "ready" && card ? T(`${remaining} کارت مانده`, `${remaining} left`) : T("مرور", "Review")}</p>
        <p>{T(`${reviewed} پاسخ`, `${reviewed} answered`)}</p>
      </header>

      {phase === "loading" && (
        <p role="status" className="recall-status" data-testid="recall-loading">{T("در حال آوردن کارت‌ها…", "Bringing cards…")}</p>
      )}

      {phase === "error" && (
        <div role="alert" className="recall-status" data-testid="recall-error">
          <p>{T("کارت‌ها بارگذاری نشدند.", "Cards could not be loaded.")}</p>
          <button type="button" className="recall-reveal" onClick={() => load()}>{T("تلاش دوباره", "Retry")}</button>
        </div>
      )}

      {phase === "ready" && !card && (
        <section className="recall-card" data-testid="recall-empty">
          <h2>{seen > 0 ? T("مرور این نوبت تمام شد", "This round is finished") : T("کارتی برای امروز نیست", "Nothing is due today")}</h2>
          <p>{seen > 0
            ? T("درجه‌ها ذخیره شد. هر وقت خواستی برگرد.", "Grades are saved. Come back when you want.")
            : T("کارت تازه‌ای در این محدوده برای امروز نمانده.", "No card in this scope is due today.")}</p>
          <Link className="recall-reveal" to="/app/today">{T("بازگشت به امروز", "Back to today")}</Link>
          <Link className="recall-quiet" to="/app/knowledge">{T("کتابخانه", "Library")}</Link>
        </section>
      )}

      {phase === "ready" && card && content && (
        <section className="recall-card" data-testid="recall-card">
          <p className="recall-kicker">{revealed ? T("پاسخ", "Answer") : T("پرسش", "Prompt")}</p>
          <h2 className="recall-prompt" dir="auto" data-testid="recall-front">{content.front.text}</h2>
          {content.front.secondaryText && <p className="recall-secondary" dir="auto">{content.front.secondaryText}</p>}
          {!revealed && card.clue && <p className="recall-clue">{card.clue}</p>}
          {revealed && (
            <div className="recall-answer" data-testid="recall-back">
              <p dir="auto">{content.back.text}</p>
              {content.back.secondaryText && <p className="recall-secondary" dir="auto">{content.back.secondaryText}</p>}
            </div>
          )}
        </section>
      )}

      {phase === "ready" && card && !revealed && (
        <button type="button" className="recall-reveal" data-testid="recall-show" onClick={() => setRevealed(true)}>
          {T("نمایش پاسخ", "Show answer")}
        </button>
      )}

      {phase === "ready" && card && revealed && (
        <div className="recall-grades" role="group" aria-label={T("درجهٔ یادآوری", "Recall grade")}>
          {RATINGS.map((rating) => (
            <button
              key={rating}
              type="button"
              className="recall-grade"
              data-rating={rating}
              data-testid={`recall-grade-${rating}`}
              disabled={saving}
              onClick={() => void grade(rating)}
            >
              <span>{labels[rating]}</span>
              {intervals[rating] && <small>{intervals[rating]}</small>}
            </button>
          ))}
        </div>
      )}

      {saveError && <p role="alert" className="recall-status" data-testid="recall-save-error">{saveError}</p>}
    </main>
  );
}
