import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Brain, Heart, Sparkles, CheckCircle2, Clock, Info } from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";
import { toPersianDigits } from "@/lib/persianDigits";

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

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: pr }, { data: rs }] = await Promise.all([
        firebaseStore.from("assessment_responses").select("assessment_type, current_index, completed").eq("user_id", user.id),
        firebaseStore.from("assessment_results").select("assessment_type").eq("user_id", user.id),
      ]);
      const p: typeof progress = {};
      pr?.forEach((r: any) => { p[r.assessment_type] = { idx: r.current_index, completed: r.completed }; });
      const rmap: typeof results = {};
      rs?.forEach((r: any) => { rmap[r.assessment_type] = true; });
      setProgress(p);
      setResults(rmap);
    })();
  }, [user]);

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">{T("خودشناسی", "Self-Discovery")}</h1>
        <p className="text-muted-foreground leading-relaxed">
          {T(
            "ارزیابی‌های روان‌سنجی استاندارد. هر تست را می‌توانی یکجا یا در چند جلسه انجام دهی — پاسخ‌ها خودکار ذخیره می‌شوند. پس از تکمیل، می‌توانی «تحلیل جامع AI» مخصوص نتیجه خودت را دریافت کنی.",
            "Standard psychometric assessments. You can take each test in one go or across multiple sessions — answers are saved automatically. After completion, receive a comprehensive AI analysis tailored to your profile."
          )}
        </p>
      </div>

      <Card className="bg-muted/30">
        <CardContent className="p-5 text-sm leading-relaxed space-y-2">
          <div className="flex items-center gap-2 font-medium">
            <Info className="w-4 h-4 text-primary" /> {T("سه مسیر ورود", "Three Pathways")}
          </div>
          <ul className={`space-y-1 list-disc ${isEn ? "ps-5" : "pe-5"} text-muted-foreground`}>
            <li><strong>Deep Dive:</strong> {T("همه ۱۶۸ سوال در یک نشست (~۵۰ دقیقه)", "All 168 questions in one session (~50 min)")}</li>
            <li><strong>Split Sessions:</strong> {T("در چند جلسه ۱۵–۲۰ دقیقه‌ای", "In multiple 15–20 minute sessions")}</li>
            <li><strong>Mini:</strong> {T("فقط HEXACO برای کالیبراسیون لحن AI", "Only HEXACO for AI tone calibration")}</li>
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {TESTS.map((t) => {
          const Icon = t.icon;
          const p = progress[t.type];
          const done = !!results[t.type];
          const pct = p ? ((p.idx + 1) / t.count) * 100 : 0;
          const title = isEn && "title_en" in t ? (t as any).title_en : t.title;
          const subtitle = isEn ? t.subtitle_en : t.subtitle;
          const time = isEn ? t.time_en : t.time;
          const countStr = isEn ? `${t.count} questions` : `${toPersianDigits(t.count)} سوال`;

          return (
            <Card key={t.type} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Icon className={`w-8 h-8 ${t.color}`} />
                  {done && <Badge variant="secondary"><CheckCircle2 className={`w-3 h-3 ${isEn ? "me-1" : "ms-1"}`} /> {T("تکمیل", "Completed")}</Badge>}
                  {!done && p && !p.completed && <Badge variant="outline"><Clock className={`w-3 h-3 ${isEn ? "me-1" : "ms-1"}`} /> {T("ناتمام", "In Progress")}</Badge>}
                </div>
                <CardTitle className="mt-3">{title}</CardTitle>
                <CardDescription>{subtitle}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  {countStr} · {time}
                </div>
                {p && !p.completed && (
                  <div className="space-y-1">
                    <Progress value={pct} className="h-1.5" />
                    <div className="text-xs text-muted-foreground">
                      {isEn ? `${p.idx + 1} of ${t.count}` : `${toPersianDigits(p.idx + 1)} از ${toPersianDigits(t.count)}`}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button asChild className="flex-1">
                    <Link to={`/app/self/test/${t.type}`}>
                      {p && !p.completed ? T("ادامه", "Continue") : done ? T("انجام مجدد", "Retake") : T("شروع", "Start")}
                    </Link>
                  </Button>
                  {done && (
                    <Button asChild variant="outline">
                      <Link to={`/app/self/result/${t.type}`}>{T("گزارش", "Report")}</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{T("این تست‌ها برای چه چیزی هستند؟", "What are these tests for?")}</CardTitle>
          <CardDescription>
            {T("قبل از شروع، بخوان تا بدانی هر تست چه چیزی به تو می‌گوید و چه زمانی به دردت می‌خورد.", "Read before starting to understand what each assessment reveals and when to use it.")}
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
                      <t.icon className={`w-5 h-5 ${t.color}`} />
                      <span className="font-medium">{title} — {subtitle}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 leading-relaxed text-sm pt-2">
                    <div>
                      <div className="font-medium text-foreground mb-1">🎯 {T("هدف", "Purpose")}</div>
                      <p className="text-muted-foreground">{purpose}</p>
                    </div>
                    <div>
                      <div className="font-medium text-foreground mb-1">⏰ {T("چه زمانی استفاده کنم؟", "When to use?")}</div>
                      <p className="text-muted-foreground">{useCase}</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{T("ردیابی روزانه", "Daily Tracking")}</CardTitle>
          <CardDescription>{T("ثبت خلق، انرژی، خواب و تمرکز برای الگویابی بلندمدت", "Log mood, energy, sleep, and focus for long-term pattern insights")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/app/checkin">{T("رفتن به Check-in روزانه", "Go to Daily Check-in")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
