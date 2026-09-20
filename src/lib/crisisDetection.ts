// Hard-stop trigger phrases for crisis intervention.
// \b word boundaries don't work reliably with Persian script; we rely on
// substring/whitespace patterns instead.
import {
  getCrisisResources,
  resolveSupportRegion,
  type CrisisResource,
  type SupportRegion,
} from "./crisisResources";

const HARD_STOPS = [
  /خودکشی/i,
  /خودآزار/i,
  /به (خودم|خود)\s*آسیب/i,
  /دیگر نمی‌?توانم/i,
  /دیگه\s*نمی?تونم/i,
  /هیچ\s*راهی\s*نیست/i,
  /می‌?خواهم بمیرم/i,
  /میخوام بمیرم/i,
  /تمام کنم زندگی/i,
  /بی‌?ارزش(م|ی|ه)?/i,
  /بهتر(ه| است) نباشم/i,
];

export function detectCrisis(text: string): boolean {
  if (!text) return false;
  return HARD_STOPS.some((rx) => rx.test(text));
}

// Backwards-compatible legacy exports with clean dialable phone strings
export const CRISIS_RESOURCES = {
  fa: [
    { label: "اورژانس اجتماعی", phone: "123" },
    { label: "خط مشاوره بهزیستی", phone: "1480" },
    { label: "اورژانس پزشکی", phone: "115" },
    { label: "پلیس", phone: "110" },
  ],
  en: [
    { label: "Emergency Services (Triple Zero)", phone: "000" },
    { label: "Lifeline Australia (24/7 Crisis Support)", phone: "131114" },
    { label: "Beyond Blue (Mental Health Support)", phone: "1300224636" },
    { label: "Suicide Call Back Service", phone: "1300659467" },
  ],
};

export {
  getCrisisResources,
  resolveSupportRegion,
  type CrisisResource,
  type SupportRegion,
};
