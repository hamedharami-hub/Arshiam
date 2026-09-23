import { useState, useEffect } from "react";

export type DeviceFormFactor = "phone" | "foldable" | "windows" | "desktop";

export interface DeviceFormFactorInfo {
  formFactor: DeviceFormFactor;
  isWindows: boolean;
  isFoldable: boolean;
  isDesktop: boolean;
  isPhone: boolean;
  isTouch: boolean;
  screenWidth: number;
  screenHeight: number;
  aspectRatio: number;
  prefersDialog: boolean;
  shouldUseBottomSheet: boolean;
}

function detectFormFactor(): DeviceFormFactorInfo {
  if (typeof window === "undefined") {
    return {
      formFactor: "desktop",
      isWindows: true,
      isFoldable: false,
      isDesktop: true,
      isPhone: false,
      isTouch: false,
      screenWidth: 1280,
      screenHeight: 800,
      aspectRatio: 1.6,
      prefersDialog: true,
      shouldUseBottomSheet: false,
    };
  }

  // Check manual override if set
  try {
    const override = localStorage.getItem("arshnaz_nav_mode");
    if (override === "windows" || override === "foldable" || override === "phone" || override === "desktop") {
      const isWin = override === "windows";
      const isFold = override === "foldable";
      const isDesk = override === "windows" || override === "desktop";
      const isPh = override === "phone";
      return {
        formFactor: override,
        isWindows: isWin,
        isFoldable: isFold,
        isDesktop: isDesk,
        isPhone: isPh,
        isTouch: isFold || isPh,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        aspectRatio: window.innerWidth / (window.innerHeight || 1),
        prefersDialog: !isPh,
        shouldUseBottomSheet: isPh,
      };
    }
  } catch {}

  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const platform = typeof navigator !== "undefined" ? (navigator as any).platform || "" : "";
  const isWindowsOS = /Windows|Win32|Win64/i.test(ua) || /Windows/i.test(platform);
  const isTouch = typeof navigator !== "undefined" && (navigator.maxTouchPoints > 0 || "ontouchstart" in window);

  const width = window.innerWidth;
  const height = window.innerHeight || 1;
  const aspectRatio = width / height;

  // 1. Foldable phone hardware checks (dual screen, spanning fold, or known foldable UA)
  const isDualScreen =
    typeof window.matchMedia === "function" &&
    (window.matchMedia("(horizontal-viewport-segments: 2)").matches ||
      window.matchMedia("(vertical-viewport-segments: 2)").matches ||
      window.matchMedia("(spanning: single-fold-vertical)").matches ||
      window.matchMedia("(spanning: single-fold-horizontal)").matches);

  const isFoldableModel = /SM-F[0-9]|Pixel Fold|OnePlus Open|Surface Duo|HUAWEI.*AL[0-9]|Mate X/i.test(ua);

  // Foldable unfolded aspect ratio is squarish (typically 0.75 to 1.4) on medium screen widths (600px to 1024px)
  const isFoldableDimensions =
    isTouch &&
    width >= 600 &&
    width <= 1080 &&
    aspectRatio >= 0.7 &&
    aspectRatio <= 1.45;

  const isFoldableHardware = isDualScreen || (isFoldableModel && width >= 560) || isFoldableDimensions;

  // 2. Windows and Desktop checks:
  // If running on Windows OS, or on desktop browsers with fine pointer and non-phone screen
  const hasFinePointer = typeof window.matchMedia === "function" && window.matchMedia("(pointer: fine)").matches;
  const isDesktopScreen = (isWindowsOS && width >= 700) || (!isTouch && width >= 768) || (hasFinePointer && width >= 800 && !isFoldableHardware);

  let formFactor: DeviceFormFactor;
  if (isFoldableHardware) {
    formFactor = "foldable";
  } else if (isWindowsOS || (isDesktopScreen && !isTouch)) {
    formFactor = isWindowsOS ? "windows" : "desktop";
  } else if (width >= 800) {
    formFactor = "desktop";
  } else {
    formFactor = "phone";
  }

  const isWindows = formFactor === "windows";
  const isFoldable = formFactor === "foldable";
  const isDesktop = formFactor === "windows" || formFactor === "desktop";
  const isPhone = formFactor === "phone";
  const shouldUseBottomSheet = isPhone;
  const prefersDialog = !shouldUseBottomSheet;

  return {
    formFactor,
    isWindows,
    isFoldable,
    isDesktop,
    isPhone,
    isTouch,
    screenWidth: width,
    screenHeight: height,
    aspectRatio,
    prefersDialog,
    shouldUseBottomSheet,
  };
}

export function useDeviceFormFactor(): DeviceFormFactorInfo {
  const [info, setInfo] = useState<DeviceFormFactorInfo>(detectFormFactor);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const update = () => {
      setInfo(detectFormFactor());
    };

    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    const m1 = window.matchMedia?.("(horizontal-viewport-segments: 2)");
    const m2 = window.matchMedia?.("(spanning: single-fold-vertical)");
    const m3 = window.matchMedia?.("(pointer: fine)");

    m1?.addEventListener?.("change", update);
    m2?.addEventListener?.("change", update);
    m3?.addEventListener?.("change", update);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      m1?.removeEventListener?.("change", update);
      m2?.removeEventListener?.("change", update);
      m3?.removeEventListener?.("change", update);
    };
  }, []);

  return info;
}
