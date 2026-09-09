'use client';

import React, { useState } from 'react';
import { Language } from '@/types/pharmacy';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  Stethoscope,
  Clock,
  ShieldAlert,
  Info,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { haptic } from '@/lib/haptics';

export type S3ProtocolType = 'triptan' | 'emergency_contraception' | 'chloramphenicol' | 'ppi' | 'salbutamol';

export interface S3ProtocolDefinition {
  id: S3ProtocolType;
  title: { fa: string; en: string };
  drugExamples: string[];
  schedule: 'S3';
  checklistItems: Array<{
    id: string;
    text: { fa: string; en: string };
    isRedFlag?: boolean;
    mandatoryChecked: boolean; // Must be checked (true) or unchecked (false) to supply
  }>;
  counselingPoints: { fa: string[]; en: string[] };
  referralCriteria: { fa: string[]; en: string[] };
}

export const PSA_S3_PROTOCOLS: Record<S3ProtocolType, S3ProtocolDefinition> = {
  triptan: {
    id: 'triptan',
    title: {
      fa: 'پروتکل رسمی PSA برای سوماتریپتان و زولمیتریپتان (Oral Triptans S3)',
      en: 'PSA Practice Protocol: Oral Triptans for Acute Migraine (S3)',
    },
    drugExamples: ['Imigran 50mg', 'Zomig 2.5mg', 'Sumatriptan Chemist Own'],
    schedule: 'S3',
    checklistItems: [
      {
        id: 'c1',
        text: {
          fa: 'آیا تشخیص میگرن پیش‌تر توسط پزشک تایید شده است؟ (الزام قطعی)',
          en: 'Has the diagnosis of migraine been previously established by a doctor?',
        },
        mandatoryChecked: true,
      },
      {
        id: 'c2',
        text: {
          fa: 'سن بیمار بین ۱۸ تا ۶۵ سال است؟',
          en: 'Is the patient aged between 18 and 65 years?',
        },
        mandatoryChecked: true,
      },
      {
        id: 'c3',
        text: {
          fa: 'تعداد حملات میگرن بیمار در ماه کمتر یا مساوی ۲ حمله است؟ (بیش از آن نیاز به داروی پیشگیرانه دارد)',
          en: 'Are attacks ≤ 2 per month? (More frequent attacks warrant GP referral for prophylaxis).',
        },
        mandatoryChecked: true,
      },
      {
        id: 'c4',
        text: {
          fa: 'سابقه بیماری ایسکمیک قلب، سکته مغزی، TIA یا فشار خون کنترل‌نشده وجود ندارد؟',
          en: 'Absence of ischemic heart disease, prior stroke/TIA, or uncontrolled hypertension?',
        },
        mandatoryChecked: true,
      },
      {
        id: 'c5',
        text: {
          fa: 'عدم مصرف همزمان مهارکننده‌های MAO یا دوزهای بالای SSRI/SNRI (ریسک سندروم سروتونین).',
          en: 'No concurrent MAOI or high-dose SSRI/SNRI therapy (serotonin toxicity risk).',
        },
        mandatoryChecked: true,
      },
    ],
    counselingPoints: {
      fa: [
        'قرص را در شروع فاز سردرد میل کنید؛ مصرف در مرحله اورا (Aura) اثربخش نیست.',
        'در صورت عدم تسکین، دوز دوم برای همان حمله توصیه نمی‌شود (می‌توان از NSAID استفاده کرد).',
        'در صورت عود مجدد سردرد در همان روز، حداقل ۲ ساعت بین دو دوز فاصله بگذارید.',
      ],
      en: [
        'Take at the onset of headache phase; ineffective if taken during the aura phase.',
        'If the first dose does not relieve symptoms, do NOT take a second dose for the same attack.',
        'If headache recurs, wait at least 2 hours before a second dose (maximum 100mg sumatriptan / 24h).',
      ],
    },
    referralCriteria: {
      fa: [
        'بیش از ۲ حمله میگرن در ماه (نیاز به درمان پروفیلاکسی)',
        'سردرد شدید ناگهانی شبیه صاعقه (Thunderclap headache)',
        'عدم پاسخ به دو نوبت درمان تریپتان در حملات قبلی',
      ],
      en: [
        'Frequency > 2 attacks per month (requires GP review for prophylactic therapy).',
        'Sudden, severe thunderclap headache (emergency red flag).',
        'Failure to respond to triptans in 2 previous attacks.',
      ],
    },
  },
  emergency_contraception: {
    id: 'emergency_contraception',
    title: {
      fa: 'پروتکل رسمی PSA برای قرص اورژانس پیشگیری از بارداری (Emergency Contraception S3)',
      en: 'PSA Practice Protocol: Emergency Contraception Supply (S3)',
    },
    drugExamples: ['Postinor-1 / NorLevo (Levonorgestrel)', 'Ella (Ulipristal Acetate 30mg)'],
    schedule: 'S3',
    checklistItems: [
      {
        id: 'ec1',
        text: {
          fa: 'زمان سپری‌شده از رابطه محافظت‌نشده مشخص شده است؟ (تا ۷۲ ساعت هر دو دارو؛ ۷۲ تا ۱۲۰ ساعت فقط Ulipristal)',
          en: 'Time elapsed identified? (≤72h: Levonorgestrel or Ulipristal; 72-120h: Ulipristal only).',
        },
        mandatoryChecked: true,
      },
      {
        id: 'ec2',
        text: {
          fa: 'وزن / BMI بیمار بررسی شد؟ (در وزن >70kg یا BMI >26 داروی Ulipristal ارجح است)',
          en: 'Weight/BMI assessed? (If weight >70kg or BMI >26kg/m², Ulipristal is significantly more effective).',
        },
        mandatoryChecked: true,
      },
      {
        id: 'ec3',
        text: {
          fa: 'عدم وجود بارداری فعلی تایید شد (تأخیر قاعدگی قبلی بررسی شد).',
          en: 'Pregnancy status checked (no delayed menses indicating existing pregnancy).',
        },
        mandatoryChecked: true,
      },
      {
        id: 'ec4',
        text: {
          fa: 'ملاحظات شیردهی مطرح شد (لونورژسترول: ۸ ساعت دوشیدن و دور ریختن شیر؛ یولی‌پریستال: ۱ هفته دوشیدن و دور ریختن).',
          en: 'Breastfeeding advice given (Levonorgestrel: express & discard milk for 8h; Ulipristal: 1 week).',
        },
        mandatoryChecked: true,
      },
    ],
    counselingPoints: {
      fa: [
        'اگر تا ۳ ساعت پس از مصرف دچار استفراغ شدید، باید دوز مجدداً تکرار شود.',
        'این دارو بارداری موجود را خاتمه نمی‌دهد و جنین‌کش یا سقط‌آور نیست.',
        'قاعدگی بعدی ممکن است چند روز زودتر یا دیرتر اتفاق بیفتد؛ اگر بیش از ۷ روز تاخیر داشت تست بارداری الزامی است.',
      ],
      en: [
        'If vomiting occurs within 3 hours of taking the dose, repeat the full dose immediately.',
        'This medicine prevents ovulation; it does not terminate an established pregnancy.',
        'Next menstrual period may be early or late. If delayed by > 7 days, take a pregnancy test.',
      ],
    },
    referralCriteria: {
      fa: ['بیش از ۱۲۰ ساعت از رابطه گذشته باشد (ارجاع جهت IUD مسی اضطراری)', 'خونریزی غیرعادی یا درد شدید شکمی (شک به حاملگی خارج رحمی)'],
      en: ['Time elapsed > 120 hours (refer for emergency Copper IUD insertion).', 'Severe lower abdominal pain or abnormal bleeding (ectopic pregnancy risk).'],
    },
  },
  chloramphenicol: {
    id: 'chloramphenicol',
    title: {
      fa: 'پروتکل رسمی PSA برای قطره/پماد چشمی کلرامفنیکل (Chloramphenicol 0.5% S3)',
      en: 'PSA Practice Protocol: Chloramphenicol for Bacterial Conjunctivitis (S3)',
    },
    drugExamples: ['Chlorsig 0.5% Eye Drops', 'Chlorsig 1% Eye Ointment'],
    schedule: 'S3',
    checklistItems: [
      {
        id: 'ch1',
        text: {
          fa: 'علائم با کونژونکتیویت باکتریایی مطابقت دارد؟ (ترشحات چرکی و چسبندگی پلک‌ها هنگام بیداری)',
          en: 'Consistent with bacterial conjunctivitis? (Purulent discharge, sticky eyes on waking).',
        },
        mandatoryChecked: true,
      },
      {
        id: 'ch2',
        text: {
          fa: 'رد علائم خطر چشمی: عدم وجود درد شدید عمقی، عدم تاری دید، عدم حساسیت شدید به نور (Photophobia).',
          en: 'Ocular red flags excluded: No severe deep pain, no vision loss, no photophobia.',
        },
        mandatoryChecked: true,
      },
      {
        id: 'ch3',
        text: {
          fa: 'بیمار از لنز تماسی استفاده نمی‌کند؟ (استفاده‌کنندگان لنز به دلیل خطر عفونت سودوموناس نیاز به ارجاع فوری دارند)',
          en: 'Patient is NOT a contact lens wearer? (Contact lens wearers require immediate referral for Pseudomonas keratitis).',
        },
        mandatoryChecked: true,
      },
      {
        id: 'ch4',
        text: {
          fa: 'سن بیمار بالای ۲ سال است؟ (در کودکان زیر ۲ سال نیاز به ارجاع به پزشک است)',
          en: 'Patient is aged ≥ 2 years? (Infants < 2 years require GP evaluation).',
        },
        mandatoryChecked: true,
      },
    ],
    counselingPoints: {
      fa: [
        'در روزهای اول: ۱ قطره هر ۲ ساعت بیدار بودن (حداکثر ۸ بار در روز)، سپس هر ۴ ساعت با بهبود علائم.',
        'دارو را در یخچال (۲ تا ۸ درجه) نگهداری کنید.',
        'درمان باید تا ۴۸ ساعت پس از رفع کامل تمام علائم ادامه یابد.',
        'قوطی بازشده پس از ۲۸ روز دور انداخته شود.',
      ],
      en: [
        'Initial dosage: 1 drop every 2 hours while awake for first 48h, then reduce to every 4 hours.',
        'Store in refrigerator (2°C to 8°C); protect from light.',
        'Continue using for 48 hours after the eye appears normal to prevent relapse.',
        'Discard container 28 days after first opening.',
      ],
    },
    referralCriteria: {
      fa: ['تغییرات دید، تاری دید یا مردمک نامتقارن', 'استفاده‌کنندگان لنز تماسی', 'عدم بهبود ظرف ۴۸ ساعت پس از شروع درمان'],
      en: ['Visual disturbances, cloudiness, or irregular pupil.', 'Contact lens wearers.', 'No clinical improvement within 48 hours.'],
    },
  },
  ppi: {
    id: 'ppi',
    title: {
      fa: 'پروتکل رسمی PSA برای مهارکننده‌های پمپ پروتون (S3 PPIs: Esomeprazole / Pantoprazole)',
      en: 'PSA Practice Protocol: Pharmacist-Only PPI Supply for Reflux (S3)',
    },
    drugExamples: ['Nexium 24HR (Esomeprazole 20mg)', 'Somac Heartburn (Pantoprazole 20mg)'],
    schedule: 'S3',
    checklistItems: [
      {
        id: 'ppi1',
        text: {
          fa: 'علائم ریفلاکس اسید یا سوزش سر دل مکرر (حداقل ۲ بار در هفته) تایید شد؟',
          en: 'Frequent heartburn/reflux (≥ 2 days per week) confirmed?',
        },
        mandatoryChecked: true,
      },
      {
        id: 'ppi2',
        text: {
          fa: 'رد علائم هشدار دهنده گوارشی: عدم وجود دیسفاژی (اشکال در بلع)، کاهش وزن بی‌دلیل، مدفوع سیاه (Melena)، یا استفراغ خونی.',
          en: 'GI Red flags excluded: No dysphagia, unexplained weight loss, melena/black stools, or hematemesis.',
        },
        mandatoryChecked: true,
      },
      {
        id: 'ppi3',
        text: {
          fa: 'سن بیمار بالای ۱۸ سال بوده و علائم جدید در سن بالای ۵۵ سال بدون سابقه قبلی نیست؟',
          en: 'Patient is aged ≥ 18 years, and not a new onset of dyspepsia in patient > 55 years?',
        },
        mandatoryChecked: true,
      },
      {
        id: 'ppi4',
        text: {
          fa: 'بیمار آگاه شد که دوره تحویل S3 حداکثر ۱۴ روز است و در صورت تداوم علائم باید به پزشک مراجعه کند.',
          en: 'Patient advised supply is limited to 14 days maximum; persistent symptoms require GP endoscopy review.',
        },
        mandatoryChecked: true,
      },
    ],
    counselingPoints: {
      fa: [
        'یک قرص روزانه صبح‌ها ناشتا، حدود ۳۰ دقیقه قبل از صبحانه همراه یک لیوان آب میل شود.',
        'قرص را کامل ببلعید و از شکستن یا جویدن آن خودداری کنید.',
        'اثر دارو ممکن است ۲ تا ۳ روز طول بکشد تا به اوج تسکین برسد؛ در این فاصله می‌توان از آنتی‌اسید کمکی استفاده کرد.',
      ],
      en: [
        'Take 1 tablet daily in the morning, 30 minutes before breakfast with a full glass of water.',
        'Swallow whole; do not crush or chew modified-release tablets.',
        'May take 2-3 days for maximum acid suppression; an antacid may be used for immediate relief in the interim.',
      ],
    },
    referralCriteria: {
      fa: ['تداوم علائم پس از دوره ۱۴ روزه', 'اشکال یا درد در بلع (Dysphagia/Odynophagia)', 'استفراغ مکرر، کاهش وزن یا مدفوع تیره'],
      en: ['Symptoms continuing after 14-day supply.', 'Difficulty swallowing or painful swallowing.', 'Unexplained weight loss, recurring vomiting, or dark stools.'],
    },
  },
  salbutamol: {
    id: 'salbutamol',
    title: {
      fa: 'پروتکل رسمی PSA برای اسپری سالبوتامول تنفسی (Salbutamol Inhaler S3)',
      en: 'PSA Practice Protocol: Short-Acting Beta-2 Agonist Supply (S3)',
    },
    drugExamples: ['Ventolin 100mcg', 'Asmol 100mcg CFC-Free'],
    schedule: 'S3',
    checklistItems: [
      {
        id: 'sb1',
        text: {
          fa: 'آیا تشخیص آسم قبلی توسط پزشک تایید شده است؟',
          en: 'Has the diagnosis of asthma been previously confirmed by a doctor?',
        },
        mandatoryChecked: true,
      },
      {
        id: 'sb2',
        text: {
          fa: 'بررسی کنترل آسم: بیمار از اسپری تسکین‌دهنده بیش از ۲ بار در هفته استفاده نمی‌کند؟ (نیاز به کورتیکواستروئید پیشگیرنده)',
          en: 'Asthma control evaluated: Patient using reliever ≤ 2 times/week? (>2 times indicates poor control and need for preventer).',
        },
        mandatoryChecked: true,
      },
      {
        id: 'sb3',
        text: {
          fa: 'بیمار دارای برنامه عملیاتی مکتوب آسم (Written Asthma Action Plan) است؟',
          en: 'Patient has an up-to-date Written Asthma Action Plan?',
        },
        mandatoryChecked: true,
      },
      {
        id: 'sb4',
        text: {
          fa: 'نحوه صحیح استفاده از دم‌یار (Spacer) به بیمار آموزش داده شد؟',
          en: 'Proper inhaler and spacer technique demonstrated and verified?',
        },
        mandatoryChecked: true,
      },
    ],
    counselingPoints: {
      fa: [
        'همیشه همراه با آسان‌نفس (Spacer) استفاده کنید تا دارو به جای دهان و گلو مستقیماً به عمق ریه برسد.',
        'تسکین‌دهنده سریع است اما التهاب زیربنایی را درمان نمی‌کند؛ مصرف روزانه نشان‌دهنده نیاز به اسپری پیشگیری‌کننده است.',
        'پروتکل اورژانس: ۴ پاف، ۴ بار تنفس برای هر پاف، ۴ دقیقه صبر؛ در صورت عدم بهبود تماس با 000.',
      ],
      en: [
        'Always use with a spacer device to maximize lung deposition and reduce oral side effects.',
        'Reliever does not treat underlying airway inflammation; frequent use indicates need for preventer review.',
        'First Aid: 4 separate puffs with 4 breaths each, wait 4 minutes. If no improvement, call 000.',
      ],
    },
    referralCriteria: {
      fa: ['مصرف بیش از ۲ قوطی اسپری سالبوتامول در سال', 'بیدار شدن شبانه با خس‌خس سینه یا سرفه', 'حمله حاد شدید تنفسی (تماس با 000)'],
      en: ['Using > 2 canisters of SABA per year.', 'Night-time waking with wheeze or cough.', 'Severe acute exacerbation (call 000 immediately).'],
    },
  },
};

