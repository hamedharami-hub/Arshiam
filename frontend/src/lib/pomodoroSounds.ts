// Pomodoro end-bell sounds (synth via WebAudio so no external assets needed)
// + re-export of ambient sounds for the in-session background.

export type EndBellId = "bell" | "chime" | "none";

export const END_BELLS: { id: EndBellId; name: string; nameEn: string; emoji: string }[] = [
  { id: "bell",    name: "زنگ آرام",      nameEn: "Soft bell", emoji: "🔔" },
  { id: "chime",   name: "زنگوله ملایم",  nameEn: "Soft chime",   emoji: "🎐" },
  { id: "none",    name: "بی‌صدا",        nameEn: "Silent",       emoji: "🔇" },
];

let _ctx: AudioContext | null = null;
function ctx(): AudioContext {
  if (!_ctx) _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (_ctx.state === "suspended") _ctx.resume().catch(() => {});
  return _ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", gain = 0.25, delay = 0) {
  const c = ctx();
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.07, dur * 0.2));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export function playEndBell(id: EndBellId, volumePct = 100) {
  if (id === "none" || volumePct <= 0) return;
  const volume = Math.max(0, Math.min(1, volumePct / 100));
  try {
    if (id === "bell") {
      tone(880, 1.0, "sine", 0.22 * volume);
      tone(1320, 0.8, "sine", 0.10 * volume, 0.06);
    } else if (id === "chime") {
      tone(1046, 0.9, "sine", 0.14 * volume);
      tone(1318, 0.9, "sine", 0.11 * volume, 0.20);
      tone(1568, 1.1, "sine", 0.10 * volume, 0.40);
    }
  } catch (e) {
    /* ignore */
  }
}
