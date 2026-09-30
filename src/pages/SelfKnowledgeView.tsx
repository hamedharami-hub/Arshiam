import { useEffect, useState } from "react";
import { isPathAllowed } from "@/lib/appModules";
import { Link } from "react-router-dom";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Brain,
  Heart,
  Sparkles,
  CheckCircle2,
  Clock,
  Info,
  Compass,
  Target,
  User,
  Shield,
  Zap,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";
import { toPersianDigits } from "@/lib/persianDigits";
import { VIA_LABELS, type ViaStrength } from "@/lib/assessments/via";
import { QUADRANT_LABELS, type AttachmentQuadrant } from "@/lib/assessments/ecr";

const TESTS = [
  {
    type: "hexaco",
    title: "HEXACO-60",
    subtitle: "ساختار ۶ محوری شخصیت",
    subtitle_en: "6-Factor Personality Structure",
    time: "۱۵–۲۰ دقیقه",
    time_en: "15–20 minutes",
    count: 60,
    icon: Brain,
    color: "text-blue-500",
    purpose:
      "این تست شخصیت تو را در شش بُعد بنیادی می‌سنجد: صداقت-تواضع، هیجان‌پذیری، برون‌گرایی، توافق‌پذیری، وظیفه‌شناسی و گشودگی به تجربه. برخلاف Big Five کلاسیک، بُعد «صداقت-تواضع» را به‌صورت مجزا می‌سنجد که پیش‌بین قوی رفتارهای اخلاقی و تصمیم‌گیری است.",
    purpose_en:
      "This test assesses personality across six major dimensions: Honesty-Humility, Emotionality, Extraversion, Agreeableness, Conscientiousness, and Openness to Experience. Unlike the classical Big Five, Honesty-Humility is measured independently, offering strong insights into ethical decisions and interpersonal fairness.",
    useCase:
      "وقتی می‌خواهی بفهمی چرا در موقعیت‌های مشابه واکنش‌های متفاوتی نسبت به دیگران نشان می‌دهی، یا وقتی به‌دنبال شناخت الگوی پایدار رفتاری خودت برای انتخاب شغل، رابطه یا سبک کار هستی. نتیجه این تست لحن AI را هم کالیبره می‌کند.",
    useCase_en:
      "Use when you want to understand your consistent behavioral patterns for career, relationships, or work habits. The results also calibrate your AI companion's tone and guidance style.",
  },
  {
    type: "via",
    title: "VIA — نقاط قوت",
    title_en: "VIA Character Strengths",
    subtitle: "۲۴ نقطه قوت شخصیتی",
    subtitle_en: "24 Character Strengths",
    time: "۲۰–۲۵ دقیقه",
    time_en: "20–25 minutes",
    count: 72,
    icon: Sparkles,
    color: "text-amber-500",
    purpose:
      "بر اساس روان‌شناسی مثبت‌گرا (سلیگمن و پیترسون)، ۲۴ نقطه قوت اصلی انسان را در شش فضیلت ریشه‌ای (خرد، شجاعت، انسانیت، عدالت، اعتدال، تعالی) رتبه‌بندی می‌کند تا «امضای شخصیتی» تو را پیدا کند.",
    purpose_en:
      "Rooted in positive psychology (Seligman & Peterson), this ranks 24 universal character strengths across six core virtues (Wisdom, Courage, Humanity, Justice, Temperance, Transcendence) to reveal your personal signature strengths.",
    useCase:
      "وقتی احساس می‌کنی پتانسیلت را به کار نمی‌گیری، یا می‌خواهی بدانی در چه فعالیت‌هایی به‌طور طبیعی شکوفا می‌شوی. پنج نقطه قوت اول تو در پیشنهادها و طراحی مداخله‌های AI استفاده می‌شوند تا راهکارها متناسب با خودت باشند، نه عمومی.",
    useCase_en:
      "Use when you want to discover activities where you naturally flourish. Your top five signature strengths help your AI companion tailor suggestions specifically to your authentic traits.",
  },
  {
    type: "ecr",
    title: "ECR-R",
    subtitle: "سبک دلبستگی بزرگسالان",
    subtitle_en: "Adult Attachment Style",
    time: "۱۰ دقیقه",
    time_en: "10 minutes",
    count: 36,
    icon: Heart,
    color: "text-rose-500",
    purpose:
      "سبک دلبستگی تو را در دو بُعد اضطراب (ترس از طرد) و اجتناب (دوری از صمیمیت) می‌سنجد و در یکی از چهار سبک قرار می‌دهد: ایمن، مضطرب-دل‌مشغول، اجتنابی-بی‌اعتنا، یا اجتنابی-ترس‌خورده.",
    purpose_en:
      "Measures attachment patterns along two continuous dimensions: Attachment Anxiety (fear of abandonment) and Attachment Avoidance (fear of intimacy), categorizing into Secure, Anxious-Preoccupied, Dismissive-Avoidant, or Fearful-Avoidant styles.",
    useCase:
      "وقتی می‌خواهی الگوهای تکرارشونده در روابط نزدیکت را بفهمی — چرا برخی موقعیت‌ها تو را مضطرب می‌کنند، چرا گاهی فاصله می‌گیری، یا چرا اعتماد کردن سخت است. این تست به AI کمک می‌کند بازخوردهای مرتبط با روابط را مناسب‌تر ارائه دهد.",
    useCase_en:
      "Use when exploring relationship dynamics, boundaries, emotional intimacy, or trust. Helps your AI provide compassionate, attachment-informed insights.",
  },
] as const;

