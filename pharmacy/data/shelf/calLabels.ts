import { CalLabelInfo } from '@/types/shelf';

export const CAL_LABELS_DICT: Record<string, CalLabelInfo> = {
  'CAL 1': {
    code: 'CAL 1',
    nameEn: 'Drowsiness / Driving Warning',
    nameFa: 'هشدار خواب‌آلودگی و رانندگی',
    descriptionEn: 'This medicine may cause drowsiness. If affected, do not drive or operate machinery.',
    descriptionFa: 'این دارو ممکن است باعث خواب‌آلودگی شود. در صورت بروز، از رانندگی و کار با ماشین‌آلات خودداری کنید.',
    colorClass: 'bg-amber-500/15 text-amber-950 dark:text-amber-300 border-amber-500/30',
  },
  'CAL 2': {
    code: 'CAL 2',
    nameEn: 'Drowsiness & Alcohol Warning',
    nameFa: 'خواب‌آلودگی شدید و منع الکل',
    descriptionEn: 'This medicine may cause significant drowsiness. Avoid alcohol. If affected, do not drive or operate machinery.',
    descriptionFa: 'این دارو خواب‌آلودگی شدید ایجاد می‌کند. همزمان الکل مصرف نکنید و از رانندگی و کار با ماشین‌آلات بپرهیزید.',
    colorClass: 'bg-rose-500/15 text-rose-950 dark:text-rose-300 border-rose-500/30',
  },
  'CAL 3': {
    code: 'CAL 3',
    nameEn: 'May Cause Drowsiness',
    nameFa: 'احتمال خواب‌آلودگی خفیف',
    descriptionEn: 'This medicine may cause drowsiness and impair alertness in some individuals.',
    descriptionFa: 'این دارو ممکن است در برخی افراد موجب خواب‌آلودگی و کاهش تمرکز شود.',
    colorClass: 'bg-amber-500/15 text-amber-950 dark:text-amber-300 border-amber-500/30',
  },
  'CAL 4': {
    code: 'CAL 4',
    nameEn: 'Refrigerate - Do Not Freeze',
    nameFa: 'نگهداری در یخچال (۲ تا ۸ درجه)',
    descriptionEn: 'Refrigerate - Do not freeze. Store between 2°C and 8°C.',
    descriptionFa: 'در یخچال (۲ تا ۸ درجه سانتی‌گراد) نگهداری شود. از یخ‌زدگی محافظت گردد.',
    colorClass: 'bg-cyan-500/15 text-cyan-950 dark:text-cyan-300 border-cyan-500/30',
  },
  'CAL 5': {
    code: 'CAL 5',
    nameEn: 'Take with a Full Glass of Water',
    nameFa: 'مصرف همراه یک لیوان کامل آب',
    descriptionEn: 'Take with a full glass of water while sitting or standing upright.',
    descriptionFa: 'دارو را در حالت نشسته یا ایستاده همراه با یک لیوان پر از آب میل فرمایید.',
    colorClass: 'bg-sky-500/15 text-sky-950 dark:text-sky-300 border-sky-500/30',
  },
  'CAL 6': {
    code: 'CAL 6',
    nameEn: 'Swallow Whole - Do Not Crush or Chew',
    nameFa: 'بلع کامل - عدم خرد کردن یا جویدن',
    descriptionEn: 'Swallow whole with water. Do not crush, divide or chew.',
    descriptionFa: 'دارو را کامل ببلعید. از شکستن، خرد کردن یا جویدن آن اکیداً خودداری کنید.',
    colorClass: 'bg-indigo-500/15 text-indigo-950 dark:text-indigo-300 border-indigo-500/30',
  },
  'CAL 7': {
    code: 'CAL 7',
    nameEn: 'Dissolve in Water Before Taking',
    nameFa: 'حل در آب پیش از مصرف',
    descriptionEn: 'Dissolve or mix thoroughly in water before taking.',
    descriptionFa: 'پیش از مصرف، قرص یا پودر را کاملاً در آب حل یا مخلوط نمایید.',
    colorClass: 'bg-teal-500/15 text-teal-950 dark:text-teal-300 border-teal-500/30',
  },
  'CAL 8': {
    code: 'CAL 8',
    nameEn: 'Take On Empty Stomach',
    nameFa: 'مصرف با معده خالی (۱ ساعت قبل یا ۲ ساعت بعد غذا)',
    descriptionEn: 'Take on an empty stomach at least 1 hour before or 2 hours after food.',
    descriptionFa: 'دارو را با معده خالی حداقل ۱ ساعت قبل یا ۲ ساعت بعد از غذا میل کنید.',
    colorClass: 'bg-yellow-500/15 text-yellow-950 dark:text-yellow-300 border-yellow-500/30',
  },
  'CAL 9': {
    code: 'CAL 9',
    nameEn: 'Avoid Sunlight / UV Light',
    nameFa: 'پرهیز از تابش مستقیم آفتاب / UV',
    descriptionEn: 'Avoid exposure of skin and eyes to direct sunlight or UV light.',
    descriptionFa: 'از تابش مستقیم نور خورشید و اشعه ماوراء بنفش به پوست و چشم خودداری شود.',
    colorClass: 'bg-orange-500/15 text-orange-950 dark:text-orange-300 border-orange-500/30',
  },
  'CAL 10': {
    code: 'CAL 10',
    nameEn: 'Finish Full Course',
    nameFa: 'تکمیل کامل دوره درمان',
    descriptionEn: 'Take until finished or as directed by doctor. Complete the full course.',
    descriptionFa: 'دارو را تا پایان کامل دوره درمان یا طبق دستور پزشک مصرف کنید.',
    colorClass: 'bg-teal-500/15 text-teal-950 dark:text-teal-300 border-teal-500/30',
  },
  'CAL 11': {
    code: 'CAL 11',
    nameEn: 'Separate from Antacids & Iron',
    nameFa: 'فاصله‌گذاری با آنتی‌اسید و مکمل‌های معدنی',
    descriptionEn: 'Do not take antacids, iron, calcium or zinc supplements within 2 hours of this medicine.',
    descriptionFa: 'حداقل ۲ ساعت بین مصرف این دارو و آنتی‌اسیدها یا مکمل‌های آهن، کلسیم و روی فاصله بگذارید.',
    colorClass: 'bg-amber-500/15 text-amber-950 dark:text-amber-300 border-amber-500/30',
  },
  'CAL 12': {
    code: 'CAL 12',
    nameEn: 'Do Not Exceed Recommended Dose',
    nameFa: 'منع تجاوز از دوز مجاز',
    descriptionEn: 'Do not exceed the recommended daily dose.',
    descriptionFa: 'از مقدار و دوز توصیه شده روزانه فراتر نروید.',
    colorClass: 'bg-rose-500/15 text-rose-950 dark:text-rose-300 border-rose-500/30',
  },
  'CAL 13': {
    code: 'CAL 13',
    nameEn: 'Avoid Alcohol',
    nameFa: 'پرهیز از مصرف الکل',
    descriptionEn: 'Avoid alcohol while taking this medication.',
    descriptionFa: 'همزمان با مصرف این دارو از نوشیدن مشروبات الکلی خودداری کنید.',
    colorClass: 'bg-purple-500/15 text-purple-950 dark:text-purple-300 border-purple-500/30',
  },
  'CAL 14': {
    code: 'CAL 14',
    nameEn: 'Take in the Morning',
    nameFa: 'مصرف در ساعات صبح',
    descriptionEn: 'Take this medication in the morning to reduce nocturnal disturbances or maximize efficacy.',
    descriptionFa: 'این دارو را در نوبت صبح مصرف کنید تا از عوارض شبانه جلوگیری شده یا بیشترین اثر حاصل شود.',
    colorClass: 'bg-sky-500/15 text-sky-950 dark:text-sky-300 border-sky-500/30',
  },
  'CAL 16': {
    code: 'CAL 16',
    nameEn: 'Discard 30 Days After Opening',
    nameFa: 'انقضا ۳۰ روز پس از باز شدن',
    descriptionEn: 'Discard any remaining medication 30 days (or 28 days) after initial opening.',
    descriptionFa: 'باقیمانده دارو را حداکثر ۲۸ الی ۳۰ روز پس از نخستین باز کردن ظرف دور بریزید.',
    colorClass: 'bg-rose-500/15 text-rose-950 dark:text-rose-300 border-rose-500/30',
  },
  'CAL 17': {
    code: 'CAL 17',
    nameEn: 'Shake Well Before Use',
    nameFa: 'تکان دادن کامل قبل از مصرف',
    descriptionEn: 'Shake the bottle well immediately before measuring each dose.',
    descriptionFa: 'قبل از اندازه‌گیری و مصرف هر نوبت، شیشه دارو را به خوبی تکان دهید.',
    colorClass: 'bg-blue-500/15 text-blue-950 dark:text-blue-300 border-blue-500/30',
  },
  'CAL 18': {
    code: 'CAL 18',
    nameEn: 'Keep Out of Reach of Children',
    nameFa: 'دور از دسترس اطفال (خطر مسمومیت شدید)',
    descriptionEn: 'Keep strictly out of reach of children. Even small doses can be dangerous.',
    descriptionFa: 'اکیداً دور از دسترس کودکان قرار دهید؛ مقادیر کم نیز می‌تواند برای اطفال بسیار سمی باشد.',
    colorClass: 'bg-red-500/15 text-red-950 dark:text-red-300 border-red-500/30',
  },
  'CAL 21': {
    code: 'CAL 21',
    nameEn: 'Take Upright with Water - Do Not Lie Down',
    nameFa: 'بلع ایستاده با آب فراوان - پرهیز از دراز کشیدن',
    descriptionEn: 'Take with plenty of water and do not lie down for at least 30 minutes to prevent esophageal irritation.',
    descriptionFa: 'همراه با یک لیوان کامل آب میل کرده و حداقل ۳۰ دقیقه پس از مصرف دراز نکشید تا از آسیب مری جلوگیری شود.',
    colorClass: 'bg-rose-500/15 text-rose-950 dark:text-rose-300 border-rose-500/30',
  },
  'CAL A': {
    code: 'CAL A',
    nameEn: 'Take With or After Food',
    nameFa: 'مصرف همراه یا بعد از غذا',
    descriptionEn: 'Take with or immediately after food or milk.',
    descriptionFa: 'دارو را همراه یا بلافاصله پس از غذا یا شیر میل کنید.',
    colorClass: 'bg-emerald-500/15 text-emerald-950 dark:text-emerald-300 border-emerald-500/30',
  },
  'CAL B': {
    code: 'CAL B',
    nameEn: 'Swallow Whole - Do Not Crush',
    nameFa: 'بلع کامل - عدم خرد کردن قرص',
    descriptionEn: 'Swallow whole with a glass of water. Do not crush, chew or divide.',
    descriptionFa: 'قرص را به طور کامل با یک لیوان آب ببلعید. از خرد کردن، جویدن یا نصف کردن خودداری کنید.',
    colorClass: 'bg-blue-500/15 text-blue-950 dark:text-blue-300 border-blue-500/30',
  },
  'CAL C': {
    code: 'CAL C',
    nameEn: 'Contains Paracetamol',
    nameFa: 'حاوی پاراستامول (استامینوفن)',
    descriptionEn: 'Contains paracetamol. Do not take any other medicines containing paracetamol at the same time.',
    descriptionFa: 'این دارو حاوی استامینوفن است؛ همزمان با آن هیچ داروی دیگری حاوی استامینوفن/پاراستامول مصرف نکنید.',
    colorClass: 'bg-amber-500/15 text-amber-950 dark:text-amber-300 border-amber-500/30',
  },
  'CAL D': {
    code: 'CAL D',
    nameEn: 'Avoid Aspirin & NSAIDs',
    nameFa: 'پرهیز از مصرف همزمان با NSAIDها',
    descriptionEn: 'Do not take aspirin or other non-steroidal anti-inflammatory drugs (NSAIDs) concurrently without medical advice.',
    descriptionFa: 'از مصرف همزمان با آسپیرین یا سایر مسکن‌های ضدالتهابی (مانند ایبوپروفن، دیکلوفناک) بدون مشورت پزشک بپرهیزید.',
    colorClass: 'bg-rose-500/15 text-rose-950 dark:text-rose-300 border-rose-500/30',
  },
};