interface PsaSchedule3ProtocolModalProps {
  language: Language;
  isOpen: boolean;
  onClose: () => void;
  protocolType: S3ProtocolType;
  onSupplyApproved?: () => void;
}

export const PsaSchedule3ProtocolModal: React.FC<PsaSchedule3ProtocolModalProps> = ({
  language,
  isOpen,
  onClose,
  protocolType,
  onSupplyApproved,
}) => {
  const isFa = language === 'fa';
  const protocol = PSA_S3_PROTOCOLS[protocolType] || PSA_S3_PROTOCOLS.triptan;
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const toggleCheck = (id: string) => {
    setCheckedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const allMandatoryChecked = protocol.checklistItems.every((item) => checkedMap[item.id]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-4 bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border-b border-indigo-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  PSA Standard: Schedule 3 Protocol
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Pharmacist Only Medicine
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white leading-snug">
                {protocol.title[language] || protocol.title.en}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Examples of Products */}
        <div className="bg-slate-950/80 px-4 py-2 border-b border-slate-800 flex flex-wrap items-center gap-2 text-xs shrink-0">
          <span className="text-slate-400 font-bold text-[11px]">{isFa ? 'نمونه فرآورده‌های مشمول:' : 'Covered Medicines:'}</span>
          {protocol.drugExamples.map((drug, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700 font-mono text-[11px]"
            >
              {drug}
            </span>
          ))}
        </div>

        {/* Scrollable Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs leading-relaxed">
          {/* Mandatory Checklist */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
                <Stethoscope className="w-4 h-4 text-indigo-400" />
                {isFa ? 'چک‌لیست الزامی ارزیابی داروساز قبل از تحویل (Mandatory Assessment):' : 'Mandatory Pharmacist Assessment Checklist:'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {Object.values(checkedMap).filter(Boolean).length} / {protocol.checklistItems.length}
              </span>
            </div>

            <div className="space-y-2">
              {protocol.checklistItems.map((item) => {
                const isChecked = !!checkedMap[item.id];
                return (
                  <label
                    key={item.id}
                    onClick={() => toggleCheck(item.id)}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer select-none ${
                      isChecked
                        ? 'bg-indigo-950/40 border-indigo-500/50 text-slate-100 shadow-xs'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="mt-0.5 w-4 h-4 rounded accent-indigo-500 cursor-pointer shrink-0"
                    />
                    <span className="text-xs leading-relaxed">{item.text[language] || item.text.en}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Key Counseling Points */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
              <Info className="w-4 h-4" />
              {isFa ? 'نکات کلیدی مشاوره به بیمار (Patient Counseling Pearls):' : 'Key Patient Counseling Points:'}
            </span>
            <ul className="space-y-1.5 text-slate-300 list-disc list-inside pl-1">
              {(isFa ? protocol.counselingPoints.fa : protocol.counselingPoints.en).map((point, idx) => (
                <li key={idx} className="leading-relaxed">
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Referral Red Flags */}
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 space-y-1.5">
            <span className="font-bold text-rose-400 flex items-center gap-1.5 text-xs">
              <ShieldAlert className="w-4 h-4" />
              {isFa ? 'معیارهای ارجاع به پزشک (Medical Referral Triggers):' : 'Medical Referral Triggers:'}
            </span>
            <ul className="space-y-1 list-disc list-inside text-[11.5px] pl-1">
              {(isFa ? protocol.referralCriteria.fa : protocol.referralCriteria.en).map((crit, idx) => (
                <li key={idx}>{crit}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            {isFa ? 'انصراف' : 'Close'}
          </button>

          <button
            type="button"
            disabled={!allMandatoryChecked}
            onClick={() => {
              haptic.success();
              if (onSupplyApproved) onSupplyApproved();
              onClose();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              allMandatoryChecked
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isFa ? 'تایید ارزیابی و تحویل داروی S3' : 'Approve S3 Supply'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