export default function SelfKnowledgeView() {
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const [progress, setProgress] = useState<Record<string, { idx: number; completed: boolean }>>({});
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [mhProfile, setMhProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: pr }, { data: rs }, { data: mh }] = await Promise.all([
        firebaseStore.from("assessment_responses").select("assessment_type, current_index, completed").eq("user_id", user.id),
        firebaseStore.from("assessment_results").select("assessment_type").eq("user_id", user.id),
        firebaseStore.from("mh_profile").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      const p: typeof progress = {};
      pr?.forEach((r: any) => {
        p[r.assessment_type] = { idx: r.current_index, completed: r.completed };
      });
      const rmap: typeof results = {};
      rs?.forEach((r: any) => {
        rmap[r.assessment_type] = true;
      });
      setProgress(p);
      setResults(rmap);
      setMhProfile(mh);
    })();
  }, [user]);

  const completedCount = Object.keys(results).length;

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="text-primary border-primary/30 px-3 py-1 gap-1 text-xs">
            <Brain className="w-3.5 h-3.5" />
            {T("پایگاه روان‌سنجی و خودشناسی استاندارد", "Psychometric Self-Knowledge Hub")}
          </Badge>
          {completedCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {isEn ? `${completedCount} of 3 completed` : `${toPersianDigits(completedCount)} از ۳ ارزیابی تکمیل شده`}
            </Badge>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground mb-2">
          {T("خودشناسی و ارزیابی‌های روان‌سنجی", "Self-Discovery & Psychometrics")}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {T(
            "ارزیابی‌های علمی HEXACO، نقاط قوت VIA و دلبستگی ECR-R؛ پاسخ‌های شما خودکار ذخیره می‌شوند و نتایج آن‌ها سیستم هوشمند، اهداف و ریتم روزمره شما را در کل برنامه کالیبره می‌کنند.",
            "Standard psychometric assessments (HEXACO, VIA Strengths, ECR-R Attachment). Your responses calibrate your AI tone, Life Architect blueprint, and personalized success roadmap."
          )}
        </p>
      </div>

      {/* UNIFIED SELF-PROFILE HERO (If at least 1 completed) */}
      {completedCount > 0 && mhProfile && (
        <Card className="rounded-3xl border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-base text-foreground">
                {T("پروفایل یکپارچه خودشناسی شما", "Your Unified Self-Knowledge Profile")}
              </h2>
            </div>
            {mhProfile.ai_tone && (
              <Badge variant="outline" className="text-xs border-primary/40 font-mono">
                {T("لحن هوش مصنوعی: ", "AI Tone: ")} {mhProfile.ai_tone}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Hexaco Card */}
            <div className="p-3.5 rounded-2xl bg-card border border-border/80 space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Brain className="w-3.5 h-3.5 text-blue-500" />
                {T("شخصیت (HEXACO):", "Personality:")}
              </span>
              <div className="font-bold text-sm text-foreground">
                {mhProfile.hexaco_pattern || T("در انتظار تکمیل تست", "Pending assessment")}
              </div>
            </div>

            {/* VIA Card */}
            <div className="p-3.5 rounded-2xl bg-card border border-border/80 space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                {T("نقاط قوت امضا (VIA):", "Signature Strengths:")}
              </span>
              <div className="font-bold text-sm text-foreground line-clamp-1">
                {Array.isArray(mhProfile.signature_strengths) && mhProfile.signature_strengths.length > 0
                  ? mhProfile.signature_strengths.slice(0, 3).map((s: string) => VIA_LABELS[s as ViaStrength] || s).join("، ")
                  : T("در انتظار تکمیل تست", "Pending assessment")}
              </div>
            </div>

            {/* ECR Card */}
            <div className="p-3.5 rounded-2xl bg-card border border-border/80 space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                {T("سبک دلبستگی (ECR):", "Attachment Style:")}
              </span>
              <div className="font-bold text-sm text-foreground">
                {mhProfile.attachment_quadrant
                  ? QUADRANT_LABELS[mhProfile.attachment_quadrant as AttachmentQuadrant] || mhProfile.attachment_quadrant
                  : T("در انتظار تکمیل تست", "Pending assessment")}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Pathways Guide */}
      <Card className="bg-muted/30 rounded-2xl border-border/60">
        <CardContent className="p-4 sm:p-5 text-sm leading-relaxed space-y-2">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Info className="w-4 h-4 text-primary" /> {T("سه مسیر پیشنهادی برای تکمیل ارزیابی‌ها", "Three Suggested Pathways")}
          </div>
          <ul className={`space-y-1 text-xs sm:text-sm list-disc ${isEn ? "ps-5" : "pe-5"} text-muted-foreground leading-relaxed`}>
            <li>
              <strong className="text-foreground">Deep Dive:</strong> {T("تکمیل همه ۱۶۸ سؤال در یک نشست متمرکز (~۵۰ دقیقه برای نقشه ۳۶۰ درجه)", "All 168 questions in one focused session (~50 min)")}
            </li>
            <li>
              <strong className="text-foreground">Split Sessions:</strong> {T("تکمیل گام‌به‌گام در چند جلسه ۱۰ تا ۲۰ دقیقه‌ای (پاسخ‌ها خودکار ذخیره می‌شوند)", "In multiple 10–20 minute sessions (auto-saved)")}
            </li>
            <li>
              <strong className="text-foreground">Mini Path:</strong> {T("شروع با HEXACO برای کالیبراسیون لحن و سبک کاری هوش مصنوعی", "Start with HEXACO to calibrate your AI companion's tone")}
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Assessment Test Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {TESTS.map((t) => {
          const Icon = t.icon;
          const p = progress[t.type];
          const done = !!results[t.type];
          const pct = p ? ((p.idx + 1) / t.count) * 100 : 0;
          const title = isEn && "title_en" in t ? (t as any).title_en : t.title;
          const subtitle = isEn ? t.subtitle_en : t.subtitle;
          const time = isEn ? t.time_en : t.time;
          const countStr = isEn ? `${t.count} questions` : `${toPersianDigits(t.count)} سؤال`;

          return (
            <Card key={t.type} className="flex flex-col rounded-3xl border-border/70 hover:border-primary/50 transition-all shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center ${t.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  {done && (
                    <Badge variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs">
                      <CheckCircle2 className="w-3 h-3" /> {T("تکمیل شده", "Completed")}
                    </Badge>
                  )}
                  {!done && p && !p.completed && (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Clock className="w-3 h-3 text-amber-500" /> {T("در حال انجام", "In Progress")}
                    </Badge>
                  )}
                </div>
                <CardTitle className="mt-3 text-lg">{title}</CardTitle>
                <CardDescription className="text-xs">{subtitle}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between gap-4 pt-1">
                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>{countStr}</span>
                  <span>⏱ {time}</span>
                </div>
                {p && !p.completed && (
                  <div className="space-y-1.5">
                    <Progress value={pct} className="h-1.5" />
                    <div className="text-[11px] text-muted-foreground">
                      {isEn ? `${p.idx + 1} of ${t.count}` : `${toPersianDigits(p.idx + 1)} از ${toPersianDigits(t.count)}`}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button asChild className="flex-1 font-bold rounded-xl shadow-xs">
                    <Link to={`/app/self/test/${t.type}`}>
                      {p && !p.completed ? T("ادامه ارزیابی", "Continue") : done ? T("انجام مجدد", "Retake") : T("شروع آزمون", "Start")}
                    </Link>
                  </Button>
                  {done && (
                    <Button asChild variant="outline" className="rounded-xl">
                      <Link to={`/app/self/result/${t.type}`}>{T("مشاهده گزارش", "Report")}</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* CONNECTED ECOSYSTEM SECTION */}
      <Card className="rounded-3xl border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-bold text-base text-foreground">
              {T("پیوند خودشناسی با سایر ارکان برنامه شما", "Connect Self-Knowledge Across Your App")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {T(
                "نتایج ارزیابی‌های شما در این بخش، به‌طور فعال در بخش‌های دیگر ارشناز برای طراحی اهداف، روتین‌ها و همراهی هوشمند به کار می‌روند.",
                "Your assessment results actively power Life Architect, ACT values, and personalized daily routines."
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          <Button asChild variant="outline" className="h-auto p-3.5 text-start justify-start rounded-2xl bg-card border-border/70 hover:border-primary/50">
            <Link to="/app/life-architect">
              <Compass className="w-5 h-5 text-primary shrink-0 me-2.5" />
              <div>
                <div className="text-xs font-bold text-foreground">{T("معمار زندگی", "Life Architect")}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{T("طراحی سیستم‌عامل زندگی با نقاط قوت", "Build personal OS")}</div>
              </div>
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-auto p-3.5 text-start justify-start rounded-2xl bg-card border-border/70 hover:border-primary/50">
            <Link to="/app/mind">
              <Heart className="w-5 h-5 text-rose-500 shrink-0 me-2.5" />
              <div>
                <div className="text-xs font-bold text-foreground">{T("ارزش‌ها و اهداف", "Values & Goals")}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{T("تنظیم قطب‌نما بر پایه روانشناسی ACT", "ACT values & horizons")}</div>
              </div>
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-auto p-3.5 text-start justify-start rounded-2xl bg-card border-border/70 hover:border-primary/50">
            <Link to="/app/about-me">
              <User className="w-5 h-5 text-amber-500 shrink-0 me-2.5" />
              <div>
                <div className="text-xs font-bold text-foreground">{T("درباره من", "About Me")}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{T("یکپارچگی شناسنامه فردی و بیوگرافی", "Personal biography")}</div>
              </div>
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-auto p-3.5 text-start justify-start rounded-2xl bg-card border-border/70 hover:border-primary/50">
            <Link to="/app/checkin">
              <Zap className="w-5 h-5 text-emerald-500 shrink-0 me-2.5" />
              <div>
                <div className="text-xs font-bold text-foreground">{T("چک‌این روزانه", "Daily Check-in")}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{T("ردیابی ریتم روانی، خواب و انرژی", "Mood & energy tracking")}</div>
              </div>
            </Link>
          </Button>
        </div>
      </Card>

      {/* Accordion FAQ / Guide */}
      <Card className="rounded-3xl border-border/70">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">{T("راهنمای کاربردی آزمون‌ها", "Assessment Guide")}</CardTitle>
          <CardDescription>
            {T("هدف و موقعیت مناسب برای انجام هر ارزیابی روان‌سنجی", "Understand what each assessment reveals and when to take it.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {TESTS.map((t) => {
              const title = isEn && "title_en" in t ? (t as any).title_en : t.title;
              const subtitle = isEn ? t.subtitle_en : t.subtitle;
              const purpose = isEn ? t.purpose_en : t.purpose;
              const useCase = isEn ? t.useCase_en : t.useCase;

              return (
                <AccordionItem key={t.type} value={t.type}>
                  <AccordionTrigger className={`${isEn ? "text-start" : "text-end"} hover:no-underline`}>
                    <div className="flex items-center gap-2">
                      <t.icon className={`w-4 h-4 ${t.color}`} />
                      <span className="font-bold text-sm">
                        {title} — {subtitle}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 leading-relaxed text-xs sm:text-sm pt-2">
                    <div>
                      <div className="font-bold text-foreground mb-1">🎯 {T("هدف علمی ارزیابی:", "Scientific Purpose:")}</div>
                      <p className="text-muted-foreground">{purpose}</p>
                    </div>
                    <div>
                      <div className="font-bold text-foreground mb-1">⏰ {T("چه زمانی به کار می‌آید؟", "When to Use:")}</div>
                      <p className="text-muted-foreground">{useCase}</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
