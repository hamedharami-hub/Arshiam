import { useContext, useEffect, useRef } from "react";
import { UNSAFE_NavigationContext, type To } from "react-router-dom";

/** BrowserRouter has no data-router blocker. Guard its navigator and native POPs.
 * Read refs at exit time: a draft may become durable without another render.
 */
export function useRecoverableExit(atRisk: () => boolean, message: string, options: { watchSearch?: boolean } = {}) {
  const { navigator } = useContext(UNSAFE_NavigationContext);
  const latest = useRef({ atRisk, message, watchSearch: options.watchSearch });
  latest.current = { atRisk, message, watchSearch: options.watchSearch };
  useEffect(() => {
    const allow = () => !latest.current.atRisk() || window.confirm(latest.current.message);
    const push = navigator.push;
    const replace = navigator.replace;
    const go = navigator.go;
    const path = () => window.location.pathname + (latest.current.watchSearch ? window.location.search : "");
    let currentPath = path();
    const allowTarget = (to: To) => {
      // Search/hash changes on the same editor are state updates, not departures.
      const target = new URL(navigator.createHref(to), window.location.href);
      const targetPath = target.pathname + (latest.current.watchSearch ? target.search : "");
      return targetPath === currentPath || allow();
    };
    let index = window.history.state?.idx as number | undefined;
    let restoring = false;
    const guardedPush: typeof push = (...args) => {
      if (allowTarget(args[0])) { push.apply(navigator, args); index = window.history.state?.idx; currentPath = path(); }
    };
    const guardedReplace: typeof replace = (...args) => {
      if (allowTarget(args[0])) { replace.apply(navigator, args); index = window.history.state?.idx; currentPath = path(); }
    };
    // POP is guarded by the capture listener, including navigator.go/back.
    navigator.push = guardedPush;
    navigator.replace = guardedReplace;
    const pop = (event: PopStateEvent) => {
      const nextIndex = event.state?.idx as number | undefined;
      if (restoring) {
        restoring = false;
        event.stopImmediatePropagation();
        return;
      }
      if (path() !== currentPath && !allow() && typeof index === "number" && typeof nextIndex === "number" && index !== nextIndex) {
        event.stopImmediatePropagation();
        restoring = true;
        go.call(navigator, index - nextIndex);
      } else { index = nextIndex; currentPath = path(); }
    };
    const unload = (event: BeforeUnloadEvent) => {
      if (!latest.current.atRisk()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("popstate", pop, true);
    window.addEventListener("beforeunload", unload);
    return () => {
      if (navigator.push === guardedPush) navigator.push = push;
      if (navigator.replace === guardedReplace) navigator.replace = replace;
      window.removeEventListener("popstate", pop, true);
      window.removeEventListener("beforeunload", unload);
    };
  }, [navigator]);
}
