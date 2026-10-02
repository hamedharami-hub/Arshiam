import { useSyncExternalStore } from "react";

export type MascotMode = "full" | "calm" | "off";
export type MascotPose = "celebrate" | "tomorrow" | "garden" | "thinking";
export type MascotLook = "blonde" | "brown" | "black";
const LOOK_KEY = "arshnaz-mascot-look";
let fallbackLook: MascotLook = "brown";
const KEY = "arshnaz-mascot-mode";
const CHANGE = "arshnaz-mascot-preference";
let fallbackMode: MascotMode = "full";
export const MASCOT_EVENT = "arshnaz-mascot-moment";
export function getMascotMode(): MascotMode {
  try { const value = localStorage.getItem(KEY); return value === "off" || value === "calm" || value === "full" ? value : fallbackMode; } catch { return fallbackMode; }
}
export function setMascotMode(mode: MascotMode) {
  fallbackMode = mode;
  try { localStorage.setItem(KEY, mode); } catch { /* Storage may be unavailable. */ }
  window.dispatchEvent(new Event(CHANGE));
}
function subscribe(listener: () => void) {
  window.addEventListener(CHANGE, listener);
  window.addEventListener("storage", listener);
  return () => { window.removeEventListener(CHANGE, listener); window.removeEventListener("storage", listener); };
}
export function useMascotMode() { return useSyncExternalStore(subscribe, getMascotMode, () => "off" as MascotMode); }
export function getMascotLook(): MascotLook {
  try { const value = localStorage.getItem(LOOK_KEY); return value === "brown" || value === "black" || value === "blonde" ? value : fallbackLook; } catch { return fallbackLook; }
}
export function setMascotLook(look: MascotLook) {
  fallbackLook = look;
  try { localStorage.setItem(LOOK_KEY, look); } catch { /* Keep the session preference. */ }
  window.dispatchEvent(new Event(CHANGE));
}
export function useMascotLook() { return useSyncExternalStore(subscribe, getMascotLook, () => "brown" as MascotLook); }
export function showMascotMoment(pose: MascotPose) {
  if (typeof window !== "undefined" && getMascotMode() !== "off") window.dispatchEvent(new CustomEvent(MASCOT_EVENT, { detail: pose }));
}
