import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Link, useInRouterContext } from "react-router-dom";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { useBilingual } from "@/hooks/useBilingual";

interface Props { icon: LucideIcon; title: string; description: string; aside?: ReactNode }

export function PharmacyPageHeader({ icon: Icon, title, description, aside }: Props) {
  const { T } = useBilingual();
  const inRouter = useInRouterContext();
  const homeProps = { className: "text-primary hover:underline", "data-testid": "pharmacy-breadcrumb-home" };
  return <header className="space-y-2" data-testid="pharmacy-page-header">
    <HeaderTitlePortal title={title} />
    <nav aria-label={T("مسیر", "Breadcrumb")} className="text-xs text-muted-foreground">
      {inRouter ? <Link to="/app/pharmacy" {...homeProps}>{T("فارماسی", "Pharmacy")}</Link> : <a href="/app/pharmacy" {...homeProps}>{T("فارماسی", "Pharmacy")}</a>}
      <span aria-hidden="true" className="mx-1.5">/</span><span>{title}</span>
    </nav>
    <div className="flex flex-wrap items-start gap-3 rounded-xl border bg-card p-4">
      <div className="rounded-xl bg-primary/10 p-3 text-primary" aria-hidden="true"><Icon className="h-6 w-6" /></div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="text-base font-semibold leading-snug sm:text-lg">{title}</div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {aside}
    </div>
  </header>;
}
