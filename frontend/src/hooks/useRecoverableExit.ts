import { useContext, useEffect, useRef } from "react";
import { UNSAFE_NavigationContext, type To } from "react-router-dom";

/** BrowserRouter has no data-router blocker. Guard its navigator and native POPs.
 * Read refs at exit time: a draft may become durable without another render.
 */
export function useRecoverableExit(atRisk: () => boolean, message: string) {
  const { navigator } = useContext(UNSAFE_NavigationContext);
  const latest = useRef({ atRisk, message });
  latest.current = { atRisk, message };
  useEffect(() => {
    const allow = () => !latest.current.atRisk() || window.confirm(latest.current.message);
    const push = navigator.push;
    const replace = navigator.replace;
    const go = navigator.go;
    let currentPath = window.location.pathname;
    const allowTarget = (to: To) => {
      // Search/hash changes on the same editor are state updates, not departures.
      const targetPath = new URL(navigator.createHref(to), window.location.href).pathname;
      return targetPath === currentPath || allow();
    };
    let index = window.history.state?.idx as number | undefined;
    let restoring = false;
    const guardedPush: typeof push = (...args) => {
      if (allowTarget(args[0])) { push.apply(navigator, args); index = window.history.state?.idx; currentPath = window.location.pathname; }
    };
    const guardedReplace: typeof replace = (...args) => {
      if (allowTarget(args[0])) { replace.apply(navigator, args); index = window.history.state?.idx; currentPath = window.location.pathname; }
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
      if (window.location.pathname !== currentPath && !allow() && typeof index === "number" && typeof nextIndex === "number" && index !== nextIndex) {
        event.stopImmediatePropagation();
        restoring = true;
        go.call(navigator, index - nextIndex);
      } else { index = nextIndex; currentPath = window.location.pathname; }
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
