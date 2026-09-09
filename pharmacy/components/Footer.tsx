'use client';

import React from 'react';
import { Language } from '@/types/pharmacy';
import { ShieldCheck, ExternalLink, BookOpen, Award, Heart, Sparkles, Scale } from 'lucide-react';

interface FooterProps {
  language: Language;
}

export const Footer: React.FC<FooterProps> = ({ language }) => {
  const isFa = language === 'fa';

  return (
    <footer className="mt-12 border-t app-border bg-black/20 text-xs app-text pt-8 pb-10">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        {/* Top Grid Sections */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Col 1: About Portal */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm tracking-wide app-text">
                {isFa ? 'سامانه جامع داروسازی استرالیا' : 'AU Pharmacy Study Portal'}
              </span>
            </div>
            <p className="app-muted text-[11px] leading-relaxed">
              {isFa
                ? 'پلتفرم یادگیری تعاملی داروسازی استرالیا بر پایهٔ قوانین دارویی و راهنماهای بالینی PSA و SHPA.'
                : 'Interactive Australian pharmacy study and clinical decision-support portal aligned with professional standards.'}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono font-bold text-[10px] border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                {isFa ? 'به‌روز برای ۲۰۲۶' : 'Updated for 2026'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 font-mono font-bold text-[10px] border border-sky-500/30">
                v4.5 Pro Website
              </span>
            </div>
          </div>

          {/* Col 2: Official References */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs app-text flex items-center gap-1.5 border-b app-border pb-1">
              <Scale className="w-3.5 h-3.5 text-sky-400" />
              {isFa ? 'مراجع رسمی داروسازی' : 'Official Guidelines'}
            </h4>
            <ul className="space-y-1.5 text-[11px] app-muted">
              <li>
                <a
                  href="https://www.pharmacyboard.gov.au"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-sky-400 transition flex items-center justify-between"
                >
                  <span>{isFa ? 'بورد داروسازی استرالیا (PBA)' : 'Pharmacy Board of Australia'}</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.psa.org.au"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-sky-400 transition flex items-center justify-between"
                >
                  <span>{isFa ? 'انجمن داروسازان استرالیا (PSA)' : 'Pharmaceutical Society of Australia'}</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.shpa.org.au"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-sky-400 transition flex items-center justify-between"
                >
                  <span>{isFa ? 'انجمن داروسازان بیمارستانی (SHPA)' : 'SHPA Australia'}</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.pbs.gov.au"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-sky-400 transition flex items-center justify-between"
                >
                  <span>{isFa ? 'سامانه یارانه دارویی (PBS)' : 'Pharmaceutical Benefits Scheme'}</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Exam & Tools */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs app-text flex items-center gap-1.5 border-b app-border pb-1">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              {isFa ? 'امکانات مطالعه وب' : 'Web Study Suite'}
            </h4>
            <ul className="space-y-1.5 text-[11px] app-muted">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>{isFa ? 'مطالعه متنی با تحلیل بالینی' : 'Structured Text Recall'}</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>{isFa ? 'فلش‌کارت‌های مرور سریع (Speed)' : 'Interactive Flashcards'}</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>{isFa ? 'دستیار بالینی هوش مصنوعی (Gemini)' : 'AI Clinical Tutor'}</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span>{isFa ? 'سامانه علامت‌گذاری پرچمدار' : 'Flag & Review System'}</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Legal & Disclaimer */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs app-text flex items-center gap-1.5 border-b app-border pb-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              {isFa ? 'تکذیبیه بالینی' : 'Clinical Disclaimer'}
            </h4>
            <p className="app-muted text-[10.5px] leading-relaxed">
              {isFa
                ? 'محتوای ارائه شده صرفاً جهت آمادگی در آزمون‌های ارزیابی داروسازی و مرور آموزشی است. برای تصمیم‌گیری‌های بالینی واقعی، همیشه به آخرین نسخه AMH و Therapeutic Guidelines مراجعه نمایید.'
                : 'Content is educational. Always consult the latest AMH and official state poisons legislation for clinical decision-making.'}
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-4 border-t app-border flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] app-muted">
          <div className="flex items-center gap-1">
            <span>© {new Date().getFullYear()} Australian Pharmacy Learning Portal.</span>
            <span className="hidden sm:inline">|</span>
            <span className="hidden sm:inline">{isFa ? 'طراحی شده با استاندارد وبسایت‌های مدرن' : 'Designed with Modern Web Standards'}</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
              {isFa ? 'برای داروسازان آینده استرالیا' : 'For Future Australian Pharmacists'}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
