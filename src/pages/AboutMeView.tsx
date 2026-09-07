import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Sparkles, Save, RefreshCw, ChevronLeft, ChevronRight, Loader2, FolderPlus, Tag as TagIcon, ListTodo } from "lucide-react";
import { ABOUT_SECTIONS, loadAboutMe, saveAboutMe, type AboutMeRow, type AboutAnswer } from "@/lib/aboutMe";
import { getAILanguage } from "@/lib/ai";

export default function AboutMeView() {
  const { user } = useAuth();
  const [row, setRow] = useState<AboutMeRow | null>(null);
  const [answers, setAnswers] = useState<Record<string, AboutAnswer>>({});
  const [freeText, setFreeText] = useState("");
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"wizard" | "review">("wizard");
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadAboutMe(user.id).then((r) => {
      if (r) {
        setRow(r);
        setAnswers(r.answers || {});
        setFreeText(r.free_text || "");
        if (r.ai_analysis) setMode("review");
      }
    });
  }, [user]);

  const setAns = (k: string, v: AboutAnswer) => setAnswers((s) => ({ ...s, [k]: v }));

  const persist = async () => {
    if (!user) return;
    await saveAboutMe(user.id, { answers, free_text: freeText });
  };

  const next = async () => {
    await persist();
    if (step < ABOUT_SECTIONS.length) setStep(step + 1);
    else await analyze();
  };

  const analyze = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await persist();
      const { data, error } = await supabase.functions.invoke("about-me-analyze", {
        body: { answers, freeText, language: getAILanguage() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await saveAboutMe(user.id, {
        ai_analysis: data.analysis,
        ai_suggestions: data.suggestions,
        analyzed_at: new Date().toISOString(),
      } as any);
      const fresh = await loadAboutMe(user.id);
      if (fresh) setRow(fresh);
      setMode("review");
      toast.success("تحلیل آماده شد ✨");
    } catch (e: any) {
      toast.error(e.message || "خطا در تحلیل");
    } finally {
      setBusy(false);
    }
  };

  const createFolder = async (name: string) => {
    if (!user) return;
    setApplying("folder:" + name);
    const { error } = await supabase.from("folders").insert({ user_id: user.id, name });
    setApplying(null);
    if (error) toast.error(error.message);
    else toast.success("فولدر «" + name + "» ساخته شد");
  };

  const createTag = async (name: string) => {
    if (!user) return;
    setApplying("tag:" + name);
    const { error } = await supabase.from("tags").insert({ user_id: user.id, name });
    setApplying(null);
    if (error) toast.error(error.message);
    else toast.success("تگ «" + name + "» ساخته شد");
  };

  const createTask = async (t: { title: string; folder?: string; priority?: any }) => {
    if (!user) return;
    setApplying("task:" + t.title);
    let folder_id: string | null = null;
    if (t.folder) {
      const { data: f } = await supabase.from("folders").select("id").eq("name", t.folder).maybeSingle();
      if (f) folder_id = (f as any).id;
      else {
        const { data: created } = await supabase.from("folders").insert({ user_id: user.id, name: t.folder }).select().maybeSingle();
        if (created) folder_id = (created as any).id;
      }
    }
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id, title: t.title, folder_id, priority: (t.priority as any) || "none",
    });
    setApplying(null);
    if (error) toast.error(error.message);
    else toast.success("تسک ساخته شد");
  };

  // ----- Render -----
  if (mode === "review" && row?.ai_analysis) {
    const a = row.ai_analysis;
    const s = row.ai_suggestions;
    return (
      <div dir="rtl" className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" /> درباره من
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setMode("wizard"); setStep(0); }}>
              ✏️ ویرایش پاسخ‌ها
            </Button>
            <Button size="sm" onClick={analyze} disabled={busy} className="gap-1">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              تحلیل مجدد
            </Button>
          </div>
        </div>

        <Card className="p-5 space-y-3">
          <h2 className="font-semibold">📋 خلاصه</h2>
          <p className="text-sm leading-7 text-foreground">{a.summary}</p>
        </Card>

        {a.themes && a.themes.length > 0 && (
          <Card className="p-5 space-y-3">
            <h2 className="font-semibold">🎯 تم‌های اصلی زندگی</h2>
            <div className="flex flex-wrap gap-2">
              {a.themes.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
            </div>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {a.strengths && a.strengths.length > 0 && (
            <Card className="p-5 space-y-2">
              <h2 className="font-semibold text-success">💪 نقاط قوت</h2>
              <ul className="text-sm space-y-1.5 list-disc pe-5">
                {a.strengths.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </Card>
          )}
          {a.risks && a.risks.length > 0 && (
            <Card className="p-5 space-y-2">
              <h2 className="font-semibold text-warning">⚠️ موانع و ریسک‌ها</h2>
              <ul className="text-sm space-y-1.5 list-disc pe-5">
                {a.risks.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </Card>
          )}
        </div>

        {s?.folders && s.folders.length > 0 && (
          <Card className="p-5 space-y-3">
            <h2 className="font-semibold flex items-center gap-2"><FolderPlus className="w-4 h-4" /> فولدرهای پیشنهادی</h2>
            <div className="flex flex-wrap gap-2">
              {s.folders.map((f) => (
                <Button key={f} size="sm" variant="outline" disabled={applying === "folder:" + f}
                  onClick={() => createFolder(f)}>
                  + {f}
                </Button>
              ))}
            </div>
          </Card>
        )}

        {s?.tags && s.tags.length > 0 && (
          <Card className="p-5 space-y-3">
            <h2 className="font-semibold flex items-center gap-2"><TagIcon className="w-4 h-4" /> تگ‌های پیشنهادی</h2>
            <div className="flex flex-wrap gap-2">
              {s.tags.map((t) => (
                <Button key={t} size="sm" variant="outline" disabled={applying === "tag:" + t}
                  onClick={() => createTag(t)}>
                  # {t}
                </Button>
              ))}
            </div>
          </Card>
        )}

        {s?.tasks && s.tasks.length > 0 && (
          <Card className="p-5 space-y-3">
            <h2 className="font-semibold flex items-center gap-2"><ListTodo className="w-4 h-4" /> تسک‌های شروع‌کننده</h2>
            <div className="space-y-2">
              {s.tasks.map((t, i) => (
                <div key={i} className="flex items-center gap-2 border rounded-md p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <div className="flex gap-1 mt-1">
                      {t.folder && <Badge variant="outline" className="text-[10px]">📁 {t.folder}</Badge>}
                      {t.priority && t.priority !== "none" && <Badge variant="outline" className="text-[10px]">⚡ {t.priority}</Badge>}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" disabled={applying === "task:" + t.title}
                    onClick={() => createTask(t)}>
                    افزودن
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        <p className="text-xs text-muted-foreground text-center pt-2">
          هر زمان خواستی، با «ویرایش پاسخ‌ها» جواب‌ها رو عوض کن و دوباره تحلیل بگیر.
        </p>
      </div>
    );
  }

  // ----- Wizard -----
  const totalSteps = ABOUT_SECTIONS.length + 1; // +1 for free text final
  const isFreeStep = step === ABOUT_SECTIONS.length;
  const section = ABOUT_SECTIONS[step];
  const progress = Math.round(((step + 1) / (totalSteps + 1)) * 100);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" /> درباره من
        </h1>
        <span className="text-xs text-muted-foreground">گام {step + 1} از {totalSteps}</span>
      </div>

      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>

      <Card className="p-5 space-y-5">
        {!isFreeStep ? (
          <>
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <span>{section.emoji}</span> {section.title}
            </h2>
            <div className="space-y-5">
              {section.questions.map((q) => (
                <div key={q.key} className="space-y-2">
                  <Label className="text-sm">{q.label}</Label>
                  {q.type === "text" && (
                    <Input value={(answers[q.key] as string) || ""} placeholder={q.placeholder}
                      onChange={(e) => setAns(q.key, e.target.value)} />
                  )}
                  {q.type === "longtext" && (
                    <Textarea rows={3} value={(answers[q.key] as string) || ""}
                      onChange={(e) => setAns(q.key, e.target.value)} />
                  )}
                  {q.type === "single" && (
                    <RadioGroup value={(answers[q.key] as string) || ""} onValueChange={(v) => setAns(q.key, v)}>
                      <div className="flex flex-wrap gap-2">
                        {q.options.map((o) => (
                          <label key={o} className={`flex items-center gap-2 border rounded-md px-3 py-1.5 cursor-pointer text-sm transition ${answers[q.key] === o ? "bg-accent border-primary" : "hover:bg-muted"}`}>
                            <RadioGroupItem value={o} className="sr-only" />
                            <span>{o}</span>
                          </label>
                        ))}
                      </div>
                    </RadioGroup>
                  )}
                  {q.type === "multi" && (
                    <div className="flex flex-wrap gap-2">
                      {q.options.map((o) => {
                        const arr = (answers[q.key] as string[]) || [];
                        const on = arr.includes(o);
                        return (
                          <label key={o} className={`flex items-center gap-2 border rounded-md px-3 py-1.5 cursor-pointer text-sm transition ${on ? "bg-accent border-primary" : "hover:bg-muted"}`}>
                            <Checkbox checked={on} onCheckedChange={(v) => {
                              const next = v ? [...arr, o] : arr.filter((x) => x !== o);
                              setAns(q.key, next);
                            }} />
                            <span>{o}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <span>📝</span> هر چیز دیگری دوست داری بگی
            </h2>
            <p className="text-xs text-muted-foreground">
              این متن آزاد به AI کمک می‌کنه تو رو بهتر بشناسه. هر چیزی — قصه، حس، رویا، گلایه — رو می‌تونی بنویسی.
            </p>
            <Textarea rows={10} value={freeText} onChange={(e) => setFreeText(e.target.value)}
              placeholder="هر چه به ذهنت می‌رسد..." />
          </>
        )}
      </Card>

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" disabled={step === 0 || busy}
          onClick={() => setStep((s) => Math.max(0, s - 1))} className="gap-1">
          <ChevronRight className="w-4 h-4" /> قبلی
        </Button>
        <Button variant="ghost" size="sm" onClick={persist} className="gap-1 text-xs">
          <Save className="w-3 h-3" /> ذخیره
        </Button>
        {step < ABOUT_SECTIONS.length ? (
          <Button onClick={next} disabled={busy} className="gap-1">
            بعدی <ChevronLeft className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={analyze} disabled={busy} className="gap-1">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            تحلیل با AI
          </Button>
        )}
      </div>
    </div>
  );
}
