import { AlertTriangle } from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";
import type { KnowledgeSection } from "@/lib/knowledgeSections";

const WARNING = /هشدار|منع مصرف|احتیاط|عوارض جدی|warning|contraindic|red flag|boxed|precaution|serious/i;
const ALWAYS = /کاربرد|اندیکاسیون|دسته|indication|\buses?\b|class|category|overview/i;
const stripHeading = (html: string) => html.replace(/^\s*<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/i, "");
const SUMMARY = /دوز|مصرف|تداخل|cyp|dos(e|ing)|administration|interaction/i;

export type DrugTier = 1 | 2 | 3;
export function classifySection(title: string): { tier: DrugTier; warning: boolean } {
  if (WARNING.test(title)) return { tier: 1, warning: true };
  if (ALWAYS.test(title)) return { tier: 1, warning: false };
  if (SUMMARY.test(title)) return { tier: 2, warning: false };
  return { tier: 3, warning: false };
}

/** A page is treated as a medicine page when it has a warning/use section plus a dosing/interaction section. */
export function isDrugLike(sections: KnowledgeSection[]): boolean {
  const kinds = sections.map(s => classifySection(s.title));
  return kinds.some(k => k.tier === 1) && kinds.some(k => k.tier === 2);
}

export function DrugTiers({ introduction, sections, dir, className }: { introduction: string; sections: KnowledgeSection[]; dir: "ltr" | "rtl"; className: string }) {
  const { T } = useBilingual();
  const grouped = sections.map(s => ({ s, ...classifySection(s.title) }));
  const tier1 = grouped.filter(g => g.tier === 1).sort((a, b) => Number(b.warning) - Number(a.warning));
  const tier2 = grouped.filter(g => g.tier === 2);
  const tier3 = grouped.filter(g => g.tier === 3);
  return (
    <div dir={dir} className="min-w-0 space-y-5" data-testid="drug-tiers">
      {introduction && <div className={className} data-testid="drug-tier-intro" dangerouslySetInnerHTML={{ __html: introduction }} />}
      <div className="space-y-3" data-testid="drug-tier-1">
        {tier1.map(({ s, warning }) => (
          <section key={s.id} aria-label={s.title} className={`rounded-lg border p-3 ${warning ? "border-destructive/60 bg-destructive/5" : ""}`} data-testid={warning ? "drug-warning" : "drug-key-section"}>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              {warning && <><AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" /><span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[11px] text-destructive">{T("هشدار حیاتی", "Critical warning")}</span></>}
              <span>{s.title}</span>
            </h3>
            <div className={className} dangerouslySetInnerHTML={{ __html: stripHeading(s.html) }} />
          </section>
        ))}
      </div>
      {tier2.length > 0 && (
        <div className="space-y-3" data-testid="drug-tier-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{T("خلاصهٔ مصرف، تداخل و CYP", "Dosing, interactions and CYP summary")}</h2>
          {tier2.map(({ s }) => <section key={s.id} aria-label={s.title} className="border-s-2 ps-3"><h3 className="mb-1 text-sm font-medium">{s.title}</h3><div className={className} dangerouslySetInnerHTML={{ __html: stripHeading(s.html) }} /></section>)}
        </div>
      )}
      {tier3.length > 0 && (
        <details className="rounded-lg border" data-testid="drug-tier-3">
          <summary className="cursor-pointer select-none p-3 text-sm font-medium">{T(`جزئیات، مکانیسم و منابع (${tier3.length})`, `Details, mechanism and sources (${tier3.length})`)}</summary>
          <div className="space-y-4 border-t p-3">{tier3.map(({ s }) => <section key={s.id} aria-label={s.title}><h3 className="mb-1 text-sm font-medium">{s.title}</h3><div className={className} dangerouslySetInnerHTML={{ __html: stripHeading(s.html) }} /></section>)}</div>
        </details>
      )}
    </div>
  );
}
