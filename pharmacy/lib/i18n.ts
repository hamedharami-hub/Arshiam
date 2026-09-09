export type Language = 'en' | 'fa';

export const i18n = {
  common: {
    active: { fa: 'فعال', en: 'Active' },
    inactive: { fa: 'غیرفعال', en: 'Inactive' },
    reset: { fa: 'بازنشانی', en: 'Reset' },
    delete: { fa: 'حذف', en: 'Delete' },
    deleteImage: { fa: 'حذف عکس', en: 'Delete image' },
    cellImage: { fa: 'تصویر سلول', en: 'Cell Image' },
    loading: { fa: 'در حال بارگذاری...', en: 'Loading...' },
    save: { fa: 'ذخیره', en: 'Save' },
    close: { fa: 'بستن', en: 'Close' },
    cancel: { fa: 'انصراف', en: 'Cancel' },
    search: { fa: 'جستجو...', en: 'Search...' },
    copied: { fa: 'کپی شد', en: 'Copied' },
    copy: { fa: 'کپی', en: 'Copy' },
    all: { fa: 'همه', en: 'All' },
    drugs: { fa: 'داروها:', en: 'Drugs:' },
    keyPearl: { fa: 'نکته کلیدی:', en: 'Key Pearl:' },
    details: { fa: 'شرح:', en: 'Details:' },
    noResponse: { fa: 'پاسخی دریافت نشد.', en: 'No response received.' },
    modulesCount: (count: number) => ({ fa: `${count} ماژول`, en: `${count} Modules` }),
    scenariosCount: (count: number) => ({ fa: `${count} سناریو`, en: `${count} Scenarios` }),
  },
  fred: {
    repeatMode: { fa: 'حالت تکرار:', en: 'Repeat Mode:' },
    chartMode: { fa: 'حالت چارت:', en: 'Chart Mode:' },
    brandPrint: { fa: 'چاپ برند:', en: 'Brand Print:' },
    myHrConsent: { fa: 'رضایت MyHR:', en: 'MyHR Consent:' },
    activeRacf: { fa: 'فعال (RACF)', en: 'Active (RACF)' },
    normal: { fa: 'عادی', en: 'Normal' },
    genericGs: { fa: 'GS (ژنریک)', en: 'GS (Generic)' },
    brandGb: { fa: 'GB (برند)', en: 'GB (Brand)' },
    consented: { fa: 'بله (موافقت)', en: 'Yes (Consented)' },
    optOut: { fa: 'خیر (عدم موافقت)', en: 'No (Opt-out)' },
  },
  triage: {
    activeChat: { fa: 'مکالمه فعال', en: 'Active' },
    starredPhrases: { fa: 'جملات ستاره‌دار', en: 'Starred' },
    viewStarredTitle: { fa: 'مشاهده تمام جملات ستاره‌دار', en: 'View all starred phrases' },
    expandHeight: { fa: 'گسترش ارتفاع پنجره', en: 'Expand height' },
    collapseHeight: { fa: 'کاهش ارتفاع پنجره', en: 'Collapse height' },
    resetScenario: { fa: 'شروع مجدد این سناریو', en: 'Reset scenario' },
    routineAdmin: { fa: 'روتین و اداری', en: 'Admin' },
    slangOtc: { fa: 'عامیانه و OTC', en: 'OTC' },
    conflictSpecial: { fa: 'تعارض و خاص', en: 'Conflict' },
    defaultMeds: { fa: 'طبق گزارش بیمار در تریاژ داروخانه', en: 'As reported during pharmacy triage' },
    defaultSuggestedAction: { fa: 'ارزیابی و معاینه بالینی جامع پزشکی', en: 'Comprehensive medical assessment and review' },
  },
  shelf: {
    activeFilter: { fa: '✓ فعال', en: '✓ Active' },
    domainOverview: { fa: 'نمای کلی حوزه بالینی', en: 'Clinical Domain Overview' },
    compare: { fa: 'مقایسه داروها', en: 'Compare Drugs' },
    mechanism: { fa: 'مکانیسم اثر', en: 'Mechanism of Action' },
    storageRules: { fa: 'شرایط نگهداری و انبارداری', en: 'Storage & Handling Rules' },
  },
  sidebar: {
    kapsModules: { fa: 'ماژول‌های آموزشی', en: 'Learning Modules' },
  }
} as const;

export function t<T extends { fa: string; en: string }>(obj: T, lang: Language): string {
  return lang === 'fa' ? obj.fa : obj.en;
}
