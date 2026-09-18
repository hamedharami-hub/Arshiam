import { useState, useEffect, useCallback } from "react";

export type SidebarPosition = "right" | "left";

export const SIDEBAR_POSITION_STORAGE_KEY = "arshnaz_sidebar_position";
export const SIDEBAR_POSITION_EVENT = "arshnaz:sidebar-position-changed";

export function getSidebarPosition(): SidebarPosition {
  if (typeof window === "undefined") return "right";
  try {
    const val = localStorage.getItem(SIDEBAR_POSITION_STORAGE_KEY);
    if (val === "left" || val === "right") return val;
  } catch {
    // ignore
  }
  return "right";
}

export function setSidebarPosition(pos: SidebarPosition): void {
  try {
    localStorage.setItem(SIDEBAR_POSITION_STORAGE_KEY, pos);
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

    window.addEventListener(SIDEBAR_POSITION_EVENT, handleCustomEvent);
    window.addEventListener("storage", handleStorage);
    return () => {
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
