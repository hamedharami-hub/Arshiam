import { startSynth, stopSynth, setSynthVolume } from "@/lib/pomodoroSynth";
let previewTimer: ReturnType<typeof setTimeout> | null = null;
let owned = false;
export function stopFocusAudio() {
  if (previewTimer) clearTimeout(previewTimer);
  previewTimer = null;
  if (owned) stopSynth();
  owned = false;
}
export function playFocusAudio(id: string, volume: number) {
  if (previewTimer) clearTimeout(previewTimer);
  previewTimer = null;
  if (id === "none") { stopFocusAudio(); return; }
  owned = true;
  try { startSynth(id, volume); setSynthVolume(volume); } catch { owned = false; }
}
export function previewFocusSound(id: string, volume: number) {
  playFocusAudio(id, volume);
  if (id !== "none") previewTimer = setTimeout(stopFocusAudio, 5000);
}
