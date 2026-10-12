import { lazy, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { isPathAllowed, useModules } from "@/lib/appModules";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useBilingual } from "@/hooks/useBilingual";

const NotFound = lazy(() => import("@/pages/NotFound"));

/** Routes of a module that is not installed behave exactly like pages that don't exist. */
export function ModuleGatedOutlet() {
  const { pathname } = useLocation();
  const modules = useModules();
  const { T } = useBilingual();
  // Keep the authenticated shell and navigation alive while a lazy page loads
  // or fails. Query-only editor changes must not remount the page boundary.
  if (isPathAllowed(pathname, modules)) return (
    <ErrorBoundary key={pathname}>
      <Suspense fallback={<div role="status" className="grid min-h-[40vh] place-items-center text-sm text-muted-foreground">{T("در حال بارگذاری صفحه…", "Loading page…")}</div>}>
        <Outlet />
      </Suspense>
    </ErrorBoundary>
  );
  if (!modules.ready) return <div className="min-h-[40vh]" data-testid="module-gate-loading" />;
  return (
    <Suspense fallback={null}>
      <NotFound />
    </Suspense>
  );
}
