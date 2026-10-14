// Offline ambient + focus music catalog.
// All sounds are generated in real-time via Web Audio API (see pomodoroSynth.ts).
// No downloads, instant playback, keeps playing in background (Media Session + silent <audio>).
export type SoundCategory = "ambient" | "study" | "meditation" | "sleep" | "relax" | "binaural";

export type AmbientSound = {
  id: string;
  name: string;
  nameEn: string;
  emoji: string;
  category: SoundCategory;
  beta?: boolean;
  hint?: string;
  hintEn?: string;
};

export const AMBIENT_SOUNDS: AmbientSound[] = [
  // Nature ambience
  { id: "rain",   name: "باران",        nameEn: "Rain",        emoji: "🌧️", category: "ambient" },
  { id: "waves",  name: "امواج دریا",   nameEn: "Ocean waves", emoji: "🌊", category: "ambient" },
  { id: "wind",   name: "باد",          nameEn: "Wind",        emoji: "🍃", category: "ambient" },
  { id: "fire",   name: "شومینه",       nameEn: "Fireplace",   emoji: "🔥", category: "ambient" },
  { id: "forest", name: "جنگل",         nameEn: "Forest",      emoji: "🌲", category: "ambient" },
  { id: "cafe",   name: "کافه",         nameEn: "Café",        emoji: "☕", category: "ambient" },

  // Study music (offline synth pads)
  { id: "study_pad", name: "پد مطالعه",  nameEn: "Study pad",  emoji: "📚", category: "study" },
  { id: "dream_pad", name: "رؤیا",       nameEn: "Dream",      emoji: "✨", category: "study" },
  { id: "lofi_pad",  name: "Lo-fi گرم",  nameEn: "Warm Lo-fi", emoji: "🎶", category: "study" },

  // Meditation tracks
  { id: "med_om",       name: "اوم — مدیتیشن", nameEn: "Om — meditation",  emoji: "🕉️", category: "meditation" },
  { id: "med_singing",  name: "کاسه تبتی",     nameEn: "Tibetan bowl",     emoji: "🔔", category: "meditation" },
  { id: "med_drone",    name: "درون آرام",     nameEn: "Calm drone",       emoji: "🪷", category: "meditation" },

  // Sleep
  { id: "sleep_music",       name: "موسیقی خواب ۶۰ ضرب", nameEn: "Sleep music 60 BPM", emoji: "🎹", category: "sleep" },
  { id: "sleep_ocean_music", name: "موسیقی و دریا",      nameEn: "Music + ocean",      emoji: "🌊", category: "sleep" },
  { id: "sleep_rain_music",  name: "موسیقی و باران",     nameEn: "Music + rain",       emoji: "🌧️", category: "sleep" },
  { id: "sleep_pink",        name: "نویز صورتی",         nameEn: "Pink noise",         emoji: "🌸", category: "sleep" },
  { id: "sleep_delta_pink",  name: "دلتا + نویز صورتی",  nameEn: "Delta + pink noise", emoji: "🎧", category: "sleep", beta: true, hint: "آزمایشی؛ اثر استریو به هدفون نیاز دارد، نه اینکه خواب بهتر تضمین شود. برای خواب استفاده از هدفون اجباری نیست؛ صدای کم یا سکوت را انتخاب کن.", hintEn: "Experimental; the stereo effect needs headphones, but better sleep is not guaranteed. Headphones are not required for sleep; choose low volume or silence." },
  { id: "sleep_white",   name: "نویز سفید",      nameEn: "White noise",  emoji: "🌫️", category: "sleep" },
  { id: "sleep_brown",   name: "نویز قهوه‌ای",  nameEn: "Brown noise",  emoji: "🛏️", category: "sleep" },
  { id: "sleep_lullaby", name: "لالایی",         nameEn: "Lullaby",      emoji: "🌙", category: "sleep" },

  // Relaxation
  { id: "calm_pad", name: "آرامش", nameEn: "Calm", emoji: "🧘", category: "relax" },

  // Headphones separate channels for the stereo effect, not a promised mental outcome.
  { id: "binaural_beta", name: "بیت استریو — بتا", nameEn: "Stereo beat — beta", emoji: "🎧", category: "binaural", beta: true, hint: "آزمایشی؛ هدفون فقط برای تفکیک دو کانال؛ بهبود تمرکز تضمین نیست.", hintEn: "Experimental; headphones separate the channels; improved focus is not guaranteed." },
  { id: "binaural_alpha", name: "بیت استریو — آلفا", nameEn: "Stereo beat — alpha", emoji: "🎧", category: "binaural", beta: true, hint: "آزمایشی؛ اثر بر حال یا تمرکز تضمین نیست.", hintEn: "Experimental; effects on mood or focus are not guaranteed." },
  { id: "binaural_theta", name: "بیت استریو — تتا", nameEn: "Stereo beat — theta", emoji: "🎧", category: "binaural", beta: true, hint: "آزمایشی؛ در صورت ناراحتی متوقف کن.", hintEn: "Experimental; stop if uncomfortable." },
  { id: "binaural_theta_deep", name: "بیت استریو — تتای آهسته", nameEn: "Stereo beat — slow theta", emoji: "🎧", category: "binaural", beta: true, hint: "آزمایشی؛ خلسه یا تغییر امواج مغزی تضمین نیست.", hintEn: "Experimental; trance or changes in brain activity are not guaranteed." },
  { id: "binaural_delta", name: "بیت استریو — دلتا", nameEn: "Stereo beat — delta", emoji: "🎧", category: "binaural", beta: true, hint: "آزمایشی؛ خواب عمیق تضمین نیست؛ صدای کم یا سکوت هم انتخاب معتبر است.", hintEn: "Experimental; deep sleep is not guaranteed; low volume or silence are valid choices." },
];

export const SOUND_CATEGORY_META: Record<SoundCategory, { label: string; labelEn: string; emoji: string }> = {
  ambient:    { label: "محیطی",                labelEn: "Ambient",    emoji: "🌿" },
  study:      { label: "مطالعه",               labelEn: "Study",      emoji: "📚" },
  meditation: { label: "مدیتیشن",              labelEn: "Meditation", emoji: "🪷" },
  sleep:      { label: "خواب",                 labelEn: "Sleep",      emoji: "🌙" },
  relax:      { label: "آرامش",                labelEn: "Relax",      emoji: "🧘" },
  binaural:   { label: "بیت‌های استریو (آزمایشی)", labelEn: "Stereo beats (experimental)", emoji: "🎧" },
};
