'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Language } from '@/types/pharmacy';
import {
  Dna,
  Pill,
  Target,
  Clock,
  ShieldAlert,
  Info,
  X,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { DRUG_MECHANISMS_REGISTRY, DrugMechanismInfo } from '@/data/mechanismsRegistry';

export interface ConciseDrugInfo {
  nameEn: string;
  nameFa: string;
  genericName?: string;
  brandNames?: string[];
  schedule?: 'S2' | 'S3' | 'S4' | 'S8' | 'Unscheduled' | string;
  doseEn: string;
  doseFa: string;
  usageEn: string;
  usageFa: string;
  mechanismEn: string;
  mechanismFa: string;
  cautionEn?: string;
  cautionFa?: string;
  colorClass?: string;
}

// Built-in concise registry for fast zero-latency popovers across all modules
export const CONCISE_DRUG_DATABASE: Record<string, ConciseDrugInfo> = {
  // Respiratory
  salbutamol: {
    nameEn: 'Salbutamol (Ventolin)',
    nameFa: 'سالبوتامول (ونتولین)',
    genericName: 'Salbutamol sulfate',
    brandNames: ['Ventolin', 'Asmol'],
    schedule: 'S3',
    doseEn: '1-2 puffs (100-200mcg) PRN for acute relief, max 8 puffs/day',
    doseFa: '۱ تا ۲ پاف در صورت نیاز هنگام تنگی نفس، حداکثر ۸ پاف در ۲۴ ساعت',
    usageEn: 'Acute bronchospasm, asthma reliever, exercise-induced asthma',
    usageFa: 'رفع فوری اسپاسم مجاری هوایی، تسکین حمله آسم و پیشگیری از آسم ورزشی',
    mechanismEn: 'Selective beta-2 adrenergic receptor agonist -> bronchodilation',
    mechanismFa: 'آگونیست انتخابی گیرنده‌های بتا-۲ آدرنرژیک و گشادی سریع برونش‌ها',
    cautionEn: 'Shake well, use with spacer; rinse mouth if needed',
    cautionFa: 'قبل از مصرف تکان دهید؛ استفاده از اسپیسر توصیه می‌شود',
  },
  mometasone: {
    nameEn: 'Mometasone (Nasonex)',
    nameFa: 'مومتازون (نازونکس)',
    genericName: 'Mometasone furoate',
    brandNames: ['Nasonex', 'Sensease'],
    schedule: 'S2',
    doseEn: '2 sprays in each nostril once daily in the morning',
    doseFa: '۲ پاف در هر سوراخ بینی یک‌بار در روز (صبح‌ها)',
    usageEn: 'Allergic rhinitis, hay fever prophylaxis & nasal polyps',
    usageFa: 'رینیت آلرژیک، تب یونجه فصلی و پولیپ بینی',
    mechanismEn: 'Potent topical corticosteroid -> suppresses mucosal inflammation',
    mechanismFa: 'کورتیکواستروئید موضعی قوی با سرکوب واسطه‌های التهابی مخاط بینی',
    cautionEn: 'Direct spray away from nasal septum; requires daily continuous use',
    cautionFa: 'اسپری را به سمت دیواره خارجی بینی بزنید نه تیغه میانی',
  },
  pseudoephedrine: {
    nameEn: 'Pseudoephedrine (Sudafed)',
    nameFa: 'سودوافدرین (سودافد)',
    genericName: 'Pseudoephedrine hydrochloride',
    brandNames: ['Sudafed 60mg'],
    schedule: 'S3',
    doseEn: '60mg every 4-6 hours PRN, max 240mg/day (max 5 days)',
    doseFa: '۶۰ میلی‌گرم هر ۴ تا ۶ ساعت در صورت نیاز، حداکثر ۵ روز متوالی',
    usageEn: 'Severe nasal congestion, sinus congestion & eustachian tube block',
    usageFa: 'احتقان و کیپ شدن شدید بینی، سینوزیت و انسداد گوش میانی',
    mechanismEn: 'Alpha-1 adrenergic agonist -> vasoconstriction of nasal mucosa',
    mechanismFa: 'آگونیست آلفا-۱ آدرنرژیک و انقباض عروق مخاط بینی و کاهش تورم',
    cautionEn: 'Project Stop recording required; avoid in hypertension or MAOI',
    cautionFa: 'استعلام Project Stop الزامی است؛ در فشار خون بالا ممنوع',
  },

  // GI
  esomeprazole: {
    nameEn: 'Esomeprazole (Nexium)',
    nameFa: 'اس‌امپرازول (نکسیوم)',
    genericName: 'Esomeprazole magnesium',
    brandNames: ['Nexium 24HR'],
    schedule: 'S3',
    doseEn: '20mg once daily in morning 30 min before food for 14 days',
    doseFa: '۲۰ میلی‌گرم روزانه یک‌بار صبح‌ها ۳۰ دقیقه پیش از صبحانه به مدت ۱۴ روز',
    usageEn: 'Frequent heartburn, acid reflux (GERD) & dyspepsia',
    usageFa: 'سوزش سر دل مکرر، ریفلاکس اسید معده (GERD) و سوء‌هاضمه',
    mechanismEn: 'Proton Pump Inhibitor (PPI) -> blocks H+/K+-ATPase acid secretion',
    mechanismFa: 'مهارکننده پمپ پروتون (PPI) با مهار ترشح نهایی اسید معده',
    cautionEn: 'Swallow whole with water; do not crush or chew pellets',
    cautionFa: 'قرص را به صورت کامل با آب ببلعید؛ جویده نشود',
  },
  pantoprazole: {
    nameEn: 'Pantoprazole (Somac)',
    nameFa: 'پنتوپرازول (سوماک)',
    genericName: 'Pantoprazole sodium',
    brandNames: ['Somac Heartburn Relief'],
    schedule: 'S3',
    doseEn: '20mg once daily before a meal for up to 14 days',
    doseFa: '۲۰ میلی‌گرم روزانه قبل از وعده غذایی تا حداکثر ۱۴ روز',
    usageEn: 'Heartburn, gastroesophageal reflux & acid indigestion',
    usageFa: 'سوزش سردل، بازگشت اسید به مری و سوء‌هاضمه اسیدی',
    mechanismEn: 'Irreversibly inhibits parietal cell H+/K+-ATPase proton pump',
    mechanismFa: 'مهار غیرقابل برگشت پمپ پروتون سلول‌های پریتال معده',
    cautionEn: 'Consult pharmacist if symptoms persist beyond 14 days',
    cautionFa: 'اگر علائم پس از ۱۴ روز برطرف نشد نیاز به بررسی پزشک دارد',
  },
  hyoscine: {
    nameEn: 'Hyoscine butylbromide (Buscopan)',
    nameFa: 'هیوسین بوتیل‌بروماید (بوسکوپان)',
    genericName: 'Hyoscine butylbromide',
    brandNames: ['Buscopan 10mg / Forte 20mg'],
    schedule: 'S2',
    doseEn: '10-20mg 3-4 times daily with water PRN, max 80mg/day',
    doseFa: '۱۰ تا ۲۰ میلی‌گرم ۳ الی ۴ بار در روز همراه با آب در صورت دل‌پیچه',
    usageEn: 'Abdominal cramps, gastrointestinal spasms & IBS pain',
    usageFa: 'اسپاسم و کرامپ‌های گوارشی، دل‌پیچه حاد و دردهای روده تحریک‌پذیر',
    mechanismEn: 'Antimuscarinic antispasmodic -> blocks smooth muscle contraction',
    mechanismFa: 'آنتی‌موسکارینیک ضد اسپاسم با شل کردن عضلات صاف دستگاه گوارش',
    cautionEn: 'Avoid in glaucoma, myasthenia gravis, or megacolon',
    cautionFa: 'در آب سیاه چشم (گلوکوم زاویه بسته) و میاستنی گراویس ممنوع است',
  },
  loperamide: {
    nameEn: 'Loperamide (Gastro-Stop)',
    nameFa: 'لوپرامید (گاسترو-استاپ)',
    genericName: 'Loperamide hydrochloride',
    brandNames: ['Gastro-Stop', 'Imodium'],
    schedule: 'S2',
    doseEn: 'Initial 4mg (2 caps), then 2mg after each loose bowel action, max 16mg/day',
    doseFa: 'دوز شروع ۴ میلی‌گرم (۲ کپسول)، سپس ۲ میلی‌گرم پس از هر بار دفع اسهال',
    usageEn: 'Acute non-infectious diarrhea & traveler\'s diarrhea',
    usageFa: 'اسهال حاد غیرعفونی و کنترل اسهال مسافرتی',
    mechanismEn: 'Peripheral mu-opioid receptor agonist -> slows intestinal peristalsis',
    mechanismFa: 'آگونیست گیرنده مو-اپیوئیدی روده و کاهش حرکات دودی و افزایش زمان عبور',
    cautionEn: 'Contraindicated in bloody stool, high fever, or severe colitis',
    cautionFa: 'در اسهال خونی، تب بالا و کولیت حاد اکیداً ممنوع است',
  },

  // Analgesics & Anti-inflammatory
  paracetamol: {
    nameEn: 'Paracetamol (Panadol)',
    nameFa: 'استامینوفن / پاراستامول (پانادول)',
    genericName: 'Paracetamol',
    brandNames: ['Panadol', 'Panamax', 'Dymadon'],
    schedule: 'S2',
    doseEn: '500-1000mg every 4-6 hours PRN, max 4000mg (4g) in 24 hours',
    doseFa: '۵۰۰ تا ۱۰۰۰ میلی‌گرم هر ۴ تا ۶ ساعت در صورت نیاز، حداکثر ۴ گرم در شبانه‌روز',
    usageEn: 'Mild-to-moderate pain, headache, fever reduction & osteoarthritis',
    usageFa: 'تسکین دردهای خفیف تا متوسط، سردرد، تب‌بری و درد استئوآرتریت',
    mechanismEn: 'Central cyclooxygenase (COX) inhibition & cannabinoid receptor activation',
    mechanismFa: 'مهار سنتز پروستاگلاندین‌ها در سیستم اعصاب مرکزی و تعدیل مسیر سروتونرژیک',
    cautionEn: 'Do not exceed 4g/day; check duplicate paracetamol in cold/flu meds',
    cautionFa: 'حداکثر دوز روزانه ۴ گرم؛ از مصرف همزمان سایر داروهای سرماخوردگی پرهیز شود',
  },
  ibuprofen: {
    nameEn: 'Ibuprofen (Nurofen)',
    nameFa: 'ایبوپروفن (نوروفن)',
    genericName: 'Ibuprofen',
    brandNames: ['Nurofen', 'Advil'],
    schedule: 'S2',
    doseEn: '200-400mg every 4-6 hours with food PRN, max 1200mg/day (OTC)',
    doseFa: '۲۰۰ تا ۴۰۰ میلی‌گرم هر ۴ تا ۶ ساعت همراه غذا، حداکثر ۱۲۰۰ میلی‌گرم روزانه',
    usageEn: 'Inflammatory pain, toothache, dysmenorrhea, muscular aches',
    usageFa: 'دردهای التهابی، دندان‌درد، دیسمنوره قاعدگی و کشیدگی عضلانی',
    mechanismEn: 'Non-selective COX-1 and COX-2 inhibitor -> reduces prostaglandins',
    mechanismFa: 'مهار غیراختصاصی آنزیم‌های COX-1 و COX-2 و کاهش سنتز پروستاگلاندین‌های التهابی',
    cautionEn: 'Take with food; avoid in peptic ulcer, severe renal impairment or asthma',
    cautionFa: 'حتماً با غذا میل شود؛ در زخم معده فعال و نارسایی کلیوی ممنوع',
  },
  diclofenac: {
    nameEn: 'Diclofenac (Voltaren)',
    nameFa: 'دیکلوفناک (ولتارن)',
    genericName: 'Diclofenac potassium / diethylamine',
    brandNames: ['Voltaren Osteo Gel', 'Voltaren Rapid 25'],
    schedule: 'S2',
    doseEn: 'Gel: Apply 2-4g to affected joint 2-3 times daily (Osteo 12hr: twice daily)',
    doseFa: 'ژل موضعی: ۲ تا ۴ گرم روی مفصل ۲ الی ۳ بار در روز (فرمول Osteo دو بار در روز)',
    usageEn: 'Localized joint pain, osteoarthritis of knee/hands, soft tissue sprains',
    usageFa: 'درد و التهاب موضعی مفاصل، آرتروز زانو و دست‌ها و رگ‌به‌رگ شدگی',
    mechanismEn: 'Topical NSAID -> localized COX inhibition with minimal systemic absorption',
    mechanismFa: 'ضدالتهاب غیراستروئیدی موضعی با مهار COX در بافت هدف بدون عوارض سیستمیک',
    cautionEn: 'Wash hands after application; do not use with oral NSAIDs concurrently',
    cautionFa: 'پس از مالیدن دست‌ها را بشویید؛ از مصرف همزمان با مسکن‌های خوراکی NSAID بپرهیزید',
  },

  // Antihistamines & Allergy
  fexofenadine: {
    nameEn: 'Fexofenadine (Telfast)',
    nameFa: 'فکسوفنادین (تلفست)',
    genericName: 'Fexofenadine hydrochloride',
    brandNames: ['Telfast 180mg / 120mg'],
    schedule: 'S2',
    doseEn: '180mg once daily with water for allergic rhinitis/hives',
    doseFa: '۱۸۰ میلی‌گرم یک‌بار در روز با آب جهت رینیت آلرژیک یا کهیر مزمن',
    usageEn: 'Seasonal allergic rhinitis, hay fever & chronic urticaria (hives)',
    usageFa: 'رینیت آلرژیک، حساسیت فصلی و کهیر مزمن خارش‌دار',
    mechanismEn: '2nd-generation selective H1-receptor antagonist (non-sedating)',
    mechanismFa: 'آنتاگونیست انتخابی گیرنده‌های H1 هیستامینی نسل دوم (کاملاً غیرخواب‌آور)',
    cautionEn: 'Avoid taking with fruit juices (grapefruit/apple) which reduce absorption',
    cautionFa: 'با آبمیوه‌هایی مانند گریپ‌فروت یا سیب مصرف نشود چون جذب را کم می‌کنند',
  },
  cetirizine: {
    nameEn: 'Cetirizine (Zyrtec)',
    nameFa: 'ستیریزین (زیرتک)',
    genericName: 'Cetirizine hydrochloride',
    brandNames: ['Zyrtec'],
    schedule: 'S2',
    doseEn: '10mg once daily with water PRN',
    doseFa: '۱۰ میلی‌گرم یک‌بار در روز همراه با آب در صورت بروز آلرژی',
    usageEn: 'Allergic rhinitis, allergic conjunctivitis, itching & skin rashes',
    usageFa: 'رینیت آلرژیک، ورم ملتحمه آلرژیک، خارش پوست و کهیر',
    mechanismEn: 'Potent 2nd-generation H1-blocker with rapid onset (within 20-30 min)',
    mechanismFa: 'مهارکننده پرقدرت گیرنده H1 هیستامین با شروع اثر سریع (۲۰ تا ۳۰ دقیقه)',
    cautionEn: 'May cause mild drowsiness in sensitive individuals',
    cautionFa: 'ممکن است در برخی افراد باعث خواب‌آلودگی خفیف شود (CAL 1)',
  },

  // Eye & Ear
  chloramphenicol: {
    nameEn: 'Chloramphenicol (Chlorsig)',
    nameFa: 'کلرامفنیکل (کلرسیگ)',
    genericName: 'Chloramphenicol 0.5% drops / 1% ointment',
    brandNames: ['Chlorsig'],
    schedule: 'S3',
    doseEn: 'Drops: 1-2 drops into affected eye(s) every 2-6 hours for 5 days',
    doseFa: 'قطره چشمی: ۱ تا ۲ قطره هر ۲ تا ۶ ساعت به مدت ۵ روز (حتی پس از رفع علائم)',
    usageEn: 'Acute bacterial conjunctivitis (sticky yellow/green discharge)',
    usageFa: 'ورم ملتحمه باکتریایی حاد چشم (ترشحات چسبنده زرد یا سبزرنگ)',
    mechanismEn: 'Binds bacterial 50S ribosomal subunit -> inhibits peptidyl transferase',
    mechanismFa: 'اتصال به زیرواحد 50S ریبوزوم باکتری و مهار سنتز پروتئین باکتریایی',
    cautionEn: 'Store drops in fridge (2-8°C); discard 28 days after opening',
    cautionFa: 'در یخچال نگهداری شود (۲ تا ۸ درجه)؛ حداکثر ۲۸ روز پس از باز شدن مصرف گردد',
  },
  latanoprost: {
    nameEn: 'Latanoprost (Xalatan)',
    nameFa: 'لاتانوپروست (گزالاتان)',
    genericName: 'Latanoprost 50mcg/mL',
    brandNames: ['Xalatan', 'Lataz'],
    schedule: 'S4',
    doseEn: '1 drop into affected eye(s) once daily in the evening',
    doseFa: '۱ قطره در چشم مبتلا یک‌بار در روز (ترجیحاً شب‌ها هنگام خواب)',
    usageEn: 'Open-angle glaucoma & ocular hypertension (lowers IOP)',
    usageFa: 'گلوکوم زاویه باز و افزایش فشار داخل چشم (کاهش IOP)',
    mechanismEn: 'Prostaglandin F2a analogue -> increases uveoscleral aqueous outflow',
    mechanismFa: 'آنالوگ پروستاگلاندین با افزایش خروج مایع زلالیه از مسیر یووواسکلرال',
    cautionEn: 'May darken iris color and lengthen eyelashes; store unopened in fridge',
    cautionFa: 'ممکن است رنگ عنبیه را تیره و مژه‌ها را بلند کند؛ قبل از باز شدن در یخچال باشد',
  },

  // Antifungals & Antiparasitics
  fluconazole: {
    nameEn: 'Fluconazole (Diflucan)',
    nameFa: 'فلوکونازول (دیفلوکان)',
    genericName: 'Fluconazole 150mg',
    brandNames: ['Diflucan One'],
    schedule: 'S3',
    doseEn: '150mg single oral capsule taken with or without food',
    doseFa: '۱۵۰ میلی‌گرم کپسول خوراکی تک‌دوز همراه یا بدون غذا',
    usageEn: 'Vaginal candidiasis (thrush) in non-pregnant females aged 16-60',
    usageFa: 'درمان برفک و کاندیدیازیس واژینال در زنان غیرباردار ۱۶ تا ۶۰ سال',
    mechanismEn: 'Inhibits fungal 14a-demethylase (CYP51) -> halts ergosterol synthesis',
    mechanismFa: 'مهار آنزیم 14α-دمتیلاز قارچی و توقف ساخت ارگوسترول دیواره قارچ',
    cautionEn: 'CONTRAINDICATED in pregnancy (teratogenic); interacts with warfarin',
    cautionFa: 'در بارداری اکیداً ممنوع است (تراتوژن)؛ تداخل شدید با وارفارین',
  },
  clotrimazole: {
    nameEn: 'Clotrimazole (Canesten)',
    nameFa: 'کلوتریمازول (کانستن)',
    genericName: 'Clotrimazole 1% / 2% / 10% cream & pessary',
    brandNames: ['Canesten', 'Canesten Duo'],
    schedule: 'S2',
    doseEn: 'Insert pessary / apply cream high into vagina at bedtime (1, 3, or 6 days)',
    doseFa: 'شیاف یا کرم واژینال شب‌ها قبل از خواب در واژن قرار داده شود (۱، ۳ یا ۶ روز)',
    usageEn: 'Vaginal candidiasis (safe in pregnancy with manual insertion) & fungal skin tinea',
    usageFa: 'کاندیدیازیس واژینال (ایمن در بارداری با دست بدون اپلیکاتور) و قارچ پوست',
    mechanismEn: 'Topical azole antifungal -> alters fungal cell membrane permeability',
    mechanismFa: 'ضدقارچ موضعی آزول با مهار بیوسنتز ارگوسترول و تخریب غشای قارچی',
    cautionEn: 'May weaken latex condoms; insert high without applicator in pregnancy',
    cautionFa: 'ممکن است کاندوم را ضعیف کند؛ در بارداری بدون اپلیکاتور استفاده شود',
  },
  terbinafine: {
    nameEn: 'Terbinafine (Lamisil)',
    nameFa: 'تربینافین (لامیسیل)',
    genericName: 'Terbinafine hydrochloride 1%',
    brandNames: ['Lamisil', 'SolvEasy'],
    schedule: 'S2',
    doseEn: 'Apply cream to cleansed area once or twice daily for 7 days',
    doseFa: 'کرم را روی موضع تمیز ۱ تا ۲ بار در روز به مدت ۷ روز متوالی بمالید',
    usageEn: 'Tinea pedis (athlete\'s foot), tinea cruris (jock itch) & tinea corporis',
    usageFa: 'پای ورزشکاران (قارچ انگشتان پا)، قارچ کشاله ران و قارچ تنه',
    mechanismEn: 'Fungicidal squalene epoxidase inhibitor -> toxic squalene accumulation',
    mechanismFa: 'قارچ‌کش مستقیم با مهار آنزیم اسکوالن اپوکسیداز و تخریب سریع دیواره قارچ',
    cautionEn: 'Continue full 7-day course even if itching disappears after 2 days',
    cautionFa: 'دوره ۷ روزه را کامل کنید حتی اگر خارش پس از ۲ روز متوقف شد',
  },
  mebendazole: {
    nameEn: 'Mebendazole (Vermox)',
    nameFa: 'مبندازول (ورموکس)',
    genericName: 'Mebendazole 100mg',
    brandNames: ['Vermox'],
    schedule: 'S2',
    doseEn: '100mg single dose; repeat identical dose after exactly 14 days',
    doseFa: '۱۰۰ میلی‌گرم تک‌دوز؛ تکرار مجدد دوز پس از دقیقاً ۱۴ روز الزامی است',
    usageEn: 'Enterobiasis (threadworm / pinworm infection in adults & children >2yo)',
    usageFa: 'کرمک و عفونت انگلی انتروبیوس (در بزرگسالان و کودکان بالای ۲ سال)',
    mechanismEn: 'Binds parasite beta-tubulin -> halts glucose uptake and starves pinworms',
    mechanismFa: 'اتصال به بتا-توبولین کرمک و مهار جذب گلوکز و تخلیه انرژی انگل',
    cautionEn: 'Treat all household family members simultaneously on same day',
    cautionFa: 'تمام اعضای خانواده باید در یک روز به طور همزمان درمان شوند',
  },

  // Antivirals
  acyclovir: {
    nameEn: 'Aciclovir (Zovirax)',
    nameFa: 'آسیکلوویر (زوویراکس)',
    genericName: 'Aciclovir 5% cream',
    brandNames: ['Zovirax'],
    schedule: 'S2',
    doseEn: 'Apply 5 times daily (every 4 hours during waking hours) for 4-5 days',
    doseFa: '۵ بار در روز (هر ۴ ساعت در طول ساعات بیداری) به مدت ۴ تا ۵ روز',
    usageEn: 'Herpes labialis (cold sores) on lips and face at earliest prodrome',
    usageFa: 'تبخال لب و صورت در اولین نشانه‌های اولیه (سوزش، خارش یا قرمزی)',
    mechanismEn: 'Converted by viral TK to triphosphate -> terminates viral DNA chain',
    mechanismFa: 'فعال‌سازی توسط تیمیدین کیناز ویروس و مهار اختصاصی زنجیره DNA ویروس',
    cautionEn: 'Start at earliest tingling sensation for maximum clinical efficacy',
    cautionFa: 'در اولین احساس سوزش و خارش قبل از تشکیل تاول شروع به مصرف کنید',
  },

  // Cardiovascular & Metabolic
  metformin: {
    nameEn: 'Metformin (Diabex)',
    nameFa: 'متفورمین (دیابکس)',
    genericName: 'Metformin hydrochloride 500/850/1000mg',
    brandNames: ['Diabex', 'Diaformin'],
    schedule: 'S4',
    doseEn: '500-1000mg twice daily with or immediately after meals',
    doseFa: '۵۰۰ تا ۱۰۰۰ میلی‌گرم دو بار در روز همراه یا بلافاصله پس از غذا',
    usageEn: 'Type 2 Diabetes Mellitus (first-line glycaemic control)',
    usageFa: 'دیابت نوع ۲ (خط اول کنترل قند خون و افزایش حساسیت به انسولین)',
    mechanismEn: 'Activates hepatic AMPK -> suppresses gluconeogenesis & increases insulin sensitivity',
    mechanismFa: 'فعال‌سازی AMPK در کبد و مهار گلوکونئوژنز و افزایش برداشت گلوکز توسط عضلات',
    cautionEn: 'Take with food to minimize GI upset; monitor renal function (eGFR)',
    cautionFa: 'همراه غذا میل شود تا عوارض گوارشی کم شود؛ بررسی دوره‌ای کلیه الزامی است',
  },
  empagliflozin: {
    nameEn: 'Empagliflozin (Jardiance)',
    nameFa: 'امپاگلیفلوزین (جاردینس)',
    genericName: 'Empagliflozin 10/25mg',
    brandNames: ['Jardiance'],
    schedule: 'S4',
    doseEn: '10-25mg once daily in morning with or without food',
    doseFa: '۱۰ تا ۲۵ میلی‌گرم یک‌بار در روز صبح‌ها با یا بدون غذا',
    usageEn: 'Type 2 Diabetes, Heart Failure (HFrEF/HFpEF) & Chronic Kidney Disease',
    usageFa: 'دیابت نوع ۲، نارسایی قلبی و محافظت از پیشرفت نارسایی کلیوی',
    mechanismEn: 'SGLT2 inhibitor -> blocks renal glucose & sodium reabsorption in proximal tubule',
    mechanismFa: 'مهارکننده ناقل SGLT2 کلیه و دفع گلوکز اضافی از طریق ادرار و کاهش فشار قلب',
    cautionEn: 'Maintain adequate hydration; monitor for mycotic genital infections',
    cautionFa: 'مصرف کافی مایعات؛ توجه به علائم عفونت قارچی دستگاه تناسلی',
  },
  atorvastatin: {
    nameEn: 'Atorvastatin (Lipitor)',
    nameFa: 'آتورواستاتین (لیپیتور)',
    genericName: 'Atorvastatin calcium 10/20/40/80mg',
    brandNames: ['Lipitor', 'Lorstat'],
    schedule: 'S4',
    doseEn: '10-80mg once daily at any time of day (evening preferred)',
    doseFa: '۱۰ تا ۸۰ میلی‌گرم یک‌بار در روز (ترجیحاً شب‌ها)',
    usageEn: 'Hypercholesterolaemia & cardiovascular disease risk reduction',
    usageFa: 'کاهش کلسترول LDL، پیشگیری از سکته قلبی و عروقی',
    mechanismEn: 'HMG-CoA reductase inhibitor -> upregulates hepatic LDL receptors',
    mechanismFa: 'مهار آنزیم HMG-CoA ردوکتاز در کبد و افزایش گیرنده‌های پاک‌سازی LDL',
    cautionEn: 'Avoid grapefruit juice; report unexplained muscle pain or weakness',
    cautionFa: 'از مصرف گریپ‌فروت پرهیز شود؛ درد عضلانی غیرعادی گزارش شود',
  },
  perindopril: {
    nameEn: 'Perindopril (Coversyl)',
    nameFa: 'پریندوپریل (کاورسیل)',
    genericName: 'Perindopril arginine 2.5/5/10mg',
    brandNames: ['Coversyl'],
    schedule: 'S4',
    doseEn: '2.5-10mg once daily in the morning before food',
    doseFa: '۲.۵ تا ۱۰ میلی‌گرم یک‌بار در روز صبح‌ها قبل از صبحانه',
    usageEn: 'Hypertension, heart failure & stable coronary artery disease',
    usageFa: 'فشار خون بالا، نارسایی قلبی و محافظت عروق کرونر',
    mechanismEn: 'ACE inhibitor -> blocks conversion of Angiotensin I to II, causing vasodilation',
    mechanismFa: 'مهارکننده آنزیم ACE و مهار تبدیل آنژیوتانسین ۱ به ۲ و گشادی عروق خونی',
    cautionEn: 'Dry cough is a class side effect; monitor potassium and renal function',
    cautionFa: 'سرفه خشک از عوارض شایع است؛ بررسی سطح پتاسیم و عملکرد کلیه',
  },
  amlodipine: {
    nameEn: 'Amlodipine (Norvasc)',
    nameFa: 'آملودیپین (نورواسک)',
    genericName: 'Amlodipine besylate 5/10mg',
    brandNames: ['Norvasc'],
    schedule: 'S4',
    doseEn: '5-10mg once daily with or without food',
    doseFa: '۵ تا ۱۰ میلی‌گرم یک‌بار در روز همراه یا بدون غذا',
    usageEn: 'Hypertension & chronic stable angina',
    usageFa: 'فشار خون بالا و آنژین صدری مزمن',
    mechanismEn: 'Dihydropyridine Calcium Channel Blocker -> relaxes vascular smooth muscle',
    mechanismFa: 'مسدودکننده کانال کلسیم نوع L و شل کردن عضلات صاف جدار سرخرگ‌ها',
    cautionEn: 'Peripheral ankle edema (fluid retention) is a common dose-dependent effect',
    cautionFa: 'ورم مچ پا از عوارض وابسته به دوز است',
  },
  warfarin: {
    nameEn: 'Warfarin (Marevan / Coumadin)',
    nameFa: 'وارفارین (ماروان / کومادین)',
    genericName: 'Warfarin sodium 1/2/3/5mg',
    brandNames: ['Marevan', 'Coumadin'],
    schedule: 'S4',
    doseEn: 'Individualized daily dose guided by INR (target 2.0-3.0), taken at 6 PM',
    doseFa: 'دوز دقیق روزانه بر اساس آزمایش INR (هدف ۲ تا ۳)، مصرف منظم ساعت ۶ عصر',
    usageEn: 'Atrial fibrillation, DVT/PE treatment and prophylaxis, mechanical heart valves',
    usageFa: 'فیبریلاسیون دهلیزی، پیشگیری از ترومبوز ورید عمقی (DVT) و دریچه‌های مکانیکی قلب',
    mechanismEn: 'Vitamin K epoxide reductase (VKOR) inhibitor -> blocks factors II, VII, IX, X',
    mechanismFa: 'مهارکننده بازیافت ویتامین K و توقف ساخت فاکتورهای انعقادی ۲، ۷، ۹ و ۱۰',
    cautionEn: 'STRICT NTI DRUG: Do not substitute brands (Marevan vs Coumadin); strict INR monitoring',
    cautionFa: 'داروی پنجره درمانی باریک (NTI): تعویض برند ممنوع؛ پایش مداوم INR الزامی است',
  },

  // Opioids & Reversal
  naloxone: {
    nameEn: 'Naloxone (Nyxoid Nasal Spray)',
    nameFa: 'نالوکسان (اسپری بینی نیکسوئید)',
    genericName: 'Naloxone hydrochloride 1.8mg nasal spray',
    brandNames: ['Nyxoid', 'Prenoxad'],
    schedule: 'S3',
    doseEn: '1 spray into one nostril immediately in suspected opioid overdose; call 000',
    doseFa: '۱ پاف داخل یک سوراخ بینی در مسمومیت حاد اپیوئید؛ بلافاصله با اورژانس (000) تماس بگیرید',
    usageEn: 'Emergency reversal of acute opioid overdose & life-threatening respiratory depression',
    usageFa: 'پادزهر اورژانسی مسمومیت با تریاک/مورفین و احیای فوری دپرسیون تنفسی',
    mechanismEn: 'Pure competitive Mu-Opioid receptor antagonist with ultra-fast onset',
    mechanismFa: 'آنتاگونیست رقابتی خالص گیرنده مو-اپیوئید و خنثی‌سازی فوری اثر اپیوئیدها',
    cautionEn: 'Call Ambulance 000 immediately; repeat second spray after 2-3 mins if no response',
    cautionFa: 'تماس فوری با اورژانس؛ در صورت عدم پاسخ پس از ۲ الی ۳ دقیقه دوز دوم تزریق شود',
  },
  oxycodone: {
    nameEn: 'Oxycodone (Endone / OxyContin)',
    nameFa: 'اکسی‌کدون (اندون / اکسی‌کانتین)',
    genericName: 'Oxycodone hydrochloride 5/10/20mg',
    brandNames: ['Endone 5mg', 'OxyContin'],
    schedule: 'S8',
    doseEn: 'Immediate-release: 5-10mg every 4-6 hours PRN for severe acute pain (S8 strictly controlled)',
    doseFa: '۵ تا ۱۰ میلی‌گرم هر ۴ تا ۶ ساعت در صورت درد شدید حاد (تحت کنترل شدید S8)',
    usageEn: 'Severe acute pain unresponsive to non-opioid analgesics',
    usageFa: 'دردهای بسیار شدید حاد جراحی یا سرطانی مقاوم به مسکن‌های ساده',
    mechanismEn: 'Potent full Mu-Opioid receptor agonist in CNS -> inhibits ascending pain pathways',
    mechanismFa: 'آگونیست قوی گیرنده مو-اپیوئید و مسدود کردن انتقال پیام درد در نخاع و مغز',
    cautionEn: 'S8 Controlled Drug: High risk of dependence; co-prescribe aperient for constipation',
    cautionFa: 'داروی تحت کنترل S8: خطر وابستگی؛ تجویز همزمان ملین ضد یبوست الزامی است',
  },
};

/**
 * Helper to look up concise drug data from database or generic text matching
 */
export function lookupConciseDrug(drugQuery: string): ConciseDrugInfo {
  if (!drugQuery) {
    return {
      nameEn: 'Medicine',
      nameFa: 'دارو',
      doseEn: 'As directed by physician/pharmacist',
      doseFa: 'طبق دستور پزشک یا داروساز',
      usageEn: 'Clinical therapy per Australian standards',
      usageFa: 'درمان بالینی طبق استانداردهای رسمی استرالیا',
      mechanismEn: 'Targeted physiological action in receptor pathways',
      mechanismFa: 'تعدیل عملکرد سلولی و اثر درمانی در بافت هدف',
    };
  }

  const q = drugQuery.toLowerCase().trim();

  for (const [key, item] of Object.entries(CONCISE_DRUG_DATABASE)) {
    if (
      q.includes(key) ||
      item.nameEn.toLowerCase().includes(q) ||
      item.nameFa.includes(drugQuery) ||
      (item.genericName && item.genericName.toLowerCase().includes(q)) ||
      (item.brandNames && item.brandNames.some((b) => b.toLowerCase().includes(q)))
    ) {
      return item;
    }
  }

  // Check mechanisms registry
  for (const [mKey, mech] of Object.entries(DRUG_MECHANISMS_REGISTRY)) {
    if (
      mech.classNameEn.toLowerCase().includes(q) ||
      mech.classNameFa.includes(drugQuery) ||
      mech.targetSiteEn.toLowerCase().includes(q)
    ) {
      return {
        nameEn: mech.classNameEn,
        nameFa: mech.classNameFa,
        schedule: 'S2 / S3',
        doseEn: 'Follow label and APF/AMH dosing guidelines',
        doseFa: 'طبق دوزاژ درج‌شده در راهنمای رسمی APF/AMH استرالیا',
        usageEn: mech.clinicalRelevanceEn.split('.')[0] || 'Therapeutic indication per AMH',
        usageFa: mech.clinicalRelevanceFa.split('.')[0] || 'اندیکاسیون درمانی طبق راهنمای AMH',
        mechanismEn: mech.cellularEffectEn.split('.')[0] || mech.descriptionEn.split('.')[0],
        mechanismFa: mech.cellularEffectFa.split('.')[0] || mech.descriptionFa.split('.')[0],
        colorClass: mech.colorClass,
      };
    }
  }

  // Fallback nicely formatted object
  return {
    nameEn: drugQuery,
    nameFa: drugQuery,
    schedule: 'Pharmacy Medicine',
    doseEn: 'Refer to Australian Medicines Handbook (AMH) / APF',
    doseFa: 'طبق مونوگراف رسمی کتابچه راهنمای دارویی استرالیا (AMH)',
    usageEn: `Therapeutic indication per AMH monographs for ${drugQuery}`,
    usageFa: `اندیکاسیون درمانی و بالینی طبق AMH برای ${drugQuery}`,
    mechanismEn: `Cellular response modulation in receptor pathways for ${drugQuery}`,
    mechanismFa: `تعدیل آبشار بیوشیمیایی و اثر درمانی در گیرنده‌های هدف ${drugQuery}`,
  };
}

interface MechanismPopoverProps {
  drugName: string;
  language: Language;
  trigger?: React.ReactNode;
  className?: string;
  customData?: Partial<ConciseDrugInfo>;
}

export const MechanismPopover: React.FC<MechanismPopoverProps> = ({
  drugName,
  language,
  trigger,
  className = '',
  customData,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const isFa = language === 'fa';

  const baseInfo = lookupConciseDrug(drugName);
  const info: ConciseDrugInfo = {
    ...baseInfo,
    ...customData,
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `${info.nameEn} (${info.nameFa})
💊 دوز: ${info[isFa ? 'doseFa' : 'doseEn']}
🎯 کاربرد: ${info[isFa ? 'usageFa' : 'usageEn']}
⚙️ مکانیسم: ${info[isFa ? 'mechanismFa' : 'mechanismEn']}`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1800);
  };

  return (
    <span className="relative inline-flex items-center" ref={popoverRef}>
      {/* Trigger element */}
      <span
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`cursor-pointer inline-flex items-center gap-1 transition select-none ${
          trigger
            ? ''
            : 'text-sky-400 hover:text-sky-300 underline decoration-sky-500/40 hover:decoration-sky-400 font-semibold'
        } ${className}`}
        title={isFa ? 'کلیک برای نمایش مشخصات سریع دارو (دوز، کاربرد، مکانیسم)' : 'Click for quick dose, usage & mechanism popover'}
      >
        {trigger ? (
          trigger
        ) : (
          <>
            <span>{drugName}</span>
            <Dna className="w-3 h-3 text-teal-400 shrink-0 opacity-80" />
          </>
        )}
      </span>

      {/* Sleek, ultra-concise popover card */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs sm:absolute sm:inset-auto sm:top-full sm:mt-2 sm:right-0 sm:min-w-[320px] sm:max-w-sm sm:bg-transparent sm:backdrop-blur-none"
        >
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-teal-500/50 shadow-2xl p-3.5 space-y-2.5 text-white animate-scaleIn relative ring-1 ring-teal-500/30">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 border-b border-teal-500/30 pb-2">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-xs sm:text-sm text-teal-300 truncate">
                    {info[isFa ? 'nameFa' : 'nameEn']}
                  </span>
                  {info.schedule && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shrink-0">
                      {info.schedule}
                    </span>
                  )}
                </div>
                {info.genericName && (
                  <p className="text-[10px] font-mono text-slate-400 truncate">
                    {info.genericName}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-teal-300 transition cursor-pointer"
                  title={isFa ? 'کپی مشخصات' : 'Copy'}
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                  title={isFa ? 'بستن' : 'Close'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 3 Ultra-concise data rows (Dose, Usage, Mechanism) */}
            <div className="space-y-2.5 text-xs sm:text-sm" dir={isFa ? 'rtl' : 'ltr'}>
              {/* 1. Dose */}
              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-black/40 border border-slate-800">
                <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 shrink-0 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1 text-right rtl:text-right ltr:text-left">
                  <span className="text-xs font-bold text-sky-300 block mb-1">
                    {isFa ? '💊 دوز استاندارد:' : '💊 Standard Dose:'}
                  </span>
                  <p className="text-xs sm:text-[13px] text-slate-200 leading-relaxed font-medium">
                    {info[isFa ? 'doseFa' : 'doseEn']}
                  </p>
                </div>
              </div>

              {/* 2. Usage / Indication */}
              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-black/40 border border-slate-800">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                  <Target className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1 text-right rtl:text-right ltr:text-left">
                  <span className="text-xs font-bold text-emerald-300 block mb-1">
                    {isFa ? '🎯 کاربرد اصلی:' : '🎯 Primary Indication:'}
                  </span>
                  <p className="text-xs sm:text-[13px] text-slate-200 leading-relaxed font-medium">
                    {info[isFa ? 'usageFa' : 'usageEn']}
                  </p>
                </div>
              </div>

              {/* 3. Mechanism */}
              <div className="flex items-start gap-2.5 p-2 rounded-xl bg-teal-950/40 border border-teal-500/30">
                <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-300 shrink-0 mt-0.5">
                  <Dna className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1 text-right rtl:text-right ltr:text-left">
                  <span className="text-xs font-bold text-teal-300 block mb-1">
                    {isFa ? '🧬 مکانیسم اثر:' : '🧬 Mechanism of Action:'}
                  </span>
                  <p className="text-xs sm:text-[13px] text-teal-100 leading-relaxed font-medium">
                    {info[isFa ? 'mechanismFa' : 'mechanismEn']}
                  </p>
                </div>
              </div>

              {/* Optional Caution */}
              {(info.cautionFa || info.cautionEn) && (
                <div className="text-xs text-amber-300/95 bg-amber-950/30 border border-amber-500/30 p-2 rounded-xl leading-relaxed flex items-start gap-2 text-right rtl:text-right ltr:text-left">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <span className="flex-1">{info[isFa ? 'cautionFa' : 'cautionEn']}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </span>
  );
};
