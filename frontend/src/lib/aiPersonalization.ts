import { firebaseStore } from "@/lib/firebaseStore";
import { isAIPersonalizationOptedIn, setAIPersonalizationOptedIn } from "@/lib/aiSettings";
import { formatAboutMeForAI, getAboutMeAIPromptDirectives, type AboutMeRow } from "@/lib/aboutMe";

async function currentAuthUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await firebaseStore.auth.getUser();
    return (user as any)?.uid || (user as any)?.id || null;
  } catch {
    return null;
  }
}

function emptyPersonalization(isOptedIn: boolean): PersonalizationData {
  return { contextText: "", hasData: false, aboutMePoints: [], mindPoints: [], isOptedIn };
}

export interface PersonalizationData {
  contextText: string;
  hasData: boolean;
  aboutMePoints: string[];
  mindPoints: string[];
  isOptedIn: boolean;
}

/**
 * Builds the comprehensive AI personalization prompt context.
 * Strictly respects user privacy: returns empty context if user has not opted in.
 */
export async function buildPersonalizationContext(options?: {
  lang?: "fa" | "en";
  uid?: string;
}): Promise<PersonalizationData> {
  const activeUid = await currentAuthUserId();
  const uid = options?.uid || activeUid;

  const isOptedIn = Boolean(uid && activeUid === uid && isAIPersonalizationOptedIn(uid));
  if (!isOptedIn) return emptyPersonalization(false);

  const lang = options?.lang || "fa";
  if (!uid) return emptyPersonalization(false);

  try {
    const [{ data: mh }, { data: am }] = await Promise.all([
      firebaseStore.from("mh_profile", uid).select("*").eq("user_id", uid).maybeSingle(),
      firebaseStore.from("about_me" as any, uid).select("*").eq("user_id", uid).maybeSingle(),
    ]);

    if (await currentAuthUserId() !== uid || !isAIPersonalizationOptedIn(uid)) return emptyPersonalization(false);

    const aboutMePoints = formatAboutMeForAI(am as AboutMeRow, lang);

    const mindPoints: string[] = [];
    if (mh?.summary) {
      mindPoints.push(lang === "en" ? `Self-Knowledge & Mind Summary: ${mh.summary}` : `پروفایل خودشناسی و سلامت ذهن: ${mh.summary}`);
    }
    if (mh?.hexaco_pattern) {
      mindPoints.push(lang === "en" ? `HEXACO Personality Archetype: ${mh.hexaco_pattern}` : `الگوی شخصیت HEXACO: ${mh.hexaco_pattern}`);
    }
    if (mh?.ai_tone) {
      mindPoints.push(lang === "en" ? `Calibrated AI Tone: ${mh.ai_tone}` : `لحن ترجیحی کالیبره‌شده AI: ${mh.ai_tone}`);
    }
    if (mh?.signature_strengths?.length) {
      const strengths = Array.isArray(mh.signature_strengths) ? mh.signature_strengths.join(", ") : mh.signature_strengths;
      mindPoints.push(lang === "en" ? `VIA Signature Strengths: ${strengths}` : `نقاط قوت بنیادین VIA: ${strengths}`);
    }
    if (mh?.attachment_quadrant) {
      mindPoints.push(lang === "en" ? `Attachment Style (ECR): ${mh.attachment_quadrant}` : `سبک دلبستگی روابط (ECR): ${mh.attachment_quadrant}`);
    }
    if (mh?.communication_style) {
      mindPoints.push(lang === "en" ? `Communication Style: ${mh.communication_style}` : `سبک ارتباطی: ${mh.communication_style}`);
    }
    if (mh?.primary_goals) {
      mindPoints.push(lang === "en" ? `Primary Self-Knowledge Goals: ${mh.primary_goals}` : `اهداف اصلی خودشناسی: ${mh.primary_goals}`);
    }

    const hasData = aboutMePoints.length > 0 || mindPoints.length > 0;
    if (!hasData) {
      return emptyPersonalization(true);
    }

    const sections: string[] = [];
    sections.push(lang === "en" ? "[Personalization Profile Context / User Profile]:" : "[اطلاعات شخصی‌سازی‌شده و پروفایل کاربر با رضایت شخصی]:");

    if (aboutMePoints.length > 0) {
      sections.push(lang === "en" ? "--- About Me & Life Context ---" : "--- درباره من، اهداف و سبک زندگی ---");
      sections.push(...aboutMePoints);
    }

    if (mindPoints.length > 0) {
      sections.push(lang === "en" ? "--- Psychological & Self-Knowledge Profile ---" : "--- خودشناسی، شخصیت و سلامت ذهن ---");
      sections.push(...mindPoints);
    }

    sections.push("--- " + (lang === "en" ? "AI Guidance" : "راهنمای عمل هوش مصنوعی") + " ---");
    sections.push(getAboutMeAIPromptDirectives(lang));

    const contextText = `\n${sections.join("\n")}\n`;

    return {
      contextText,
      hasData: true,
      aboutMePoints,
      mindPoints,
      isOptedIn: true,
    };
  } catch {
    if (await currentAuthUserId() !== uid || !isAIPersonalizationOptedIn(uid)) return emptyPersonalization(false);
    return emptyPersonalization(true);
  }
}

export { isAIPersonalizationOptedIn, setAIPersonalizationOptedIn };