/**
 * Normalizes any CAL code format (e.g. "CAL-1", "CAL 1", "1", "CAL-A", "CAL A", "cal 10")
 * and returns the corresponding CalLabelInfo object.
 */
export function getCalLabelInfo(rawCode: string): CalLabelInfo {
  const clean = (rawCode || '').toUpperCase().trim().replace(/[-_]/g, ' ');
  const normalizedKey = clean.startsWith('CAL') ? clean : `CAL ${clean}`;
  
  if (CAL_LABELS_DICT[normalizedKey]) {
    return CAL_LABELS_DICT[normalizedKey];
  }

  // Also check direct match
  if (CAL_LABELS_DICT[rawCode]) {
    return CAL_LABELS_DICT[rawCode];
  }

  // Fallback info for undefined codes
  return {
    code: rawCode.toUpperCase(),
    nameEn: `Cautionary Advisory Label ${rawCode}`,
    nameFa: `برچسب احتیاطی و راهنمای مصرف ${rawCode}`,
    descriptionEn: `Follow the standard Australian APF cautionary guidance for ${rawCode}.`,
    descriptionFa: `طبق راهنمای دارونامه استرالیا (APF)، توصیه‌های احتیاطی برچسب ${rawCode} را رعایت فرمایید.`,
    colorClass: 'bg-amber-500/15 text-amber-950 dark:text-amber-300 border-amber-500/30',
  };
}

