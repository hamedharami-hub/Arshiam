// Offline ambient + focus music engine using Web Audio API.
// No downloads, no buffering — starts instantly on the first user gesture.

let ctx: AudioContext | null = null;
const getCtx = () => {
  if (!ctx) {
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
};

type NoiseColor = "white" | "pink" | "brown";
function noiseBuffer(c: AudioContext, seconds = 4, color: NoiseColor = "pink"): AudioBuffer {
  const len = c.sampleRate * seconds;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  if (color === "white") {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  } else if (color === "pink") {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else {
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
  }
  return buf;
}

type Voice = { stop: () => void };

function rain(c: AudioContext, m: GainNode): Voice {
  const src = c.createBufferSource(); src.buffer = noiseBuffer(c, 4, "pink"); src.loop = true;
  const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 600;
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 4500;
  src.connect(hp); hp.connect(lp); lp.connect(m); src.start();
  return { stop: () => { try { src.stop(); } catch {} } };
}

function waves(c: AudioContext, m: GainNode): Voice {
  const src = c.createBufferSource(); src.buffer = noiseBuffer(c, 6, "brown"); src.loop = true;
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
  const g = c.createGain(); g.gain.value = 0.5;
  // slow swell LFO
  const lfo = c.createOscillator(); lfo.frequency.value = 0.12;
  const lfoG = c.createGain(); lfoG.gain.value = 0.45;
  lfo.connect(lfoG); lfoG.connect(g.gain);
  src.connect(lp); lp.connect(g); g.connect(m);
  src.start(); lfo.start();
  return { stop: () => { try { src.stop(); lfo.stop(); } catch {} } };
}

function wind(c: AudioContext, m: GainNode): Voice {
  const src = c.createBufferSource(); src.buffer = noiseBuffer(c, 4, "white"); src.loop = true;
  const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 700; bp.Q.value = 0.6;
  const lfo = c.createOscillator(); lfo.frequency.value = 0.08;
  const lfoG = c.createGain(); lfoG.gain.value = 350;
  lfo.connect(lfoG); lfoG.connect(bp.frequency);
  src.connect(bp); bp.connect(m);
  src.start(); lfo.start();
  return { stop: () => { try { src.stop(); lfo.stop(); } catch {} } };
}

function fire(c: AudioContext, m: GainNode): Voice {
  const src = c.createBufferSource(); src.buffer = noiseBuffer(c, 3, "white"); src.loop = true;
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2200;
  const g = c.createGain(); g.gain.value = 0.4;
  src.connect(lp); lp.connect(g); g.connect(m); src.start();
  const id = window.setInterval(() => {
    const t = c.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.4, t);
    g.gain.linearRampToValueAtTime(1.1, t + 0.025);
    g.gain.linearRampToValueAtTime(0.4, t + 0.12);
  }, 500 + Math.random() * 700);
  return { stop: () => { clearInterval(id); try { src.stop(); } catch {} } };
}

function forest(c: AudioContext, m: GainNode): Voice {
  const w = wind(c, m);
  const id = window.setInterval(() => {
    const t = c.currentTime;
    const o = c.createOscillator(); o.type = "sine";
    const f0 = 1700 + Math.random() * 1400;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * (1 + Math.random() * 0.3), t + 0.12);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.07, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g); g.connect(m);
    o.start(t); o.stop(t + 0.2);
  }, 1400 + Math.random() * 2400);
  return { stop: () => { clearInterval(id); w.stop(); } };
}

function cafe(c: AudioContext, m: GainNode): Voice {
  const src = c.createBufferSource(); src.buffer = noiseBuffer(c, 4, "pink"); src.loop = true;
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1100;
  const g = c.createGain(); g.gain.value = 0.55;
  src.connect(lp); lp.connect(g); g.connect(m); src.start();
  return { stop: () => { try { src.stop(); } catch {} } };
}

function pad(c: AudioContext, m: GainNode, freqs: number[], type: OscillatorType = "sine", detune = 5): Voice {
  const oscs: OscillatorNode[] = [];
  const lfo = c.createOscillator(); lfo.frequency.value = 0.06;
  const lfoG = c.createGain(); lfoG.gain.value = 0.04;
  lfo.connect(lfoG);
  freqs.forEach((f) => {
    [-detune, detune].forEach((d) => {
      const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = d;
      const g = c.createGain(); g.gain.value = 0.07 / freqs.length;
      lfoG.connect(g.gain);
      o.connect(g); g.connect(m); o.start();
      oscs.push(o);
    });
  });
  lfo.start();
  return { stop: () => { try { oscs.forEach(o => o.stop()); lfo.stop(); } catch {} } };
}

const studyPad = (c: AudioContext, m: GainNode) =>
  pad(c, m, [261.63, 329.63, 392.0, 493.88, 587.33], "sine", 5); // Cmaj9
const dreamPad = (c: AudioContext, m: GainNode) =>
  pad(c, m, [349.23, 440.0, 523.25, 659.25], "triangle", 3);     // Fmaj7
const calmPad = (c: AudioContext, m: GainNode) =>
  pad(c, m, [220.0, 261.63, 329.63, 392.0], "sine", 4);          // Am7
const lofiPad = (c: AudioContext, m: GainNode) =>
  pad(c, m, [196.0, 246.94, 293.66, 369.99], "sawtooth", 8);     // Gmaj-ish, warmer

