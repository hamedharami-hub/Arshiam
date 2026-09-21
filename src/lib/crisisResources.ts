export type SupportRegion = "au" | "ir" | "us" | "international";

export interface CrisisResource {
  id: string;
  name: string;
  name_en: string;
  description: string;
  description_en: string;
  phone: string; // Sanitized digits for tel: link, e.g. "000", "131114"
  displayPhone: string; // Formatted number for UI, e.g. "000", "13 11 14"
  available: string;
  available_en: string;
  sms?: string; // Digits for sms: link if applicable
  url?: string;
  isEmergency?: boolean; // Highlighted for imminent life danger
}

export interface SupportRegionMeta {
  code: SupportRegion;
  label: string;
  label_en: string;
  flag: string;
  emergencyNumber: string;
}

export const SUPPORT_REGIONS: SupportRegionMeta[] = [
  { code: "au", label: "استرالیا", label_en: "Australia", flag: "🇦🇺", emergencyNumber: "000" },
  { code: "ir", label: "ایران", label_en: "Iran", flag: "🇮🇷", emergencyNumber: "115 / 123" },
  { code: "us", label: "ایالات متحده و کانادا", label_en: "United States & Canada", flag: "🇺🇸", emergencyNumber: "911 / 988" },
  { code: "international", label: "بین‌المللی / سایر", label_en: "International / Other", flag: "🌐", emergencyNumber: "112" },
];

