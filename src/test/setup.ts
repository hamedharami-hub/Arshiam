import "@testing-library/jest-dom";
import { MODULE_IDS, setModulesState } from "@/lib/appModules";

// Existing suites exercise every section; module-gating tests reset this explicitly.
setModulesState({ unlocked: MODULE_IDS, installed: MODULE_IDS });

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
