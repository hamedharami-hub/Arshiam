import { lazy, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { isPathAllowed, useModules } from "@/lib/appModules";

const NotFound = lazy(() => import("@/pages/NotFound"));

/** Routes of a module that is not installed behave exactly like pages that don't exist. */
export function ModuleGatedOutlet() {
  const { pathname } = useLocation();
  const modules = useModules();
  if (isPathAllowed(pathname, modules)) return <Outlet />;
  if (!modules.ready) return <div className="min-h-[40vh]" data-testid="module-gate-loading" />;
  return (
    <Suspense fallback={null}>
      <NotFound />
    </Suspense>
  );
}
