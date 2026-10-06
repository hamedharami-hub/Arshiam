import { AMBIENT_SOUNDS } from "@/lib/ambientSounds";
// Only existing generated sources are offered. Licensed recordings/music are not bundled.
// Keep the larger wellbeing/sleep catalog unchanged outside focus.
export const FOCUS_SOUNDS = AMBIENT_SOUNDS.filter(sound => ["rain", "sleep_pink"].includes(sound.id));
