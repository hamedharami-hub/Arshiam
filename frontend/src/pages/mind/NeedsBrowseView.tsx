import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { useBilingual } from "@/hooks/useBilingual";
import { Back, NEEDS_ICONS, PackSection, SafetyNotice } from "@/components/needs/NeedsBits";
import { getCategory, getTopic } from "@/lib/needs/tree";

/** /app/mind/needs/:cat/:topic?  — topics of a category, or the ready-made pack of a topic. */
export default function NeedsBrowseView() {
  const { cat, topic } = useParams();
  const { T, isEn } = useBilingual();
  const navigate = useNavigate();
  const c = getCategory(cat);
  const t = getTopic(cat, topic);
  const Chev = isEn ? ChevronRight : ChevronLeft;
  const L = (b?: { fa: string; en: string }) => (b ? (isEn ? b.en : b.fa) : "");

  if (!c || (topic && !t)) {
    return (
      <div dir={isEn ? "ltr" : "rtl"} className="page-shell page-shell--lg space-y-4" data-testid="needs-notfound">
        <Back to="/app/mind" label={T("ذهن", "Mind")} />
        <p className="text-sm text-muted-foreground">{T("این موضوع پیدا نشد.", "That topic was not found.")}</p>
      </div>
    );
  }
  const Icon = NEEDS_ICONS[c.icon];

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="page-shell page-shell--lg space-y-5 pb-28 animate-fade-in" data-testid="needs-browse">
      <HeaderTitlePortal title={L(t?.title ?? c.title)} />
      <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground" aria-label="breadcrumb" data-testid="needs-crumbs">
        <Link to="/app/mind" className="hover:text-foreground">{T("ذهن", "Mind")}</Link><Chev className="h-3 w-3" />
        {t ? <Link to={`/app/mind/needs/${c.id}`} className="hover:text-foreground">{L(c.title)}</Link> : <span className="font-semibold text-foreground">{L(c.title)}</span>}
        {t && (<><Chev className="h-3 w-3" /><span className="font-semibold text-foreground">{L(t.title)}</span></>)}
      </nav>

      {!t && (
        <>
          <header className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[hsl(var(--rose-gold)/0.12)] text-[hsl(var(--rose-gold))]"><Icon className="h-6 w-6" strokeWidth={1.5} /></span>
            <div><h1 className="text-lg font-bold">{L(c.title)}</h1><p className="text-xs text-muted-foreground">{L(c.desc)}</p></div>
          </header>
          <div className="grid gap-2.5 sm:grid-cols-2" data-testid="needs-topics">
            {c.topics.map((tp) => (
              <Link key={tp.id} to={`/app/mind/needs/${c.id}/${tp.id}`} data-testid={`needs-topic-${tp.id}`} className="surface-card flex items-center gap-3 p-3.5 transition hover:border-[hsl(var(--rose-gold)/0.6)]">
                <span className="min-w-0 flex-1 text-sm font-semibold">{L(tp.title)}</span>
                <Chev className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
          <button type="button" onClick={() => navigate(`/app/mind/session/new?cat=${c.id}`)} className="text-sm font-medium text-primary hover:underline" data-testid="needs-other-topic">
            {T("موضوعم این‌جا نیست — می‌خواهم مستقیم بنویسم", "My topic isn't here — I'd rather just write")}
          </button>
        </>
      )}

      {t && (
        <>
          <header><h1 className="text-lg font-bold">{L(t.title)}</h1></header>
          {t.sensitive && <SafetyNotice />}
          {t.details && (
            <section className="space-y-2" data-testid="needs-details">
              <h3 className="text-sm font-bold">{T("کدام بیشتر شبیه توست؟", "Which sounds closest?")}</h3>
              <div className="flex flex-wrap gap-2">
                {t.details.map((d) => (
                  <Link key={d.id} to={`/app/mind/session/new?cat=${c.id}&topic=${t.id}&detail=${d.id}`} data-testid={`needs-detail-${d.id}`} className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium hover:border-[hsl(var(--rose-gold)/0.7)]">{L(d.title)}</Link>
                ))}
              </div>
            </section>
          )}
          <Link to={`/app/mind/session/new?cat=${c.id}&topic=${t.id}`} data-testid="needs-start" className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90">
            {T("می‌خواهم درباره‌اش بنویسم و راهنمایی بگیرم", "Write about it and get guidance")}
          </Link>
          <PackSection methods={t.methods} checks={t.checks} tools={t.tools} />
        </>
      )}
    </div>
  );
}
