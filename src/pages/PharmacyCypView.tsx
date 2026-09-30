import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { useMemo, useState } from "react";
import { AlertTriangle, FlaskConical, Layers, Plus, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PharmacyDocumentDialog } from "@/components/pharmacy/PharmacyDocumentDialog";
import { PharmacyLeitnerCardDialog, type PharmacyCardDraft } from "@/components/pharmacy/PharmacyLeitnerCardDialog";
import { useBilingual } from "@/hooks/useBilingual";
import { buildCypDrugIndex, checkCypInteractions, searchCypDrugs, type CypRuleFinding, type PharmacyCypCategory, type PharmacyCypDrug } from "@/lib/pharmacyCyp";
import { PHARMACY_CYP_ENZYMES, PHARMACY_CYP_PAIR_INTERACTIONS } from "@/lib/pharmacyCypData";

const CYP_DRUGS = buildCypDrugIndex(PHARMACY_CYP_ENZYMES);
const ROLE_STYLE: Record<PharmacyCypCategory, { short: string; className: string }> = {
  strong_inhibitor: { short: "INH+", className: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40" },
  moderate_inhibitor: { short: "INH", className: "bg-rose-500/5 text-rose-700 dark:text-rose-300 border-rose-500/20" },
  strong_inducer: { short: "IND+", className: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40" },
  moderate_inducer: { short: "IND", className: "bg-sky-500/5 text-sky-700 dark:text-sky-300 border-sky-500/20" },
  sensitive_substrate: { short: "SUB", className: "bg-muted text-foreground border-border" },
  narrow_therapeutic_substrate: { short: "NTI", className: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40" },
};

export default function PharmacyCypView() {
  const { T, lang } = useBilingual();
  const isEn = lang === "en";
  const [openDocumentId, setOpenDocumentId] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [tab, setTab] = useState("matrix");
  const addToChecker = (key: string) => setSelectedKeys((previous) => (previous.includes(key) ? previous : [...previous, key]));

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-3 py-4 sm:px-5 sm:py-6" dir={isEn ? "ltr" : "rtl"}>
      <header className="flex items-start gap-3">
        <div className="rounded-2xl bg-primary/10 p-3 text-primary" aria-hidden="true"><FlaskConical className="h-6 w-6" /></div>
        <div className="space-y-1">
          <HeaderTitlePortal title={T("ماتریس CYP و بررسی تداخل", "CYP matrix & interaction checker")} />
          <p className="text-sm text-muted-foreground">{T("نقش هر دارو روی آنزیم‌های CYP و P-gp را ببین و الگوی تداخل چند دارو را تمرین کن.", "See each medicine's role on CYP enzymes and P-gp, and practise spotting interaction patterns.")}</p>
        </div>
      </header>

      <Card role="note" className="flex items-start gap-3 border-amber-500/40 bg-amber-500/5 p-4 text-sm" data-testid="cyp-disclaimer">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
        <p className="leading-relaxed">{T(
          "آموزشی و بازبینی‌نشده. داده از snapshot منبع Pharmacy است و فقط چند ده دارو را پوشش می‌دهد. نبودِ یافته به معنی بی‌خطر بودن نیست؛ این ابزار جایگزین مرجع تداخل معتبر، قضاوت بالینی یا مشورت با تجویزکننده نیست.",
          "Educational and unreviewed. Data is a Pharmacy source snapshot covering only a few dozen medicines. No finding does not mean safe; this is not a substitute for an authoritative interaction reference, clinical judgement or the prescriber.",
        )}</p>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="matrix" data-testid="cyp-tab-matrix">{T("ماتریس", "Matrix")}</TabsTrigger>
          <TabsTrigger value="checker" data-testid="cyp-tab-checker">{T("بررسی تداخل", "Interaction checker")}{selectedKeys.length > 0 ? ` (${selectedKeys.length})` : ""}</TabsTrigger>
        </TabsList>
        <TabsContent value="matrix" className="mt-4">
          <CypMatrix onOpenDocument={setOpenDocumentId} onAdd={(key) => { addToChecker(key); }} selectedKeys={selectedKeys} />
        </TabsContent>
        <TabsContent value="checker" className="mt-4">
          <CypChecker selectedKeys={selectedKeys} onChange={setSelectedKeys} onOpenDocument={setOpenDocumentId} />
        </TabsContent>
      </Tabs>
      <PharmacyDocumentDialog documentId={openDocumentId} onClose={() => setOpenDocumentId(null)} />
    </main>
  );
}

function RoleLegend() {
  const { T } = useBilingual();
  const labels: Record<PharmacyCypCategory, string> = {
    strong_inhibitor: T("مهارکنندهٔ قوی", "Strong inhibitor"),
    moderate_inhibitor: T("مهارکنندهٔ متوسط", "Moderate inhibitor"),
    strong_inducer: T("القاکنندهٔ قوی", "Strong inducer"),
    moderate_inducer: T("القاکنندهٔ متوسط", "Moderate inducer"),
    sensitive_substrate: T("سوبسترای حساس", "Sensitive substrate"),
    narrow_therapeutic_substrate: T("سوبسترای با پنجرهٔ درمانی باریک", "Narrow-therapeutic substrate"),
  };
  return (
    <ul className="flex flex-wrap gap-2 text-xs" aria-label={T("راهنما", "Legend")}>
      {(Object.keys(ROLE_STYLE) as PharmacyCypCategory[]).map((category) => (
        <li key={category} className="flex items-center gap-1.5"><span className={`rounded border px-1.5 py-0.5 font-mono font-semibold ${ROLE_STYLE[category].className}`}>{ROLE_STYLE[category].short}</span>{labels[category]}</li>
      ))}
    </ul>
  );
}

function CypMatrix({ onOpenDocument, onAdd, selectedKeys }: { onOpenDocument: (id: string) => void; onAdd: (key: string) => void; selectedKeys: string[] }) {
  const { T } = useBilingual();
  const [query, setQuery] = useState("");
  const rows = useMemo(() => searchCypDrugs(CYP_DRUGS, query), [query]);
  return (
    <section className="space-y-3" aria-label={T("ماتریس CYP", "CYP matrix")}>
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={T("نام دارو…", "Medicine name…")} aria-label={T("جست‌وجوی دارو در ماتریس", "Search medicines in the matrix")} className="ps-9" data-testid="cyp-matrix-search" />
      </div>
      <RoleLegend />
      <p className="text-sm text-muted-foreground" aria-live="polite" data-testid="cyp-matrix-count">{T(`${rows.length} دارو`, `${rows.length} medicines`)}</p>
      <div className="max-h-[65vh] overflow-auto rounded-xl border" data-testid="cyp-matrix-scroll">
        <table className="w-full min-w-[40rem] border-collapse text-sm" data-testid="cyp-matrix-table">
          <thead className="sticky top-0 z-10 bg-background">
            <tr>
              <th scope="col" className="border-b p-2 text-start">{T("دارو", "Medicine")}</th>
              {PHARMACY_CYP_ENZYMES.map((enzyme) => (
                <th key={enzyme.id} scope="col" className="border-b p-2 text-center">
                  <button type="button" onClick={() => onOpenDocument(enzyme.documentId)} className="font-mono text-xs font-semibold text-primary underline-offset-4 hover:underline" data-testid={`cyp-enzyme-doc-${enzyme.id}`}>{enzyme.id}</button>
                </th>
              ))}
              <th scope="col" className="border-b p-2"><span className="sr-only">{T("افزودن", "Add")}</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((drug) => (
              <tr key={drug.key} className="hover:bg-accent/30" data-testid="cyp-matrix-row">
                <th scope="row" className="border-b p-2 text-start font-medium" dir="ltr">{drug.name}</th>
                {PHARMACY_CYP_ENZYMES.map((enzyme) => (
                  <td key={enzyme.id} className="border-b p-1.5 text-center">
                    <div className="flex flex-wrap justify-center gap-1">
                      {drug.roles.filter((role) => role.enzymeId === enzyme.id).map((role) => (
                        <span key={role.category} title={role.sourceEntry} className={`rounded border px-1.5 py-0.5 font-mono text-[11px] font-semibold ${ROLE_STYLE[role.category].className}`}>{ROLE_STYLE[role.category].short}</span>
                      ))}
                    </div>
                  </td>
                ))}
                <td className="border-b p-1.5 text-center">
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={selectedKeys.includes(drug.key)} onClick={() => onAdd(drug.key)} aria-label={T(`افزودن ${drug.name} به بررسی تداخل`, `Add ${drug.name} to the interaction checker`)} data-testid={`cyp-add-${drug.key.replace(/[^a-z0-9]+/g, "-")}`}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CypChecker({ selectedKeys, onChange, onOpenDocument }: { selectedKeys: string[]; onChange: (keys: string[]) => void; onOpenDocument: (id: string) => void }) {
  const { T, lang } = useBilingual();
  const isEn = lang === "en";
  const [query, setQuery] = useState("");
  const [cardDraft, setCardDraft] = useState<PharmacyCardDraft | null>(null);
  const selected = useMemo(() => selectedKeys.map((key) => CYP_DRUGS.find((drug) => drug.key === key)).filter((drug): drug is PharmacyCypDrug => Boolean(drug)), [selectedKeys]);
  const suggestions = query.trim() ? searchCypDrugs(CYP_DRUGS, query).filter((drug) => !selectedKeys.includes(drug.key)).slice(0, 8) : [];
  const result = useMemo(() => checkCypInteractions(selected, PHARMACY_CYP_PAIR_INTERACTIONS), [selected]);
  const enzymeDoc = (id: string) => PHARMACY_CYP_ENZYMES.find((enzyme) => enzyme.id === id)?.documentId ?? null;

  return (
    <section className="space-y-4" aria-label={T("بررسی تداخل", "Interaction checker")}>
      <div className="space-y-2">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={T("دارو اضافه کن…", "Add a medicine…")} aria-label={T("افزودن دارو به بررسی", "Add a medicine to check")} className="ps-9" data-testid="cyp-checker-search" />
        </div>
        {query.trim() && suggestions.length === 0 && (
          <p className="text-xs text-muted-foreground" data-testid="cyp-checker-not-in-dataset">{T("این دارو در دادهٔ محدود CYP منبع نیست؛ نبودنش به معنی بی‌تداخل بودن نیست.", "This medicine is not in the limited source CYP dataset; absence does not mean it has no interactions.")}</p>
        )}
        {suggestions.length > 0 && (
          <ul className="flex max-w-2xl flex-wrap gap-1.5" data-testid="cyp-checker-suggestions">
            {suggestions.map((drug) => (
              <li key={drug.key}>
                <button type="button" onClick={() => { onChange([...selectedKeys, drug.key]); setQuery(""); }} className="rounded-full border px-3 py-1 text-sm transition-colors hover:bg-accent" data-testid="cyp-checker-suggestion" dir="ltr">{drug.name}</button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-1.5" data-testid="cyp-checker-selected">
          {selected.map((drug) => (
            <span key={drug.key} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium" dir="ltr">
              {drug.name}
              <button type="button" onClick={() => onChange(selectedKeys.filter((key) => key !== drug.key))} aria-label={T(`حذف ${drug.name}`, `Remove ${drug.name}`)} className="rounded-full p-0.5 hover:bg-primary/20" data-testid="cyp-checker-remove"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
            </span>
          ))}
          {selected.length > 0 && <Button type="button" size="sm" variant="ghost" onClick={() => onChange([])} data-testid="cyp-checker-clear">{T("پاک‌کردن همه", "Clear all")}</Button>}
        </div>
      </div>

      {selected.length < 2 ? (
        <p className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground" data-testid="cyp-checker-empty">{T("دست‌کم دو دارو انتخاب کن.", "Choose at least two medicines.")}</p>
      ) : (
        <div className="space-y-4" data-testid="cyp-checker-results">
          {result.sourcePairs.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-base font-semibold">{T("تداخل‌های ثبت‌شده در منبع", "Interactions listed in the source")}</h2>
              {result.sourcePairs.map((pair) => (
                <Card key={`${pair.drugA}-${pair.drugB}`} className="space-y-2 border-rose-500/30 p-4" data-testid="cyp-source-pair">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="font-mono">{pair.enzyme}</Badge>
                    <Badge variant="outline">{T("شدت طبق منبع: ", "Source severity: ")}{pair.severity}</Badge>
                    <Badge variant="outline" className="text-amber-700 dark:text-amber-300">{T("بازبینی‌نشده", "Unreviewed")}</Badge>
                  </div>
                  <p className="font-semibold">{isEn ? pair.titleEn : pair.titleFa}</p>
                  <p className="text-sm leading-relaxed">{isEn ? pair.clinicalOutcomeEn : pair.clinicalOutcomeFa}</p>
                  <details className="rounded-lg border border-dashed p-2 text-sm" data-testid="cyp-source-management">
                    <summary className="cursor-pointer text-xs font-medium text-muted-foreground">{T("یادداشت مدیریت در منبع (بازبینی‌نشده، توصیهٔ درمانی نیست)", "Source management note (unreviewed, not treatment advice)")}</summary>
                    <p className="mt-1.5 leading-relaxed text-muted-foreground">{isEn ? pair.managementEn : pair.managementFa}</p>
                  </details>
                  <div className="flex flex-wrap gap-2">
                    {enzymeDoc(pair.enzyme) && <Button type="button" size="sm" variant="outline" onClick={() => onOpenDocument(enzymeDoc(pair.enzyme)!)}>{T("سند آنزیم", "Enzyme document")}</Button>}
                    <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setCardDraft({ front: `${pair.drugA} + ${pair.drugB}: which CYP interaction and what outcome?`, back: `${pair.enzyme}: ${pair.clinicalOutcomeEn}`, documentId: enzymeDoc(pair.enzyme) })} data-testid="cyp-source-pair-card-btn">
                      <Layers className="h-4 w-4" aria-hidden="true" />{T("کارت Leitner", "Leitner card")}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
          <div className="space-y-2">
            <h2 className="text-base font-semibold">{T("الگوهای قاعده‌محور از نقش‌های منبع", "Rule-based patterns from source roles")}</h2>
            {result.ruleFindings.length ? (
              <ul className="space-y-2">
                {result.ruleFindings.map((finding) => <FindingItem key={`${finding.perpetrator}-${finding.victim}-${finding.enzymeId}`} finding={finding} />)}
              </ul>
            ) : (
              <p className="rounded-lg bg-muted/50 p-4 text-sm" data-testid="cyp-checker-no-findings">{T("در این دادهٔ محدود الگوی مهار/القا پیدا نشد؛ این به معنی بی‌خطر بودن نیست.", "No inhibition/induction pattern in this limited dataset; that does not mean the combination is safe.")}</p>
            )}
          </div>
        </div>
      )}
      <PharmacyLeitnerCardDialog draft={cardDraft} onClose={() => setCardDraft(null)} />
    </section>
  );
}

function FindingItem({ finding }: { finding: CypRuleFinding }) {
  const { T } = useBilingual();
  const signal = {
    high: { label: T("سیگنال بالا", "High signal"), className: "border-rose-500/50 bg-rose-500/5" },
    elevated: { label: T("سیگنال متوسط", "Elevated signal"), className: "border-amber-500/40 bg-amber-500/5" },
    note: { label: T("نکته", "Note"), className: "" },
  }[finding.signal];
  const effect = finding.effect === "induction"
    ? T(`${finding.perpetrator} ممکن است مواجهه با ${finding.victim} را کم کند (القای ${finding.enzymeId}).`, `${finding.perpetrator} may lower ${finding.victim} exposure (${finding.enzymeId} induction).`)
    : finding.prodrug
      ? T(`${finding.perpetrator} ممکن است فعال‌سازی پیش‌داروی ${finding.victim} را کم کند (مهار ${finding.enzymeId}).`, `${finding.perpetrator} may reduce activation of the prodrug ${finding.victim} (${finding.enzymeId} inhibition).`)
      : T(`${finding.perpetrator} ممکن است مواجهه با ${finding.victim} را بالا ببرد (مهار ${finding.enzymeId}).`, `${finding.perpetrator} may raise ${finding.victim} exposure (${finding.enzymeId} inhibition).`);
  return (
    <li className={`rounded-lg border p-3 text-sm ${signal.className}`} data-testid="cyp-rule-finding" data-signal={finding.signal}>
      <span className="me-2 inline-block rounded border px-1.5 py-0.5 text-xs font-semibold">{signal.label}</span>
      <span className="leading-relaxed">{effect}</span>
      <span className="mt-1 block text-xs text-muted-foreground">{T("سیگنال فقط از دستهٔ منبع محاسبه شده و شدت بالینی نیست.", "Signal is derived from source categories only; it is not a clinical severity.")}</span>
    </li>
  );
}
