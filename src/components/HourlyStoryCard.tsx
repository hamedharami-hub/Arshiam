import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, Sparkles } from "lucide-react";
import { getStoryForHour } from "@/lib/hourlyStories";

export function HourlyStoryCard({ story = getStoryForHour() }: { story?: ReturnType<typeof getStoryForHour> }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-start w-full"
        aria-label="باز کردن داستان آموزنده‌ی این ساعت"
      >
        <Card className="border-accent/30 bg-gradient-to-br from-accent/10 via-transparent to-primary/5 hover:bg-accent/15 transition cursor-pointer h-full">
          <CardContent className="p-4 flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-accent-foreground/80 shrink-0 mt-1" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> داستان این ساعت · Story of the hour
              </p>
              <p className="text-sm font-semibold leading-snug">{story.title_fa}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{story.title_en}</p>
              <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2 leading-5">
                {story.body_fa}
              </p>
              <p className="text-[10px] text-primary mt-1.5">برای خواندن کامل بزن →</p>
            </div>
          </CardContent>
        </Card>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <span>{story.title_fa}</span>
            </DialogTitle>
            <p className="text-xs text-muted-foreground text-start">{story.title_en}</p>
          </DialogHeader>

          <div dir="rtl" className="space-y-4 mt-2">
            <section>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">فارسی</p>
              <p className="text-sm leading-7 whitespace-pre-line">{story.body_fa}</p>
            </section>

            <section dir="ltr" className="text-start">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">English</p>
              <p className="text-sm leading-7 whitespace-pre-line">{story.body_en}</p>
            </section>

            <section className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <p className="text-xs font-semibold text-primary flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> پیام · Lesson
              </p>
              <p dir="rtl" className="text-sm leading-7">{story.lesson_fa}</p>
              <p dir="ltr" className="text-sm leading-7 text-muted-foreground">{story.lesson_en}</p>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
