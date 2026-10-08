import { useState, useEffect, useCallback } from "react";
import i18n, { isRTL } from "@/i18n";

// The stored value is the Persian (RTL) layout; the English (LTR) layout mirrors it so the sidebar stays at the reading start.
const isLtr = () => !isRTL(i18n.language || "fa");
const flip = (p: "right" | "left"): "right" | "left" => (p === "right" ? "left" : "right");

export type SidebarPosition = "right" | "left";

export const SIDEBAR_POSITION_STORAGE_KEY = "arshnaz_sidebar_position";
export const SIDEBAR_POSITION_EVENT = "arshnaz:sidebar-position-changed";

/** Local storage is canonicalized to the RTL side so the layout mirrors in LTR. */
function toStoredSidebarPosition(pos: SidebarPosition): SidebarPosition {
  return isLtr() ? flip(pos) : pos;
}

/** Cloud settings predate canonical storage and contain the visible physical side. */
export function hydrateSidebarPositionFromCloud(pos?: SidebarPosition | null): void {
  if (pos === "left" || pos === "right") setSidebarPosition(pos);
}

export function getSidebarPosition(): SidebarPosition {
  if (typeof window === "undefined") return "right";
  try {
    const val = localStorage.getItem(SIDEBAR_POSITION_STORAGE_KEY);
    const stored: SidebarPosition = val === "left" || val === "right" ? val : "right";
    return isLtr() ? flip(stored) : stored;
  } catch {
    // ignore
  }
  return isLtr() ? "left" : "right";
}

export function setSidebarPosition(pos: SidebarPosition): void {
  try {
    localStorage.setItem(SIDEBAR_POSITION_STORAGE_KEY, toStoredSidebarPosition(pos));
  } catch {
    // ignore
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SIDEBAR_POSITION_EVENT, { detail: pos }));
  }
}

export function useSidebarPosition(): {
  sidebarPosition: SidebarPosition;
  setSidebarPosition: (pos: SidebarPosition) => void;
} {
  const [position, setPositionState] = useState<SidebarPosition>(() => getSidebarPosition());

  useEffect(() => {
    const handleCustomEvent = (e: Event) => {
      const custom = e as CustomEvent<SidebarPosition>;
      if (custom.detail === "left" || custom.detail === "right") {
        setPositionState(custom.detail);
      } else {
        setPositionState(getSidebarPosition());
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === SIDEBAR_POSITION_STORAGE_KEY) {
        setPositionState(getSidebarPosition());
      }
    };

    const handleLanguage = () => setPositionState(getSidebarPosition());
    window.addEventListener(SIDEBAR_POSITION_EVENT, handleCustomEvent);
    window.addEventListener("storage", handleStorage);
    i18n.on("languageChanged", handleLanguage);
    return () => {
      i18n.off("languageChanged", handleLanguage);
      window.removeEventListener(SIDEBAR_POSITION_EVENT, handleCustomEvent);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const updatePosition = useCallback((newPos: SidebarPosition) => {
    setPositionState(newPos);
    setSidebarPosition(newPos);
  }, []);

  return {
    sidebarPosition: position,
    setSidebarPosition: updatePosition,
  };
}
