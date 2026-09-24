import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ShieldAlert,
  Phone,
  PhoneCall,
  ExternalLink,
  MessageSquare,
  Copy,
  Check,
  Heart,
  Wind,
  Compass,
  ArrowLeft,
  ArrowRight,
  LogOut,
  AlertTriangle,
  Globe,
  Info,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBilingual } from "@/hooks/useBilingual";
import {
  SUPPORT_REGIONS,
  resolveSupportRegion,
  setStoredSupportRegion,
  getCrisisResources,
  type SupportRegion,
  type CrisisResource,
} from "@/lib/crisisResources";
import { toast } from "sonner";

export default function CrisisView() {
  const navigate = useNavigate();
  const { T, isEn } = useBilingual();
  const [selectedRegion, setSelectedRegion] = useState<SupportRegion>(() =>
    resolveSupportRegion(isEn ? "en" : "fa")
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const resources = getCrisisResources(selectedRegion);
  const emergencyResources = resources.filter((r) => r.isEmergency);
  const helplineResources = resources.filter((r) => !r.isEmergency);

  const handleRegionChange = (region: SupportRegion) => {
    setSelectedRegion(region);
    setStoredSupportRegion(region);
    toast.success(
      isEn
        ? `Support region set to ${SUPPORT_REGIONS.find((r) => r.code === region)?.label_en}`
        : `منطقه پشتیبانی به ${SUPPORT_REGIONS.find((r) => r.code === region)?.label} تغییر یافت`
    );
  };

  const handleCopy = async (phone: string, id: string) => {
    if (!phone) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(phone);
        setCopiedId(id);
        toast.success(T("شماره کپی شد", "Phone number copied"));
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        toast.error(T("عدم دسترسی به کلیپ‌بورد", "Clipboard not accessible"));
      }
    } catch {
      toast.error(T("کپی در کلیپ‌بورد انجام نشد", "Failed to copy phone number"));
    }
  };

  // Immediate exit / back-to-safety handler
  const handleQuickExit = () => {
    navigate("/app/today", { replace: true });
  };

  const BackIcon = isEn ? ArrowLeft : ArrowRight;

  return (
    <div
      dir={isEn ? "ltr" : "rtl"}
      className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 pb-24 animate-fade-in"
      data-testid="crisis-page"
    >
      {/* Top Bar: Return to Mind & Quick Exit to Safety */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/app/mind")}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          <BackIcon className={`w-3.5 h-3.5 ${isEn ? "me-1" : "ms-1"}`} />
          {T("داشبورد ذهن", "Mind Dashboard")}
        </Button>

        {/* High-visibility Quick Exit Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleQuickExit}
          className="border-rose-300 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 font-medium text-xs shadow-xs"
          data-testid="quick-exit-button"
        >
          <LogOut className={`w-3.5 h-3.5 ${isEn ? "me-1.5" : "ms-1.5"}`} />
          {T("خروج سریع به فضای امن", "Quick Exit to Safety")}
        </Button>
      </div>

      {/* Mandatory Non-Emergency & Non-Diagnosis Clinical Disclaimer */}
      <Card
        className="border-2 border-amber-500/40 bg-amber-500/10 shadow-xs"
        data-testid="clinical-disclaimer-card"
      >
        <CardContent className="p-4 sm:p-5 flex items-start gap-3.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed">
            <h2 className="font-bold text-amber-900 dark:text-amber-200">
              {T(
                "اطلاعیه ایمنی مهم — ARSHNAZ اورژانس نیست و تشخیص ارائه نمی‌دهد",
                "Important Safety Notice — ARSHNAZ is not an emergency service"
              )}
            </h2>
            <p className="text-amber-800/90 dark:text-amber-300/90">
              {T(
                "این اپلیکیشن ابزار خودیاری، برنامه‌ریزی و ارزیابی شخصی است و جایگزین خدمات اورژانسی، مراقبت‌های روان‌پزشکی یا تشخیص بالینی نیست. هیچ سیستم هوش مصنوعی در تصمیم‌گیری یا ارائه خدمات بحران دخالت ندارد. اگر خود یا فرد دیگری در خطر فوری آسیب جسمی یا خودکشی هستید، لطفاً بلافاصله با خطوط اورژانس زیر تماس بگیرید.",
                "ARSHNAZ is a self-reflection, planning, and self-assessment tool. It is NOT an emergency service and does NOT provide clinical diagnosis, medical therapy, or emergency dispatch. No AI system is involved in crisis routing or emergency response. If you or someone else is in immediate danger of injury or self-harm, call the emergency numbers below immediately."
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Hero & Region Selector */}
      <Card className="p-5 border-border/70 bg-card/70 backdrop-blur-xs shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center h-11 w-11 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {T("پشتیبانی بحران و خطوط کمکی فوری (SOS)", "Crisis Support & Emergency Services (SOS)")}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {T(
                  "خطوط رایگان، محرمانه و ۲۴ ساعته برای گفتگو و دریافت کمک در شرایط سخت.",
                  "Free, confidential, 24/7 helplines ready to listen and help right now."
                )}
              </p>
            </div>
          </div>

          {/* Region Picker Badges */}
          <div className="space-y-1.5 shrink-0">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" />
              {T("انتخاب منطقه پشتیبانی:", "Support Region:")}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap" data-testid="region-selector">
              {SUPPORT_REGIONS.map((r) => {
                const active = selectedRegion === r.code;
                return (
                  <Button
                    key={r.code}
                    variant={active ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleRegionChange(r.code)}
                    className={`h-8 px-2.5 text-xs rounded-lg transition-all ${
                      active
                        ? "shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid={`region-btn-${r.code}`}
                  >
                    <span className="me-1">{r.flag}</span>
                    <span>{isEn ? r.label_en : r.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Immediate Life Danger Alert Card */}
      {emergencyResources.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs uppercase tracking-wider font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <PhoneCall className="w-4 h-4 animate-bounce" />
            {T("خطر فوری و نجات جانی", "Immediate Life Danger & Emergency")}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {emergencyResources.map((res) => (
              <Card
                key={res.id}
                className="border-2 border-rose-500/50 bg-rose-500/10 shadow-sm relative overflow-hidden"
                data-testid={`emergency-card-${res.id}`}
              >
                <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="destructive" className="text-[10px] uppercase font-bold">
                        {isEn ? res.available_en : res.available}
                      </Badge>
                      <span className="text-xs font-mono font-semibold text-muted-foreground">
                        {isEn ? "Emergency" : "اورژانس"}
                      </span>
                    </div>
                    <h4 className="font-bold text-base text-foreground pt-1">
                      {isEn ? res.name_en : res.name}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {isEn ? res.description_en : res.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    {res.phone && (
                      <Button
                        asChild
                        size="lg"
                        className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md gap-2"
                        data-testid={`call-btn-${res.id}`}
                      >
                        <a href={`tel:${res.phone}`}>
                          <Phone className="w-4 h-4" />
                          <span>{T(`تماس با ${res.displayPhone}`, `Call ${res.displayPhone}`)}</span>
                        </a>
                      </Button>
                    )}
                    {res.phone && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopy(res.phone, res.id)}
                        title={T("کپی شماره", "Copy phone number")}
                        className="h-10 w-10 shrink-0"
                      >
                        {copiedId === res.id ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 24/7 Crisis Support & Counseling Helplines */}
      <div className="space-y-3">
        <h3 className="text-xs uppercase tracking-wider font-bold text-foreground flex items-center gap-1.5">
          <Heart className="w-4 h-4 text-primary" />
          {T("خطوط مشاوره و پشتیبانی بحران", "Crisis Support & Counseling Helplines")}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {helplineResources.map((res) => (
            <Card
              key={res.id}
              className="border-border/60 bg-card/60 hover:bg-card/90 transition shadow-xs flex flex-col justify-between"
              data-testid={`helpline-card-${res.id}`}
            >
              <CardContent className="p-4 sm:p-5 space-y-3.5 flex flex-col justify-between h-full">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-sm sm:text-base text-foreground">
                      {isEn ? res.name_en : res.name}
                    </h4>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">
                      {isEn ? res.available_en : res.available}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isEn ? res.description_en : res.description}
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    {res.phone ? (
                      <Button
                        asChild
                        size="sm"
                        className="flex-1 font-semibold text-xs gap-1.5"
                        data-testid={`call-btn-${res.id}`}
                      >
                        <a href={`tel:${res.phone}`}>
                          <Phone className="w-3.5 h-3.5" />
                          <span>{T(`تماس: ${res.displayPhone}`, `Call: ${res.displayPhone}`)}</span>
                        </a>
                      </Button>
                    ) : res.url ? (
                      <Button
                        asChild
                        size="sm"
                        variant="default"
                        className="flex-1 font-semibold text-xs gap-1.5"
                      >
                        <a href={res.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{T("ورود به وب‌سایت راهنما", "Open Resource Website")}</span>
                        </a>
                      </Button>
                    ) : null}

                    {res.phone && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopy(res.phone, res.id)}
                        className="h-9 w-9 shrink-0"
                        title={T("کپی شماره", "Copy phone number")}
                      >
                        {copiedId === res.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    )}

                    {res.sms && (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1 shrink-0"
                        title={T("ارسال پیامک", "Send SMS")}
                      >
                        <a href={`sms:${res.sms}`}>
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>SMS</span>
                        </a>
                      </Button>
                    )}

                    {res.url && res.phone && (
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        title={T("مشاهده وب‌سایت رسمی", "Open official website")}
                      >
                        <a href={res.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Grounding & Immediate Coping Micro-Actions (Static & Offline) */}
      <Card className="border-border/60 bg-card/60 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Wind className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-sm sm:text-base text-foreground">
            {T("تمرین‌های تثبیت در لحظه (Grounding) و کاهش فشار شدید", "Immediate Grounding & De-escalation Steps")}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs leading-relaxed">
          {/* Step 1: 5-4-3-2-1 */}
          <div className="p-3.5 rounded-xl border border-border/60 bg-background/50 space-y-1.5">
            <span className="font-bold text-primary flex items-center gap-1">
              <span>۱.</span>
              {T("تکنیک حواس پنج‌گانه (۵-۴-۳-۲-۱)", "5-4-3-2-1 Sensory Grounding")}
            </span>
            <p className="text-muted-foreground">
              {T(
                "۵ چیز که می‌بینی، ۴ چیز که لمس می‌کنی، ۳ صدا که می‌شنوی، ۲ بو که حس می‌کنی و ۱ چیز که می‌چشی را با صدای آرام نام ببر.",
                "Notice 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste."
              )}
            </p>
          </div>

          {/* Step 2: Box Breathing */}
          <div className="p-3.5 rounded-xl border border-border/60 bg-background/50 space-y-1.5 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="font-bold text-primary flex items-center gap-1">
                <span>۲.</span>
                {T("تنفس مربعی (۴-۴-۴-۴)", "Box Breathing (4-4-4-4)")}
              </span>
              <p className="text-muted-foreground">
                {T(
                  "۴ ثانیه دم آرام، ۴ ثانیه حبس نفس، ۴ ثانیه بازدم پیوسته و ۴ ثانیه مکث. ۳ تا ۵ بار تکرار کن.",
                  "Inhale for 4s, hold for 4s, exhale slowly for 4s, pause for 4s. Repeat 4–5 cycles."
                )}
              </p>
            </div>
            <Button asChild variant="secondary" size="sm" className="mt-2 text-xs w-full">
              <Link to="/app/breathing">
                <Wind className="w-3.5 h-3.5 me-1" />
                {T("ورود به تمرین تنفس ۳بعدی", "Open 3D Breathing")}
              </Link>
            </Button>
          </div>

          {/* Step 3: Safety Action */}
          <div className="p-3.5 rounded-xl border border-border/60 bg-background/50 space-y-1.5">
            <span className="font-bold text-primary flex items-center gap-1">
              <span>۳.</span>
              {T("امن‌سازی محیط و برقراری ارتباط", "Create Safety & Connect")}
            </span>
            <p className="text-muted-foreground">
              {T(
                "هر وسیله آسیب‌رسان را از دسترس خود دور کن. به یک فضای آرام و پرنور برو و اگر می‌توانی با یک دوست یا فرد مورد اعتماد تماس بگیر.",
                "Put distance between yourself and any means of harm. Move to a safe, well-lit space and reach out to someone you trust."
              )}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
