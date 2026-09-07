import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Brain, Heart, Sparkles, CheckCircle2, Clock, Info } from "lucide-react";

const TESTS = [
  {
    type: "hexaco",
    title: "HEXACO-60",
    subtitle: "ساختار ۶ محوری شخصیت",
    time: "۱۵–۲۰ دقیقه",
    count: 60,
    icon: Brain,
    color: "text-blue-500",
    purpose:
      "این تست شخصیت تو را در شش بُعد بنیادی می‌سنجد: صداقت-تواضع، هیجان‌پذیری، برون‌گرایی، توافق‌پذیری، وظیفه‌شناسی و گشودگی به تجربه. برخلاف Big Five کلاسیک، بُعد «صداقت-تواضع» را به‌صورت مجزا می‌سنجد که پیش‌بین قوی رفتارهای اخلاقی و تصمیم‌گیری است.",
    useCase:
      "وقتی می‌خواهی بفهمی چرا در موقعیت‌های مشابه واکنش‌های متفاوتی نسبت به دیگران نشان می‌دهی، یا وقتی به‌دنبال شناخت الگوی پایدار رفتاری خودت برای انتخاب شغل، رابطه یا سبک کار هستی. نتیجه این تست لحن AI را هم کالیبره می‌کند.",
  },
  {
    type: "via",
    title: "VIA — نقاط قوت",
    subtitle: "۲۴ نقطه قوت شخصیتی",
    time: "۲۰–۲۵ دقیقه",
    count: 72,
    icon: Sparkles,
    color: "text-amber-500",
    purpose:
      "بر اساس روان‌شناسی مثبت‌گرا (سلیگمن و پیترسون)، ۲۴ نقطه قوت اصلی انسان را در شش فضیلت ریشه‌ای (خرد، شجاعت، انسانیت، عدالت، اعتدال، تعالی) رتبه‌بندی می‌کند تا «امضای شخصیتی» تو را پیدا کند.",
    useCase:
      "وقتی احساس می‌کنی پتانسیلت را به کار نمی‌گیری، یا می‌خواهی بدانی در چه فعالیت‌هایی به‌طور طبیعی شکوفا می‌شوی. پنج نقطه قوت اول تو در پیشنهادها و طراحی مداخله‌های AI استفاده می‌شوند تا راهکارها متناسب با خودت باشند، نه عمومی.",
  },
  {
    type: "ecr",
    title: "ECR-R",
    subtitle: "سبک دلبستگی بزرگسالان",
    time: "۱۰ دقیقه",
    count: 36,
    icon: Heart,
    color: "text-rose-500",
    purpose:
      "سبک دلبستگی تو را در دو بُعد اضطراب (ترس از طرد) و اجتناب (دوری از صمیمیت) می‌سنجد و در یکی از چهار سبک قرار می‌دهد: ایمن، مضطرب-دل‌مشغول، اجتنابی-بی‌اعتنا، یا اجتنابی-ترس‌خورده.",
    useCase:
      "وقتی می‌خواهی الگوهای تکرارشونده در روابط نزدیکت را بفهمی — چرا برخی موقعیت‌ها تو را مضطرب می‌کنند، چرا گاهی فاصله می‌گیری، یا چرا اعتماد کردن سخت است. این تست به AI کمک می‌کند بازخوردهای مرتبط با روابط را مناسب‌تر ارائه دهد.",
  },
] as const;

export default function SelfKnowledgeView() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<Record<string, { idx: number; completed: boolean }>>({});
  const [results, setResults] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: pr }, { data: rs }] = await Promise.all([
        supabase.from("assessment_responses").select("assessment_type, current_index, completed").eq("user_id", user.id),
        supabase.from("assessment_results").select("assessment_type").eq("user_id", user.id),
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
    <div dir="rtl" className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">خودشناسی</h1>
        <p className="text-muted-foreground leading-relaxed">
          ارزیابی‌های روان‌سنجی استاندارد. هر تست را می‌توانی یکجا یا در چند جلسه انجام دهی — پاسخ‌ها خودکار ذخیره می‌شوند.
          پس از تکمیل، می‌توانی «تحلیل جامع AI» مخصوص نتیجه خودت را دریافت کنی.
        </p>
      </div>

      <Card className="bg-muted/30">
        <CardContent className="p-5 text-sm leading-relaxed space-y-2">
          <div className="flex items-center gap-2 font-medium">
            <Info className="w-4 h-4 text-primary" /> سه مسیر ورود
          </div>
          <ul className="space-y-1 list-disc pe-5 text-muted-foreground">
            <li><strong>Deep Dive:</strong> همه ۱۶۸ سوال در یک نشست (~۵۰ دقیقه)</li>
            <li><strong>Split Sessions:</strong> در چند جلسه ۱۵–۲۰ دقیقه‌ای</li>
            <li><strong>Mini:</strong> فقط HEXACO برای کالیبراسیون لحن AI</li>
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {TESTS.map((t) => {
          const Icon = t.icon;
          const p = progress[t.type];
          const done = !!results[t.type];
          const pct = p ? ((p.idx + 1) / t.count) * 100 : 0;
          return (
            <Card key={t.type} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Icon className={`w-8 h-8 ${t.color}`} />
                  {done && <Badge variant="secondary"><CheckCircle2 className="w-3 h-3 ms-1" /> تکمیل</Badge>}
                  {!done && p && !p.completed && <Badge variant="outline"><Clock className="w-3 h-3 ms-1" /> ناتمام</Badge>}
                </div>
                <CardTitle className="mt-3">{t.title}</CardTitle>
                <CardDescription>{t.subtitle}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  {t.count} سوال · {t.time}
                </div>
                {p && !p.completed && (
                  <div className="space-y-1">
                    <Progress value={pct} className="h-1.5" />
                    <div className="text-xs text-muted-foreground">{p.idx + 1} از {t.count}</div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button asChild className="flex-1">
                    <Link to={`/app/self/test/${t.type}`}>
                      {p && !p.completed ? "ادامه" : done ? "انجام مجدد" : "شروع"}
                    </Link>
                  </Button>
                  {done && (
                    <Button asChild variant="outline">
                      <Link to={`/app/self/result/${t.type}`}>گزارش</Link>
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
          <CardTitle className="text-lg">این تست‌ها برای چه چیزی هستند؟</CardTitle>
          <CardDescription>قبل از شروع، بخوان تا بدانی هر تست چه چیزی به تو می‌گوید و چه زمانی به دردت می‌خورد.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {TESTS.map((t) => (
              <AccordionItem key={t.type} value={t.type}>
                <AccordionTrigger className="text-end hover:no-underline">
                  <div className="flex items-center gap-2">
                    <t.icon className={`w-5 h-5 ${t.color}`} />
                    <span className="font-medium">{t.title} — {t.subtitle}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 leading-relaxed text-sm pt-2">
                  <div>
                    <div className="font-medium text-foreground mb-1">🎯 هدف</div>
                    <p className="text-muted-foreground">{t.purpose}</p>
                  </div>
                  <div>
                    <div className="font-medium text-foreground mb-1">⏰ چه زمانی استفاده کنم؟</div>
                    <p className="text-muted-foreground">{t.useCase}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ردیابی روزانه</CardTitle>
          <CardDescription>ثبت خلق، انرژی، خواب و تمرکز برای الگویابی بلندمدت</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/app/checkin">رفتن به Check-in روزانه</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