export const REGIONAL_CRISIS_RESOURCES: Record<SupportRegion, CrisisResource[]> = {
  au: [
    {
      id: "au-triple-zero",
      name: "خدمات اورژانس استرالیا (پلیس، آمبولانس، آتش‌نشانی)",
      name_en: "Emergency Services (Triple Zero)",
      description: "برای شرایط خطر فوری جانی یا تهدید مستقیم سلامتی",
      description_en: "For immediate danger to life or physical safety",
      phone: "000",
      displayPhone: "000",
      available: "۲۴ ساعته / ۷ روز هفته",
      available_en: "24/7 Emergency",
      isEmergency: true,
    },
    {
      id: "au-lifeline",
      name: "لایف‌لاین استرالیا (پشتیبانی بحران و پیشگیری از خودکشی)",
      name_en: "Lifeline (Crisis Support & Suicide Prevention)",
      description: "پشتیبانی شبانه‌روزی، کاملاً رایگان و محرمانه برای تمام ساکنان استرالیا",
      description_en: "24/7 free, confidential crisis support and suicide prevention",
      phone: "131114",
      displayPhone: "13 11 14",
      available: "۲۴ ساعته / ۷ روز هفته",
      available_en: "Available 24/7",
      sms: "0477131114",
      url: "https://www.lifeline.org.au",
    },
    {
      id: "au-beyondblue",
      name: "بیاند بلو (اضطراب، افسردگی و بهزیستی روان)",
      name_en: "Beyond Blue",
      description: "پشتیبانی تخصصی سلامت روان، مشاوره تلفنی و گفتگوی آنلاین",
      description_en: "Mental health support, information, and counseling",
      phone: "1300224636",
      displayPhone: "1300 22 4636",
      available: "۲۴ ساعته / ۷ روز هفته",
      available_en: "Available 24/7",
      url: "https://www.beyondblue.org.au",
    },
    {
      id: "au-callback",
      name: "سرویس مشاوره تلفنی خودکشی (Suicide Call Back Service)",
      name_en: "Suicide Call Back Service",
      description: "مشاوره تلفنی و آنلاین تخصصی برای افراد در بحران یا نگران دیگران",
      description_en: "Free nationwide phone and online counseling for people in suicide crisis",
      phone: "1300659467",
      displayPhone: "1300 659 467",
      available: "۲۴ ساعته / ۷ روز هفته",
      available_en: "Available 24/7",
      url: "https://www.suicidecallbackservice.org.au",
    },
    {
      id: "au-kidshelpline",
      name: "خط کمک کودکان و جوانان (سنین ۵ تا ۲۵ سال)",
      name_en: "Kids Helpline (Ages 5–25)",
      description: "مشاوره رایگان و محرمانه اختصاصی برای کودکان، نوجوانان و جوانان",
      description_en: "Free, private and confidential 24/7 phone and online counseling for young people",
      phone: "1800551800",
      displayPhone: "1800 55 1800",
      available: "۲۴ ساعته برای ۵ تا ۲۵ سال",
      available_en: "24/7 for ages 5–25",
      url: "https://kidshelpline.com.au",
    },
  ],

  ir: [
    {
      id: "ir-ems",
      name: "اورژانس پیش‌بیمارستانی (فوریت‌های پزشکی)",
      name_en: "Emergency Medical Services (EMS)",
      description: "فوریت‌های پزشکی، امداد و نجات فوری در شرایط خطر جانی",
      description_en: "Urgent paramedic and emergency medical dispatch",
      phone: "115",
      displayPhone: "۱۱۵",
      available: "۲۴ ساعته",
      available_en: "24/7 Emergency",
      isEmergency: true,
    },
    {
      id: "ir-social",
      name: "اورژانس اجتماعی (سازمان بهزیستی)",
      name_en: "Social Emergency Services",
      description: "بحران‌های فردی و خانوادگی، مداخله در خودکشی و خودآزاری، کودک‌آزاری و خشونت خانگی",
      description_en: "Personal and family crises, acute self-harm and domestic violence intervention",
      phone: "123",
      displayPhone: "۱۲۳",
      available: "۲۴ ساعته",
      available_en: "Available 24/7",
      isEmergency: true,
    },
    {
      id: "ir-welfare",
      name: "صدای مشاور بهزیستی (مشاوره تلفنی روان‌شناختی)",
      name_en: "Welfare Psychological Counseling Line",
      description: "مشاوره تخصصی و محرمانه تلفنی در زمینه‌های اضطراب، افسردگی، بحران‌های فردی و خانوادگی",
      description_en: "Free confidential psychological counseling for stress, mood, and personal challenges",
      phone: "1480",
      displayPhone: "۱۴۸۰",
      available: "۸ صبح تا ۱۲ شب",
      available_en: "8:00 AM – 12:00 AM daily",
    },
    {
      id: "ir-police",
      name: "پلیس (فوریت‌های پلیسی ۱۱۰)",
      name_en: "Police Emergency",
      description: "تهدیدات جانی فوری، حوادث غیرمترقبه و شرایط ناامن",
      description_en: "Immediate safety threats and emergency police response",
      phone: "110",
      displayPhone: "۱۱۰",
      available: "۲۴ ساعته",
      available_en: "24/7 Emergency",
    },
  ],

  us: [
    {
      id: "us-emergency",
      name: "خدمات اضطراری (پلیس، آمبولانس، آتش‌نشانی)",
      name_en: "Emergency Services (911)",
      description: "برای شرایط اضطراری و تهدید فوری جانی",
      description_en: "For immediate life-threatening emergencies",
      phone: "911",
      displayPhone: "911",
      available: "۲۴ ساعته",
      available_en: "24/7 Emergency",
      isEmergency: true,
    },
    {
      id: "us-lifeline-988",
      name: "خط ملی بحران و پیشگیری از خودکشی ۹۸۸",
      name_en: "988 Suicide & Crisis Lifeline",
      description: "پشتیبانی ۲۴ ساعته، رایگان و محرمانه برای تمام افراد در شرایط بحران",
      description_en: "24/7, free, confidential support for people in suicidal crisis or mental distress",
      phone: "988",
      displayPhone: "988",
      available: "۲۴ ساعته / ۷ روز هفته",
      available_en: "Available 24/7",
      sms: "988",
      url: "https://988lifeline.org",
    },
    {
      id: "us-crisis-text",
      name: "سامانه پیامکی بحران (ارسال پیام کوتاه)",
      name_en: "Crisis Text Line",
      description: "ارسال پیامک برای ارتباط مستقیم با مشاور داوطلب بحران",
      description_en: "Text HOME to 741741 to connect with a crisis counselor 24/7",
      phone: "741741",
      displayPhone: "741741",
      available: "۲۴ ساعته پیامکی",
      available_en: "24/7 via SMS",
      sms: "741741",
      url: "https://www.crisistextline.org",
    },
  ],

  international: [
    {
      id: "intl-112",
      name: "شماره اضطراری بین‌المللی GSM (۱۱۲)",
      name_en: "International Emergency Number (112)",
      description: "شماره استاندارد خدمات اضطراری در اروپا و اکثر کشورهای جهان",
      description_en: "Standard emergency number in the European Union and most mobile networks globally",
      phone: "112",
      displayPhone: "112",
      available: "۲۴ ساعته",
      available_en: "24/7 Emergency",
      isEmergency: true,
    },
    {
      id: "intl-findahelpline",
      name: "پایگاه جهانی خطوط کمکی و بحران (Find A Helpline)",
      name_en: "Find A Helpline (Global Directory)",
      description: "جست‌وجوی خطوط مشاوره و بحران رایگان و محرمانه در بیش از ۱۳۰ کشور جهان",
      description_en: "Free, confidential support from local crisis centers in over 130 countries",
      phone: "",
      displayPhone: "findahelpline.com",
      available: "آنلاین / وب‌سایت",
      available_en: "Online directory",
      url: "https://findahelpline.com",
    },
    {
      id: "intl-befrienders",
      name: "شبکه جهانی شنوندگان همدل (Befrienders Worldwide)",
      name_en: "Befrienders Worldwide",
      description: "شبکه جهانی مراکز پیشگیری از خودکشی و حمایت عاطفی رایگان",
      description_en: "Global emotional support and suicide prevention network",
      phone: "",
      displayPhone: "befrienders.org",
      available: "آنلاین / وب‌سایت",
      available_en: "Online directory",
      url: "https://www.befrienders.org",
    },
  ],
};

