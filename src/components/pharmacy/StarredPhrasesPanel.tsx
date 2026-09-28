import { useState } from "react";
import { Layers, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBilingual } from "@/hooks/useBilingual";
import type { PharmacyStarredPhrase } from "@/lib/pharmacyPracticeStore";
import type { StarTarget } from "./useStarToggle";
import { PharmacyLeitnerCardDialog, type PharmacyCardDraft } from "./PharmacyLeitnerCardDialog";

export function StarButton({ starred, onToggle, testId }: { starred: boolean; onToggle: () => void; testId: string }) {
  const { T } = useBilingual();
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={starred}
      aria-label={starred ? T("حذف ستاره", "Unstar phrase") : T("ستاره‌دارکردن عبارت", "Star phrase")}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:text-amber-500"
      data-testid={testId}
    >
      <Star className={`h-4 w-4 ${starred ? "fill-current" : ""}`} aria-hidden="true" />
    </button>
  );
}

interface StarredPhrasesPanelProps {
  phrases: PharmacyStarredPhrase[];
  onRemove: (target: StarTarget) => void | Promise<void>;
  scenarioTitle: (scenarioId: string) => string;
  documentIdFor: (scenarioId: string) => string | null;
}

export function StarredPhrasesPanel({ phrases, onRemove, scenarioTitle, documentIdFor }: StarredPhrasesPanelProps) {
  const { T, lang } = useBilingual();
  const isEn = lang === "en";
  const [draft, setDraft] = useState<PharmacyCardDraft | null>(null);

  return (
    <section aria-labelledby="starred-phrases-heading" className="space-y-2" data-testid="starred-phrases-panel">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="starred-phrases-heading" className="flex items-center gap-1.5 text-base font-semibold"><Star className="h-4 w-4 fill-amber-400 text-amber-500" aria-hidden="true" />{T("عبارت‌های ستاره‌دار", "Starred phrases")}</h2>
        <span className="text-xs text-muted-foreground">{T("بین دستگاه‌های حساب تو همگام می‌شود", "Synced across your devices")}</span>
      </div>
      {phrases.length ? (
        <ul className="space-y-2">
          {phrases.map((phrase) => (
            <li key={phrase.id} className="flex items-start gap-2 rounded-lg border p-3" data-testid="starred-phrase-item">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="break-words text-sm font-medium leading-relaxed">{isEn ? phrase.textEn || phrase.textFa : phrase.textFa || phrase.textEn}</p>
                <p className="truncate text-xs text-muted-foreground">{scenarioTitle(phrase.scenarioId)}</p>
              </div>
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={T("ساخت کارت از عبارت", "Make a card from phrase")} onClick={() => setDraft({ front: phrase.textEn || phrase.textFa, back: phrase.textFa || phrase.textEn, documentId: documentIdFor(phrase.scenarioId) })} data-testid="starred-phrase-make-card-btn">
                <Layers className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={T("حذف", "Remove")} onClick={() => onRemove(phrase)} data-testid="starred-phrase-remove-btn">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground" data-testid="starred-phrases-empty">{T("هنوز عبارتی ستاره نزده‌ای؛ کنار عبارت‌های کلیدی یا پاسخ بیمار روی ستاره بزن.", "No starred phrases yet; tap the star beside a key phrase or patient reply.")}</p>
      )}
      <PharmacyLeitnerCardDialog draft={draft} onClose={() => setDraft(null)} />
    </section>
  );
}
