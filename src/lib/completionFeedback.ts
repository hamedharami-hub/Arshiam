import { haptic } from "./haptics";

export type CompletionSoundId =
  | "pop"
  | "ding"
  | "bell"
  | "marimba"
  | "chord"
  | "arcade"
  | "harp";

export type CompletionHapticKind = "selection" | "light" | "medium" | "success";

export type CompletionFeedbackSettings = {
  soundEnabled: boolean;
  soundId: CompletionSoundId;
  hapticEnabled: boolean;
  hapticKind: CompletionHapticKind;
};

export const DEFAULT_COMPLETION_FEEDBACK: CompletionFeedbackSettings = {
  soundEnabled: true,
  soundId: "pop",
  hapticEnabled: true,
  hapticKind: "selection",
};

export const COMPLETION_SOUND_OPTIONS: {
  id: CompletionSoundId;
  labelFa: string;
  labelEn: string;
  emoji: string;
}[] = [
  { id: "pop", labelFa: "پاپ رضایت‌بخش", labelEn: "Crisp Pop", emoji: "🫧" },
  { id: "ding", labelFa: "دینگ موفقیت", labelEn: "Success Ding", emoji: "✨" },
  { id: "bell", labelFa: "زنگوله کریستالی", labelEn: "Crystal Chime", emoji: "🔔" },
  { id: "marimba", labelFa: "ماریمبا چوبی", labelEn: "Warm Marimba", emoji: "🪵" },
  { id: "chord", labelFa: "آکورد جشن", labelEn: "Harmonious Chord", emoji: "🎶" },
  { id: "arcade", labelFa: "آرکید ۸ بیتی", labelEn: "Retro Level-Up", emoji: "🎮" },
  { id: "harp", labelFa: "هارپ ملایم", labelEn: "Soft Harp", emoji: "🪕" },
];

export const COMPLETION_HAPTIC_OPTIONS: {
  id: CompletionHapticKind;
  labelFa: string;
  labelEn: string;
}[] = [
  { id: "selection", labelFa: "تیک بسیار ملایم (Selection)", labelEn: "Subtle (Selection)" },
  { id: "light", labelFa: "لرزش سبک (Light)", labelEn: "Light" },
  { id: "medium", labelFa: "لرزش متوسط (Medium)", labelEn: "Medium" },
  { id: "success", labelFa: "الگوی سه‌گانه موفقیت (Success)", labelEn: "Triple Success Pattern" },
];

const STORAGE_KEY = "arshnaz_completion_feedback_preferences";
const EVENT_NAME = "arshnaz:completion-feedback-settings-changed";

let cachedSettings: CompletionFeedbackSettings | null = null;
let lastPlayedAt = 0;

/**
 * Retrieves the current completion feedback settings from localStorage with fallback.
 */
export function getCompletionFeedbackSettings(): CompletionFeedbackSettings {
  if (cachedSettings) return cachedSettings;
  if (typeof window === "undefined") return DEFAULT_COMPLETION_FEEDBACK;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      cachedSettings = {
        soundEnabled: typeof parsed.soundEnabled === "boolean" ? parsed.soundEnabled : DEFAULT_COMPLETION_FEEDBACK.soundEnabled,
        soundId: parsed.soundId || DEFAULT_COMPLETION_FEEDBACK.soundId,
        hapticEnabled: typeof parsed.hapticEnabled === "boolean" ? parsed.hapticEnabled : DEFAULT_COMPLETION_FEEDBACK.hapticEnabled,
        hapticKind: parsed.hapticKind || DEFAULT_COMPLETION_FEEDBACK.hapticKind,
      };
      return cachedSettings;
    }
  } catch {
    // ignore json parse errors
  }

  cachedSettings = { ...DEFAULT_COMPLETION_FEEDBACK };
  return cachedSettings;
}

/**
 * Updates completion feedback settings in localStorage and notifies subscribers.
 */