// Binaural beats — for HEADPHONES ONLY. L/R panned different freq → brain perceives the diff.
function binaural(c: AudioContext, m: GainNode, base: number, beat: number): Voice {
  const merger = c.createChannelMerger(2);
  const oL = c.createOscillator(); oL.type = "sine"; oL.frequency.value = base;
  const oR = c.createOscillator(); oR.type = "sine"; oR.frequency.value = base + beat;
  const gL = c.createGain(); gL.gain.value = 0.18;
  const gR = c.createGain(); gR.gain.value = 0.18;
  oL.connect(gL); gL.connect(merger, 0, 0);
  oR.connect(gR); gR.connect(merger, 0, 1);
  merger.connect(m);
  oL.start(); oR.start();
  return { stop: () => { try { oL.stop(); oR.stop(); } catch {} } };
}

// Meditation: Om-like sustained drone (low fundamentals + harmonic stack)
const medOm = (c: AudioContext, m: GainNode) =>
  pad(c, m, [110, 165, 220, 330], "sine", 2);
// Tibetan singing bowl: bell-ish overtones, very slow LFO
const medSinging = (c: AudioContext, m: GainNode) =>
  pad(c, m, [196, 293.66, 392, 587.33, 783.99], "triangle", 2);
const medDrone = (c: AudioContext, m: GainNode) =>
  pad(c, m, [82.4, 110, 164.8], "sine", 1);

// Sleep
function sleepWhite(c: AudioContext, m: GainNode): Voice {
  const src = c.createBufferSource(); src.buffer = noiseBuffer(c, 4, "white"); src.loop = true;
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 6000;
  const g = c.createGain(); g.gain.value = 0.35;
  src.connect(lp); lp.connect(g); g.connect(m); src.start();
  return { stop: () => { try { src.stop(); } catch {} } };
}
function sleepBrown(c: AudioContext, m: GainNode): Voice {
  const src = c.createBufferSource(); src.buffer = noiseBuffer(c, 6, "brown"); src.loop = true;
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700;
  const g = c.createGain(); g.gain.value = 0.55;
  src.connect(lp); lp.connect(g); g.connect(m); src.start();
  return { stop: () => { try { src.stop(); } catch {} } };
}
const sleepLullaby = (c: AudioContext, m: GainNode) =>
  pad(c, m, [130.81, 196, 261.63, 329.63], "sine", 3);

type Factory = (c: AudioContext, m: GainNode) => Voice;
const FACTORIES: Record<string, Factory> = {
  rain, waves, wind, fire, forest, cafe,
  study_pad: studyPad,
  dream_pad: dreamPad,
  calm_pad: calmPad,
  lofi_pad: lofiPad,
  med_om: medOm,
  med_singing: medSinging,
  med_drone: medDrone,
  sleep_white: sleepWhite,
  sleep_brown: sleepBrown,
  sleep_lullaby: sleepLullaby,
  binaural_beta:       (c, m) => binaural(c, m, 200, 16),
  binaural_alpha:      (c, m) => binaural(c, m, 200, 10),
  binaural_theta:      (c, m) => binaural(c, m, 200, 6),
  binaural_theta_deep: (c, m) => binaural(c, m, 150, 4.5),
  binaural_delta:      (c, m) => binaural(c, m, 150, 2.5),
};

let active: Voice | null = null;
let activeId: string | null = null;
let masterGain: GainNode | null = null;

// --- Background-keepalive: a silent <audio> element + Media Session.
// Browsers (esp. mobile Safari/Chrome) suspend AudioContexts when the tab is
// hidden, but a playing <audio> element keeps the audio session active.
let bgAudio: HTMLAudioElement | null = null;
function ensureBackgroundKeepalive() {
  if (bgAudio) return;
  // 0.5s of silent WAV data, base64-encoded (44.1kHz mono).
  const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";
  const a = document.createElement("audio");
  a.src = SILENT_WAV;
  a.loop = true;
  a.volume = 0.0001;        // effectively silent but counts as "playing"
  a.preload = "auto";
  a.setAttribute("playsinline", "true");
  a.style.display = "none";
  document.body.appendChild(a);
  bgAudio = a;
  try {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: "Focus Mode",
        artist: "ARSHNAZ",
        album: "Pomodoro Ambient",
      });
      navigator.mediaSession.setActionHandler?.("play", () => { /* noop */ });
      navigator.mediaSession.setActionHandler?.("pause", () => stopSynth());
      navigator.mediaSession.setActionHandler?.("stop", () => stopSynth());
    }
  } catch { /* ignore */ }
}
function stopBackgroundKeepalive() {
  try { bgAudio?.pause(); } catch {}
}

export function startSynth(id: string, volumePct: number) {
  if (!id || id === "none" || !FACTORIES[id]) { stopSynth(); return; }
  const c = getCtx();
  if (activeId === id && active && masterGain) {
    setSynthVolume(volumePct);
    return;
  }
  stopSynth();
  ensureBackgroundKeepalive();
  try { bgAudio?.play().catch(() => {}); } catch {}
  masterGain = c.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(c.destination);
  active = FACTORIES[id](c, masterGain);
  activeId = id;
  // smooth fade-in
  const v = Math.max(0, Math.min(1, volumePct / 100));
  masterGain.gain.setTargetAtTime(v, c.currentTime, 0.08);
}

export function stopSynth() {
  if (masterGain && ctx) {
    const t = ctx.currentTime;
    try { masterGain.gain.cancelScheduledValues(t); masterGain.gain.setTargetAtTime(0, t, 0.05); } catch {}
  }
  const a = active, mg = masterGain;
  active = null; masterGain = null; activeId = null;
  window.setTimeout(() => {
    try { a?.stop(); } catch {}
    try { mg?.disconnect(); } catch {}
  }, 200);
  stopBackgroundKeepalive();
}

export function setSynthVolume(volumePct: number) {
  if (!masterGain || !ctx) return;
  const v = Math.max(0, Math.min(1, volumePct / 100));
  masterGain.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
}

export function isSynthActive() { return !!activeId; }