export const CRISIS_REGION_STORAGE_KEY = "arshnam_crisis_support_region";

/**
 * Retrieve user's manually selected crisis region from localStorage.
 * Does not perform automatic geolocation.
 */
export function getStoredSupportRegion(): SupportRegion | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const val = localStorage.getItem(CRISIS_REGION_STORAGE_KEY);
    if (val === "au" || val === "ir" || val === "us" || val === "international") {
      return val;
    }
  } catch {}
  return null;
}

/**
 * Persist user's manually chosen support region.
 */
export function setStoredSupportRegion(region: SupportRegion): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(CRISIS_REGION_STORAGE_KEY, region);
    }
  } catch {}
}

/**
 * Resolve active support region.
 * Precedence:
 * 1. User manual selection in localStorage.
 * 2. Language defaults:
 *    - Persian ("fa") -> "ir" (Iran)
 *    - English ("en") -> "au" (Australia, as primary target without defaulting to US numbers)
 */
export function resolveSupportRegion(currentLanguage: string): SupportRegion {
  const stored = getStoredSupportRegion();
  if (stored) return stored;
  const isFa = currentLanguage.toLowerCase().startsWith("fa");
  return isFa ? "ir" : "au";
}

/**
 * Get crisis resources for a specific support region.
 */
export function getCrisisResources(region: SupportRegion): CrisisResource[] {
  return REGIONAL_CRISIS_RESOURCES[region] || REGIONAL_CRISIS_RESOURCES.au;
}

/**
 * Validate that phone string contains only valid dialable telephone characters.
 * Valid characters: digits 0-9, and optionally leading '+'. No spaces or letters.
 */
export function isValidTelNumber(phone: string): boolean {
  if (!phone) return false;
  return /^\+?[0-9]+$/.test(phone);
}