export function setCompletionFeedbackSettings(patch: Partial<CompletionFeedbackSettings>): CompletionFeedbackSettings {
  const current = getCompletionFeedbackSettings();
  const next: CompletionFeedbackSettings = {
    ...current,
    ...patch,
  };

  cachedSettings = next;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }));
    } catch {
      // ignore storage errors
    }
  }
  return next;
}

/**
 * Shared AudioContext singleton for zero-latency audio synthesis.
 */
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;

  try {
    if (!audioCtx || audioCtx.state === "closed") {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Synthesizes a completion tone with customized harmonics and envelopes.
 */
export function playCompletionSound(soundId: CompletionSoundId = "pop"): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  try {
    switch (soundId) {
      case "pop": {
        // High-speed frequency chirp (360Hz -> 840Hz) with fast exponential decay
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(360, now);
        osc.frequency.exponentialRampToValueAtTime(840, now + 0.04);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.28, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
        break;
      }

      case "ding": {
        // High bell-like crystal ding (E6 / 1318Hz + harmonic)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(1318.5, now);
        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(2637, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.4);
        osc2.stop(now + 0.4);
        break;
      }

      case "bell": {
        // Dual-tone harmonic chime (C6 -> G6)
        const tone1 = (freq: number, startDelay: number, dur: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const t0 = now + startDelay;
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, t0);

          gain.gain.setValueAtTime(0.001, t0);
          gain.gain.linearRampToValueAtTime(0.2, t0 + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

          osc.connect(gain).connect(ctx.destination);
          osc.start(t0);
          osc.stop(t0 + dur + 0.05);
        };
        tone1(1046.5, 0, 0.32); // C6
        tone1(1567.98, 0.06, 0.45); // G6
        break;
      }

      case "marimba": {
        // Warm resonant wooden acoustic strike
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.32, now + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      }

      case "chord": {
        // Ascending major chord triad (C5 - E5 - G5)
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const t0 = now + idx * 0.045;
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, t0);

          gain.gain.setValueAtTime(0.001, t0);
          gain.gain.linearRampToValueAtTime(0.18, t0 + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32);

          osc.connect(gain).connect(ctx.destination);
          osc.start(t0);
          osc.stop(t0 + 0.35);
        });
        break;
      }

      case "arcade": {
        // Retro 8-bit jump sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(659.25, now + 0.035);
        osc.frequency.setValueAtTime(880, now + 0.07);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.14, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }

      case "harp": {
        // Soft ascending harp flourish
        const harpNotes = [587.33, 739.99, 880, 1174.66]; // D5, F#5, A5, D6
        harpNotes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const t0 = now + idx * 0.032;
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, t0);

          gain.gain.setValueAtTime(0.001, t0);
          gain.gain.linearRampToValueAtTime(0.16, t0 + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.38);

          osc.connect(gain).connect(ctx.destination);
          osc.start(t0);
          osc.stop(t0 + 0.4);
        });
        break;
      }
    }
  } catch {
    // safely ignore any synthesis errors
  }
}

/**
 * Triggers completion feedback (sound and/or vibration) based on user preferences.
 * Includes a 40ms debounce to prevent double-firing when multiple events synchronize.
 */
export function playCompletionFeedback(): void {
  const now = Date.now();
  if (now - lastPlayedAt < 40) return;
  lastPlayedAt = now;

  const settings = getCompletionFeedbackSettings();

  // 1. Vibration / Haptics
  if (settings.hapticEnabled) {
    try {
      haptic(settings.hapticKind || "selection");
    } catch {
      // ignore haptic errors
    }
  }

  // 2. Sound synthesis
  if (settings.soundEnabled) {
    try {
      playCompletionSound(settings.soundId || "pop");
    } catch {
      // ignore audio errors
    }
  }
}

/**
 * Auditions a specific completion sound (used in settings and widget customization).
 */
export function previewCompletionSound(soundId: CompletionSoundId, alsoVibrate = true): void {
  if (alsoVibrate) {
    try {
      const settings = getCompletionFeedbackSettings();
      haptic(settings.hapticKind || "selection");
    } catch {}
  }
  playCompletionSound(soundId);
}
