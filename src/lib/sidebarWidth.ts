import { useCallback, useEffect, useState } from "react";

export const SIDEBAR_STORAGE_WIDTH_KEY = "arshnaz_sidebar_width";
export const SIDEBAR_WIDTH_KEY = SIDEBAR_STORAGE_WIDTH_KEY;
export const SIDEBAR_WIDTH_EVENT = "arshnaz:sidebar-width-changed";

export const DEFAULT_SIDEBAR_WIDTH = 260;
export const SIDEBAR_DEFAULT_WIDTH = DEFAULT_SIDEBAR_WIDTH;
export const MIN_SIDEBAR_WIDTH = 180;
export const SIDEBAR_MIN_WIDTH = MIN_SIDEBAR_WIDTH;
export const MAX_SIDEBAR_WIDTH = 540;
export const SIDEBAR_MAX_WIDTH = MAX_SIDEBAR_WIDTH;

export type SidebarWidthPreset = {
  id: string;
  width: number;
  labelFa: string;
  labelEn: string;
};

export const SIDEBAR_WIDTH_PRESET_MAP = {
  narrow: 220,
  standard: 260,
  wide: 340,
  extraWide: 420,
} as const;

export interface SidebarWidthPresetsList extends Array<SidebarWidthPreset> {
  narrow: number;
  standard: number;
  wide: number;
  extraWide: number;
}

const rawPresets: SidebarWidthPreset[] = [
  { id: "compact", width: 220, labelFa: "باریک (۲۲۰px)", labelEn: "Narrow (220px)" },
  { id: "default", width: 260, labelFa: "استاندارد (۲۶۰px)", labelEn: "Standard (260px)" },
  { id: "wide", width: 340, labelFa: "عریض (۳۴۰px)", labelEn: "Wide (340px)" },
  { id: "extrawide", width: 420, labelFa: "خیلی عریض (۴۲۰px)", labelEn: "Extra Wide (420px)" },
];

export const SIDEBAR_WIDTH_PRESETS = Object.assign(rawPresets, {
  narrow: 220,
  standard: 260,
  wide: 340,
  extraWide: 420,
}) as SidebarWidthPresetsList;

export function clampSidebarWidth(width: number): number {
  if (isNaN(width)) return DEFAULT_SIDEBAR_WIDTH;
  return Math.min(Math.max(Math.round(width), MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH);
}

export function getSidebarWidth(): number {
  if (typeof window === "undefined") return DEFAULT_SIDEBAR_WIDTH;
  try {
    const raw = localStorage.getItem(SIDEBAR_STORAGE_WIDTH_KEY);
    const val = raw ? parseInt(raw, 10) : DEFAULT_SIDEBAR_WIDTH;
    return clampSidebarWidth(val);
  } catch {
    return DEFAULT_SIDEBAR_WIDTH;
  }
}

export function setSidebarWidth(width: number): void {
  const clamped = clampSidebarWidth(width);
  try {
    localStorage.setItem(SIDEBAR_STORAGE_WIDTH_KEY, String(clamped));
  } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SIDEBAR_WIDTH_EVENT, { detail: clamped }));
  }
}

export type SidebarWidthHook = [number, (newWidth: number) => void] & {
  width: number;
  setWidth: (newWidth: number) => void;
};

export function useSidebarWidth(): SidebarWidthHook {
  const [width, setWidthState] = useState<number>(getSidebarWidth);

  useEffect(() => {
    const handleWidthChange = (e: CustomEvent<number>) => {
      if (typeof e.detail === "number" && !isNaN(e.detail)) {
        setWidthState(e.detail);
      }
    };
    window.addEventListener(SIDEBAR_WIDTH_EVENT as any, handleWidthChange);
    return () => window.removeEventListener(SIDEBAR_WIDTH_EVENT as any, handleWidthChange);
  }, []);

  const update = useCallback((newWidth: number) => {
    setSidebarWidth(newWidth);
    setWidthState(clampSidebarWidth(newWidth));
  }, []);

  const result = [width, update] as SidebarWidthHook;
  result.width = width;
  result.setWidth = update;

  return result;
}
