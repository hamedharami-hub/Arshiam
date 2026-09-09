export interface HotspotDetail {
  id: string;
  title_fa: string;
  title_en: string;
  category: 'PRESCRIBER' | 'PATIENT' | 'MEDICATION' | 'SIGNATURE' | 'LEGAL_EXPIRY' | 'STAPLE' | 'S8_COMPLIANCE' | 'ODT_DOSING' | 'GENERIC_SUB';
  laws_fa: string[];
  laws_en: string[];
  dos_and_donts_fa: {
    dos: string[];
    donts: string[];
  };
  dos_and_donts_en: {
    dos: string[];
    donts: string[];
  };
  clinical_tip_fa: string;
  clinical_tip_en: string;
}

export interface RealisticScriptModel {
  id: string;
  tab_id: 'pb82' | 'repeat_pb24' | 'handwritten' | 'escript' | 's8_nsw' | 'odt_racf';
  title_fa: string;
  title_en: string;
  badge: string;
  badge_color: string;
  short_description_fa: string;
  short_description_en: string;
  schedule: 'S4' | 'S8' | 'ODT' | 'MULTI_CHART';
  filing_summary_fa: string;
  filing_summary_en: string;
  hotspots: HotspotDetail[];
}

export const REALISTIC_SCRIPTS_DATABASE: RealisticScriptModel[] = [
  // 1. PBS PB 82 Computerized dual script
  {
    id: 'script_pb82',
    tab_id: 'pb82',
    title_fa: '۱. نسخه چاپی کامپیوتری دوبَرگی PBS (Form PB 82)',
    title_en: '1. Standard Dual-Part Computerized PBS Prescription (PB 82)',
    badge: 'دوبخشی PBS',
    badge_color: 'bg-teal-600 text-white border-teal-400',
    short_description_fa: 'متداول‌ترین فرم کاغذی در مطب پزشکان عمومی استرالیا؛ شامل برگه اصلی (Original) و برگه کپی نازک (Medicare Duplicate).',
    short_description_en: 'Standard dual-part paper format used by Australian GPs; comprises Original prescription and thin Medicare Duplicate copy.',
    schedule: 'S4',
    filing_summary_fa: 'برگه اصلی + برچسب Store Copy به مدت ۲ سال بایگانی می‌شود. در صورت داشتن تکرار، برگه Duplicate به فرم زرد PB 24 منگنه و به بیمار داده می‌شود.',
    filing_summary_en: 'Original script + Store Copy label archived in pharmacy for 2 years. If repeats exist, Duplicate copy is stapled to Yellow Repeat Form PB 24 and handed to patient.',
    hotspots: [
      {
        id: 'pb82_prescriber',
        title_fa: 'مشخصات پزشک و شماره نظام پزشکی (Prescriber Details)',
        title_en: 'Prescriber Details & Provider Number',
        category: 'PRESCRIBER',
        laws_fa: [
          'نام کامل پزشک، آدرس مطب، شماره تماس و شماره نظام پزشکی معتبر (Provider Number) باید درج شده باشد.',
          'نسخه برای تجویز تحت پوشش PBS باید حتماً توسط پزشک دارای مجوز فعال صادر شود.'
        ],
        laws_en: [
          'Prescriber full name, practice address, phone contact, and valid 8-character Provider Number are mandatory.',
          'Must be issued by an authorized prescriber registered with AHPRA/Medicare.'
        ],
        dos_and_donts_fa: {
          dos: [
            'صحت Provider Number پزشک را با مطب یا دیتابیس نظام پزشکی مطابقت دهید.',
            'در صورت ناخوانا بودن آدرس یا شماره تماس با مطب تماس بگیرید.'
          ],
          donts: [
            'هرگز داروی نسخه‌ای را بدون شماره نظام پزشکی معتبر دیسپنس نکنید.',
            'از تحویل نسخه با سربرگ مخدوش یا بدون آدرس فیزیکی خودداری کنید.'
          ]
        },
        dos_and_donts_en: {
          dos: [
            'Verify active Provider Number in dispensing database.',
            'Confirm practice contact details if handwriting or print is faded.'
          ],
          donts: [
            'Never dispense a PBS item with missing or fabricated provider credentials.',
            'Do not accept prescriptions without practice contact details.'
          ]
        },
        clinical_tip_fa: 'نکته کلیدی: بررسی محدوده صلاحیت بالینی پزشک (Scope of Practice) و مطابقت Provider Number صادرکننده با مرکز درمانی الزامی است.',
        clinical_tip_en: 'Key Clinical Note: Always ensure prescriber acts strictly within their accredited clinical scope of practice.'
      },
      {
        id: 'pb82_date',
        title_fa: 'تاریخ نگارش و اعتبار زمانی (Script Date & Legal Expiry)',
        title_en: 'Date of Issue & 12-Month Validity Threshold',
        category: 'LEGAL_EXPIRY',
        laws_fa: [
          'تاریخ دقیق صدور باید توسط پزشک چاپ یا نوشته شود.',
          'نسخه‌های عادی Schedule 4 دقیقاً ۱۲ ماه از تاریخ صدور اعتبار دارند.'
        ],
        laws_en: [
          'Prescription must clearly state the exact date of prescribing.',
          'Standard Schedule 4 prescriptions remain legally valid for exactly 12 months from the date of issue.'
        ],
        dos_and_donts_fa: {
          dos: [
            'تاریخ نسخه را پیش از دیسپنس محاسبه کنید (نباید بیش از ۳۶۵ روز گذشته باشد).',
            'در صورت رسیدن به روز ۳۶۶، بیمار را برای نسخه جدید به پزشک ارجاع دهید.'
          ],
          donts: [
            'هرگز نسخه منقضی‌شده را حتی با اصرار بیمار تحویل ندهید.',
            'تاریخ نگارش را شخصاً تغییر ندهید.'
          ]
        },
        dos_and_donts_en: {
          dos: [
            'Calculate exact days elapsed from writing date prior to processing.',
            'Refer patient back to prescriber if 12 months have passed.'
          ],
          donts: [
            'Never dispense an expired prescription under any circumstances.',
            'Never alter the date of prescribing on the script.'
          ]
        },
        clinical_tip_fa: 'نکته مهم: محاسبه دقیق تاریخ صدور دارو نسبت به روز جاری، پیش‌شرط قانونی تحویل نسخه است و تحویل داروی S4 بعد از ۱۲ ماه ممنوع می‌باشد.',
        clinical_tip_en: 'Key Note: Accurately verify elapsed days from date of issue; supplying S4 medicines after 12 months is illegal.'
      },
      {
        id: 'pb82_patient',
        title_fa: 'مشخصات بیمار و شماره مدیکر (Patient & Medicare Credentials)',
        title_en: 'Patient Name, Address & Medicare Entitlement',
        category: 'PATIENT',
        laws_fa: [
          'نام و نام خانوادگی، آدرس سکونت و شماره کارت Medicare (۱۰ رقم + رقم خط فاصله) الزامی است.',
          'برای داروهای PBS یارانه عمومی یا تخفیفی (Concession) ثبت شماره کارت رفاهی الزامی است.'
        ],
        laws_en: [
          'Full legal name, residential address, and 10-digit Medicare Number (plus IRN) are mandatory.',
          'Concession / Pensioner card numbers must be validated for subsidized PBS rates.'
        ],
        dos_and_donts_fa: {
          dos: [
            'هنگام تحویل، ۲ شناسه هویتی بیمار (نام + آدرس یا تاریخ تولد) را بررسی کنید.',
            'شماره مدیکر را به صورت برخط در سامانه استعلام کنید.'
          ],
          donts: [
            'نسخه فاقد آدرس بیمار را بدون درج آدرس کامل تحویل ندهید.'
          ]
        },
        dos_and_donts_en: {
          dos: [
            'Verify 2 distinct patient identifiers (Name + DOB/Address) at final handout.',
            'Validate Medicare entitlement online in Fred.'
          ],
          donts: [
            'Do not dispense without verifying patient identity and residential address.'
          ]
        },
        clinical_tip_fa: 'نکته ایمنی تحویل دارو (Handout Verification): تایید حداقل دو شناسه مجزا (نام کامل به علاوه آدرس یا تاریخ تولد) تضمین‌کننده تحویل داروی درست به بیمار درست است.',
        clinical_tip_en: 'Patient Safety Note: Always confirm two distinct patient identifiers (Full Name + DOB or Address) prior to final medicine handout.'
      },
      {
        id: 'pb82_medication',
        title_fa: 'دارو، کد PBS و جایگزینی ژنریک (Medication & Generic Substitution)',
        title_en: 'Item Specification, PBS Code & Generic Substitution Box',
        category: 'MEDICATION',
        laws_fa: [
          'نام دارو، دوز، فرم دارویی، تعداد (Quantity) و دفعات تکرار (Repeats) باید شفاف باشد.',
          'اگر پزشک مربع Brand Substitution Not Permitted را تیک نزده باشد، داروساز مجاز به پیشنهاد برند ژنریک معادل (a-flagged) است.'
        ],
        laws_en: [
          'Drug name, strength, formulation, prescribed quantity, and repeat authorisations must be unambiguous.',
          'If Brand Substitution Not Permitted box is left unticked, generic substitution (a-flagged) is permitted with patient consent.'
        ],
        dos_and_donts_fa: {
          dos: [
            'کد PBS دارو را با سامانه مقایسه کنید.',
            'در صورت رضایت بیمار برند ژنریک با پرچم A-Flag تحویل دهید.'
          ],
          donts: [
            'در صورت تیک خوردن عدم جایگزینی برند توسط پزشک، به هیچ عنوان ژنریک تحویل ندهید.'
          ]
        },
        dos_and_donts_en: {
          dos: [
            'Confirm PBS item code and bioequivalence flag.',
            'Offer generic alternatives when permitted to save patient co-payment.'
          ],
          donts: [
            'Never substitute if the prescriber has explicitly ticked "Brand Substitution Not Permitted".'
          ]
        },
        clinical_tip_fa: 'نکته بالینی: در داروهای با پنجره درمانی باریک (NTI مانند لیتیم، وارفارین و فنی‌توئین) تغییر برند دارویی حتی در صورت مجاز بودن PBS توصیه نمی‌شود.',
        clinical_tip_en: 'Clinical Tip: For narrow therapeutic index medicines (Warfarin, Lithium, Phenytoin), brand switching is clinically discouraged.'
      },
      {
        id: 'pb82_signature',
        title_fa: 'امضای معتبر پزشک (Wet-Ink Signature Requirement)',
        title_en: 'Live Ink Signature Requirement',
        category: 'SIGNATURE',
        laws_fa: [
          'در تمام نسخه‌های کاغذی، امضای فیزیکی زنده با خودکار (Wet-Ink Signature) پزشک شرط اساسی اعتبار قانونی است.',
          'امضای فتوکپی، فکس غیراورژانسی یا پرینت کامپیوتری کاملاً نامعتبر و باطل است.'
        ],
        laws_en: [
          'Paper prescriptions legally require an original, handwritten wet-ink signature from the prescriber.',
          'Photocopied, rubber-stamped, or computer-generated facsimile signatures are legally void.'
        ],
        dos_and_donts_fa: {
          dos: [
            'مطمئن شوید امضا با جوهر واقعی روی برگه نقش بسته است.',
            'در صورت چاپ بدون امضا، نسخه را جهت امضای دستی به پزشک بازگردانید.'
          ],
          donts: [
            'هرگز نسخه با امضای اسکن‌شده یا پرینت‌شده را دیسپنس نکنید.'
          ]
        },
        dos_and_donts_en: {
          dos: [
            'Visually confirm live ink on the paper.',
            'Reject printed facsimile signatures on paper PB 82 forms.'
          ],
          donts: [
            'Never dispense against an unsigned computer printout.'
          ]
        },
        clinical_tip_fa: 'نکته حقوقی: پرینت‌های کامپیوتری که فاقد امضای دستی با خودکار هستند فاقد ارزش اجرایی بوده و تحویل دارو بر مبنای آن‌ها تخلف است.',
        clinical_tip_en: 'Legal Note: Computer printouts lacking a manual wet-ink signature are legally invalid for prescription supply.'
      }
    ]
  },

  // 2. Repeat PB-24 + Duplicate
  {
    id: 'script_repeat_pb24',
    tab_id: 'repeat_pb24',
    title_fa: '۲. بسته نسخه تکرار زرد (Repeat Form PB 24 + Duplicate)',
    title_en: '2. Official PBS Repeat Authorisation Form (PB 24) & Duplicate',
    badge: 'فرم تکرار + کپی منگنه شده',
    badge_color: 'bg-amber-500 text-slate-950 border-amber-300 font-extrabold',
    short_description_fa: 'بسته تکرار کاغذی شامل فرم زرد رسمی PB 24 که با منگنه فیزیکی به برگه دوم نسخه پزشک (Medicare Duplicate) متصل شده است.',
    short_description_en: 'Official PBS Repeat Authorisation (Yellow PB 24) physically stapled to the original prescriber Medicare Duplicate copy.',
    schedule: 'S4',
    filing_summary_fa: 'فرم زرد نوبت قبل از کپی جدا و با برچسب Store Copy بایگانی می‌شود؛ فرم زرد جدید مجدداً به برگه کپی منگنه شده و به بیمار تحویل می‌گردد.',
    filing_summary_en: 'Previous yellow form is detached and filed with Store Copy label; new yellow form is re-stapled to the duplicate and given to patient.',
    hotspots: [
      {
        id: 'repeat_staple',
        title_fa: 'الزام منگنه فیزیکی به برگه کپی (Mandatory Staple Connection)',
        title_en: 'Mandatory Staple to Medicare Duplicate Copy',
        category: 'STAPLE',
        laws_fa: [
          'فرم زرد تکرار (PB 24) هرگز نباید به تنهایی به بیمار تحویل شود؛ حتماً باید به برگه دوم نسخه پزشک (Medicare Duplicate) منگنه شود.',
          'ارائه فرم زرد بدون برگه Duplicate توسط بیمار از نظر قانونی نامعتبر و غیرقابل دیسپنس است.'
        ],
        laws_en: [
          'Yellow Repeat Form PB 24 must NEVER be presented or dispensed without its attached Medicare Duplicate Copy.',
          'Detached yellow forms are legally invalid under PBS regulations.'
        ],
        dos_and_donts_fa: {
          dos: [
            'منگنه فیزیکی را بررسی کنید و فرم زرد جدید را محکم به برگه Duplicate منگنه نمایید.',
            'در نوبت آخر (Final Supply) برگه Duplicate را همراه برگه زرد نهایی در داروخانه بایگانی کنید.'
          ],
          donts: [
            'هرگز فرم زرد را بدون اتصال به برگه Duplicate به بیمار تحویل ندهید.'
          ]
        },
        dos_and_donts_en: {
          dos: [
            'Inspect staple integrity and firmly re-staple the new yellow form.',
            'Retain the duplicate on the final dispensing event.'
          ],
          donts: [
            'Never supply medication against an unattached yellow slip.'
          ]
        },
        clinical_tip_fa: 'نکته قانونی: اگر بیماری تنها فرم زرد تکرار را بدون برگه کپی دوم بیاورد، تحویل دارو مجاز نیست و باید تا ارائه کپی یا اخذ تاییدیه منتظر ماند.',
        clinical_tip_en: 'Statutory Rule: If a patient presents a detached yellow repeat slip without the duplicate copy, supply must be withheld until duplicate is obtained.'
      },
      {
        id: 'repeat_barcode',
        title_fa: 'اسکن بارکد تکرار و شناسایی سیستمی (Repeat Barcode & Claims)',
        title_en: 'Repeat Barcode & PBS Online Reconciliation',
        category: 'MEDICATION',
        laws_fa: [
          'بارکد حاوی شماره سریال یکتای فرم تکرار (Repeat Authorisation No) و اتصال به پرونده الکترونیک PBS Online است.',
          'اسکن بارکد فوراً اطلاعات دارویی و تعداد تکرارهای مجاز را بازخوانی می‌کند.'
        ],
        laws_en: [
          'Barcode encodes the unique Repeat Authorisation Number linked to national PBS Online records.',
          'Scanning auto-populates exact item, dosage, and remaining repeats.'
        ],
        dos_and_donts_fa: {
          dos: [
            'بارکد را مستقیماً در نرم‌افزار دیسپنس اسکن کنید تا خطای انسانی صفر شود.',
            'از تطابق داروی فیزیکی با داروی چاپ‌شده روی فرم مطمئن شوید.'
          ],
          donts: [
            'از تایپ دستی بدون بررسی شماره تکرار پرهیز کنید.'
          ]
        },
        dos_and_donts_en: {
          dos: [
            'Scan barcode directly to avoid typing errors.',
            'Verify physical stock against the computerized description.'
          ],
          donts: [
            'Do not manually override script records without clinical reason.'
          ]
        },
        clinical_tip_fa: 'نکته سیستمی: اسکن بارکد نسخه تکرار مستقیماً سوابق دیسپنس را از سامانه استعلام کرده و احتمال خطا در ثبت تعداد باقی‌مانده را به صفر می‌رساند.',
        clinical_tip_en: 'Practice Tip: Barcode scanning automates accurate reconciliation of repeats and eliminates data entry mistakes.'
      },
      {
        id: 'repeat_counter',
        title_fa: 'شمارنده تکرارهای باقیمانده (Repeats Remaining Counter)',
        title_en: 'Repeats Countdown & Final Supply Protocol',
        category: 'MEDICATION',
        laws_fa: [
          'در هر نوبت تحویل، یک شماره از تکرارها کسر می‌شود (مثلاً 4 of 5 Repeats Remaining).',
          'در نوبت آخر (Final Repeat)، عبارت No Repeats Remaining چاپ شده و هیچ برگه زرد جدیدی صادر نمی‌گردد.'
        ],
        laws_en: [
          'Repeat count decrements with each dispense (e.g. 4 of 5 Repeats Remaining).',
          'On final supply, "No Repeats Remaining" is printed and no new yellow slip is generated.'
        ],
        dos_and_donts_fa: {
          dos: [
            'به بیمار اطلاع دهید چند نوبت تکرار برای وی باقی مانده است.',
            'در نوبت آخر به بیمار یادآوری کنید که برای نوبت بعد به پزشک مراجعه کند.'
          ],
          donts: [
            'بیش از تعداد تکرار مجاز قانونی، دارو تحویل ندهید.'
          ]
        },
        dos_and_donts_en: {
          dos: [
            'Inform patient clearly of their remaining repeats.',
            'Remind patient to book GP visit on the final repeat.'
          ],
          donts: [
            'Never dispense beyond the authorized number of repeats.'
          ]
        },
        clinical_tip_fa: 'نکته تکرار پایانی: در نوبت آخر تکرار، پرونده نسخه بسته شده و داروساز باید به بیمار یادآوری کند جهت تمدید درمان به پزشک مراجعه نماید.',
        clinical_tip_en: 'Care Note: On final supply (0 repeats left), counsel the patient in advance to schedule a GP appointment for ongoing therapy.'
      },
      {
        id: 'repeat_previous_audit',
        title_fa: 'سوابق نوبت قبل و فاصله مجاز تکرار (Previous Dispense & Interval)',
        title_en: 'Previous Supply Audit & Safety Net 20-Day Rule',
        category: 'LEGAL_EXPIRY',
        laws_fa: [
          'تاریخ تحویل قبلی و کد Section 90 داروخانه قبلی روی فرم چاپ شده است.',
          'بررسی فاصله زمانی دیسپنس جهت جلوگیری از تحویل زودهنگام (Immediate / Early Supply) الزامی است.'
        ],
        laws_en: [
          'Displays last supply date and Section 90 pharmacy approval number.',
          'Pharmacist must audit repeat intervals to comply with PBS Safety Net 20-day rule.'
        ],
        dos_and_donts_fa: {
          dos: [
            'فاصله زمانی مصرف را با دوز روزانه مقایسه کنید (مثلاً داروی ۳۰ روزه نباید بعد از ۵ روز دوباره تحویل شود مگر با تایید فوری).',
            'در صورت درخواست زودهنگام با دلایل موجه (مثل گم شدن دارو یا مسافرت) تاییدیه پزشک یا کد Immediate Supply ثبت کنید.'
          ],
          donts: [
            'بدون توجیه بالینی و قانونی، تکرار زودهنگام را تحویل ندهید.'
          ]
        },
        dos_and_donts_en: {
          dos: [
            'Audit days elapsed against prescribed daily dosage.',
            'Endorse with emergency supply / destroyed medication code if justified.'
          ],
          donts: [
            'Do not dispense repeats prematurely without clinical rationale.'
          ]
        },
        clinical_tip_fa: 'نکته بالینی و مالی: رعایت فاصله ۲۰ روزه (Safety Net 20-Day Rule) برای جلوگیری از سوءاستفاده یا اختلال در سقف تجمیع هزینه‌های دارویی ضروری است.',
        clinical_tip_en: 'Clinical & Policy Note: Comply with the 20-day rule to protect Safety Net integrity and audit compliance.'
      }
    ]
  },

  // 3. Handwritten Carbon Script
  {
    id: 'script_handwritten',
    tab_id: 'handwritten',
    title_fa: '۳. نسخه دست‌نویس کاربنی پزشک (Handwritten Carbon Script)',
    title_en: '3. Doctor Handwritten Carbon Prescription Pad',
    badge: 'دست‌نویس پد',
    badge_color: 'bg-amber-700 text-amber-100 border-amber-500',
    short_description_fa: 'پدهای دستی کاربندار برای ویزیت در منزل، کشیک بیمارستان یا زمان قطعی سیستم با مهر رسمی و پاراف خط‌خوردگی‌ها.',
    short_description_en: 'Handwritten carbon pad used during home visits, locum work, or power outages; features clinic stamp and prescriber initialed alterations.',
    schedule: 'S4',
    filing_summary_fa: 'برگ اول دست‌نویس با لیبل Store Copy در داروخانه بایگانی می‌شود؛ برگه کاربنی کپی به فرم زرد تکرار منگنه و به بیمار داده می‌شود.',
    filing_summary_en: 'Top handwritten sheet filed with Store Copy in pharmacy; carbon duplicate stapled to yellow repeat slip.',
    hotspots: [
      {
        id: 'hw_clinic_stamp',
        title_fa: 'مهر رسمی کلینیک و اطلاعات تماس (Clinic Stamp Verification)',
        title_en: 'Clinic Stamp & Prescriber Contact Legibility',
        category: 'PRESCRIBER',
        laws_fa: [
          'در پدهای دستی، وجود مهر واضح کلینیک شامل نام پزشک، شماره نظام پزشکی، آدرس و شماره تلفن اجباری است.'
        ],
        laws_en: [
          'Handwritten pad must carry a crisp clinic stamp displaying prescriber name, provider number, and direct telephone contact.'
        ],
        dos_and_donts_fa: {
          dos: [
            'وضوح مهر و تلفن مطب را بررسی کنید.',
            'در صورت خوانا نبودن دست‌خط پزشک با شماره روی مهر تماس بگیرید.'
          ],
          donts: [
            'نسخه دست‌نویس بدون مهر یا بدون آدرس مطب را قبول نکنید.'
          ]
        },
        dos_and_donts_en: {
          dos: [
            'Inspect clinic stamp clarity.',
            'Call practice if dosage abbreviations are ambiguous.'
          ],
          donts: [
            'Do not accept unidentifiable unstamped handwritten pads.'
          ]
        },
        clinical_tip_fa: 'نکته کاربردی: در نسخه‌های دست‌نویس، هرگونه ابهام در دوز، اختصارات دارویی یا دستور مصرف باید با تماس مستقیم با مطب شفاف‌سازی شود.',
        clinical_tip_en: 'Practice Tip: Contact prescriber promptly whenever handwritten directions or abbreviations present ambiguity.'
      },
      {
        id: 'hw_initialed_alteration',
        title_fa: 'سناریوی خط‌خوردگی و پاراف پزشک (Initialed Alteration Check)',
        title_en: 'Prescriber Initialed Alteration & Forgery Defense',
        category: 'LEGAL_EXPIRY',
        laws_fa: [
          'هرگونه خط‌خوردگی، تصحیح دوز، تعداد یا تغییر دستور مصرف در نسخه دست‌نویس باید الزاماً توسط خود پزشک پاراف (Initial) و تاریخ‌گذاری شود.',
          'خط‌خوردگی بدون پاراف پزشک مشکوک به جعل (Forgery) تلقی شده و نسخه فاقد اعتبار قانونی است.'
        ],
        laws_en: [
          'Any handwritten alteration to dose, strength, quantity, or directions MUST be initialed by the prescriber.',
          'Uninitialed alterations render the prescription suspect for forgery and legally void.'
        ],
        dos_and_donts_fa: {
          dos: [
            'محل تصحیح را بررسی کنید تا حروف اختصاری امضای پزشک (مثلاً JW) کنار آن درج شده باشد.',
            'در صورت عدم پاراف، پیش از دیسپنس با پزشک تماس تلفنی برقرار نمایید.'
          ],
          donts: [
            'هرگز نسخه دست‌خورده بدون پاراف را تحویل ندهید.'
          ]
        },
        dos_and_donts_en: {
          dos: [
            'Inspect initials next to strikethroughs.',
            'Telephone prescriber to confirm altered dosages if uninitialed.'
          ],
          donts: [
            'Never supply altered scripts without prescriber validation.'
          ]
        },
        clinical_tip_fa: 'نکته پیشگیری از جعل: تغییر مقادیر یا دوز دارو در نسخه دست‌نویس بدون پاراف پزشک یک نشانه جدی از احتمال دستکاری غیرمجاز است.',
        clinical_tip_en: 'Forgery Prevention: Any alteration to quantity or dose lacking prescriber initials must be treated as potentially fraudulent.'
      },
      {
        id: 'hw_directions_clarity',
        title_fa: 'دستور مصرف دست‌نویس و احتیاط‌های بالینی (Directions Clarity)',
        title_en: 'Handwritten Directions & Safety Advisory',
        category: 'MEDICATION',
        laws_fa: [
          'دستور مصرف باید دقیق، خوانا و بدون عبارات مبهم مثل "Use as directed" (مگر در موارد خاص و موجه) باشد.'
        ],
        laws_en: [
          'Directions must be unambiguous; vague directions like "As Directed" should be clarified for safety.'
        ],
        dos_and_donts_fa: {
          dos: [
            'دستور مصرف دست‌نویس را به فارسی/انگلیسی ساده روی لیبل کامپیوتری تایپ و چاپ کنید.',
            'هشدارهای احتیاطی (Ancillary Labels مثل CAL 1, CAL 2) را الصاق نمایید.'
          ],
          donts: [
            'دستور مصرف مبهم را بدون مشاوره با بیمار تایپ نکنید.'
          ]
        },
        dos_and_donts_en: {
          dos: [
            'Transcribe directions into clear typed instructions on the dispensing label.',
            'Attach appropriate Cautionary Advisory Labels (CAL).'
          ],
          donts: [
            'Never print illegible or confusing instructions on patient labels.'
          ]
        },
        clinical_tip_fa: 'نکته استاندارد برچسب‌گذاری: همواره اختصارات تخصصی نسخه دست‌نویس (نظیر tds یا po) را به جملات واضح و روان روی لیبل دارو ترجمه کنید.',
        clinical_tip_en: 'Labeling Standard: Always translate abbreviated clinical Latin terms into clear patient counseling English on dispensing labels.'
      }
    ]
  },

  // 4. eScript Digital Token
  {
    id: 'script_escript',
    tab_id: 'escript',
    title_fa: '۴. توکن نسخه تمام‌الکترونیک (eScript QR Token / ASL)',
    title_en: '4. Electronic Prescription QR Token & Active Script List',
    badge: 'توکن eScript',
    badge_color: 'bg-emerald-600 text-white border-emerald-400',
    short_description_fa: 'نسخه کاملاً دیجیتال امن با بارکد QR در تلفن همراه بیمار متصل به سامانه ملی Prescription Delivery Service (PDS).',
    short_description_en: 'Paperless cryptographic QR token presented on patient smartphone, synced with national Prescription Delivery Service (PDS).',
    schedule: 'S4',
    filing_summary_fa: 'بایگانی کاملاً دیجیتال است. با اسکن QR، توکن در شبکه قفل و مصرف می‌شود و توکن تکرار جدید به گوشی بیمار پیامک/ایمیل می‌گردد.',
    filing_summary_en: 'Fully paperless cloud filing. Scanning consumes the single-use token and generates a new repeat token sent to patient phone.',
    hotspots: [
      {
        id: 'escript_qr_token',
        title_fa: 'امضای دیجیتال و بارکد یک‌بارمصرف (Cryptographic QR Token)',
        title_en: 'Cryptographic QR Token & Single-Use Locking',
        category: 'SIGNATURE',
        laws_fa: [
          'توکن eScript حاوی امضای دیجیتال رمزنگاری‌شده (Cryptographic Hash) است و نیازی به امضای دستی با خودکار ندارد.',
          'هر توکن تنها یک‌بار قابلیت اسکن و دیسپنس دارد (Single-Use Token) و پس از تحویل در سرور ملی باطل می‌شود.'
        ],
        laws_en: [
          'eScript token embeds cryptographic signature from the GP clinical software; manual wet signature is not required.',
          'Tokens are single-use; the national PDS locks the token upon first download to prevent double dispensing.'
        ],
        dos_and_donts_fa: {
          dos: [
            'بارکد QR را مستقیماً از روی صفحه گوشی بیمار با اسکنر ۲ بعدی اسکن کنید.',
            'پس از دیسپنس، مطمئن شوید توکن تکرار جدید برای بیمار پیامک یا ایمیل شده است.'
          ],
          donts: [
            'هرگز از روی اسکرین‌شات‌های نامعتبر یا توکن‌های قبلاً مصرف‌شده دارو تحویل ندهید.'
          ]
        },
        dos_and_donts_en: {
          dos: [
            'Scan QR code directly using a 2D barcode scanner.',
            'Confirm the new repeat token is dispatched to the patient SMS/Email.'
          ],
          donts: [
            'Never dispense from a stale or already consumed token.'
          ]
        },
        clinical_tip_fa: 'نکته فنی: توکن الکترونیکی صرفاً یک کلید امنیتی برای بارگذاری اصل نسخه معتبر از سرورهای ملی است و به منزله عکس نسخه نیست.',
        clinical_tip_en: 'Technical Note: An electronic token is an encrypted key that unlocks the legal prescription record from the national cloud exchange.'
      },
      {
        id: 'escript_asl_hub',
        title_fa: 'سامانه جامع لیست نسخه‌های فعال (Active Script List - ASL)',
        title_en: 'Active Script List (ASL) Access & Consent',
        category: 'PATIENT',
        laws_fa: [
          'بیمار می‌تواند بدون نشان دادن تک‌تک توکن‌ها، با رضایت هویتی به داروخانه دسترسی به کل لیست نسخه‌های فعال خود (ASL) را اعطا کند.'
        ],
        laws_en: [
          'Patients can grant ASL access to the pharmacy after identity confirmation, removing the need for individual SMS tokens.'
        ],
        dos_and_donts_fa: {
          dos: [
            'پیش از باز کردن ASL بیمار، هویت او را با ۲ شناسه معتبر احراز کنید.',
            'تنها اقلام مورد نیاز جاری بیمار را از لیست دیسپنس نمایید.'
          ],
          donts: [
            'بدون رضایت صریح بیمار به پروفایل ASL وارد نشوید.'
          ]
        },
        dos_and_donts_en: {
          dos: [
            'Verify patient identity with 2 identifiers prior to accessing ASL.',
            'Select only currently requested medications for dispensing.'
          ],
          donts: [
            'Never access patient ASL records without informed patient consent.'
          ]
        },
        clinical_tip_fa: 'نکته حریم خصوصی و اخلاق حرفه‌ای: دسترسی به سوابق دارویی بیمار در ASL تنها با اخذ رضایت آگاهانه و احراز هویت بیمار مجاز است.',
        clinical_tip_en: 'Privacy & Ethics Note: Accessing patient records via ASL strictly requires informed consent and identity verification.'
      }
    ]
  },

  // 5. NSW S8 Controlled Drug Script
  {
    id: 'script_s8_nsw',
    tab_id: 's8_nsw',
    title_fa: '۵. نسخه داروی مخدر تحت کنترل شدید (NSW S8 Script)',
    title_en: '5. NSW Schedule 8 Controlled Drug Prescription Pad',
    badge: 'نسخه زرد S8',
    badge_color: 'bg-rose-700 text-rose-100 border-rose-500',
    short_description_fa: 'نسخه داروهای مخدری و آرام‌بخش‌های تحت کنترل؛ الزامات سخت‌گیرانه شامل تاریخ تولد، نگارش حروفی و عددی، و استعلام SafeScript.',
    short_description_en: 'Controlled Drugs (Schedule 8) prescription governed by strict NSW Poisons Act: Figures & Words, mandatory DOB, 6-month expiry, and SafeScript audit.',
    schedule: 'S8',
    filing_summary_fa: 'نسخه کاغذی در زونکن اختصاصی S8 (S8 Script File) به مدت ۲ سال بایگانی و فیزیک دارو داخل گاوصندوق فولادی (Safe) نگهداری می‌شود.',
    filing_summary_en: 'Paper S8 script filed in dedicated S8 folder for 2 years; physical stock secured inside heavy steel safe; registered in S8 Register.',
    hotspots: [
      {
        id: 's8_figures_and_words',
        title_fa: 'الزام نگارش تعداد و دوز به عدد و حروف (Figures and Words)',
        title_en: 'Mandatory Quantity & Strength in Figures and Words',
        category: 'S8_COMPLIANCE',
        laws_fa: [
          'طبق قانون سموم نیوساوث‌ولز (NSW Poisons and Therapeutic Goods Regulation)، تعداد کل داروهای S8 باید حتماً هم به عدد و هم با حروف نوشته شود.',
          'مثال معتبر: Twenty (20) Tablets یا Fifty (50) mL.',
          'در صورت عدم درج حروف، دیسپنس نسخه از نظر قانونی باطل و تخلف سنگین است.'
        ],
        laws_en: [
          'NSW legislation requires total quantity and dose of S8 medications to be written in BOTH figures and words to prevent fraudulent alterations.',
          'Valid example: Twenty (20) Tablets.',
          'Missing words renders the prescription legally non-dispensable.'
        ],
        dos_and_donts_fa: {
          dos: [
            'مطمئن شوید هم عدد (20) و هم کلمه (Twenty) درج شده باشد.',
            'در صورت عدم وجود حروف، با پزشک تماس گرفته و نسخه اصلاح‌شده یا تاییدیه تلفنی اضطراری دریافت نمایید.'
          ],
          donts: [
            'هرگز نسخه S8 دارای عدد تنها بدون حروف را دیسپنس نکنید.'
          ]
        },
        dos_and_donts_en: {
          dos: [
            'Confirm both figure (20) and word (Twenty) match perfectly.',
            'Contact prescriber if words are omitted.'
          ],
          donts: [
            'Never supply an S8 drug if quantity in words is missing.'
          ]
        },
        clinical_tip_fa: 'نکته قانونی بحرانی: در داروهای S8 درج همزمان عدد و حروف برای تعداد و دوز دارو اجباری است تا مانع از اضافه کردن ارقام تقلبی شود.',
        clinical_tip_en: 'Critical Statutory Rule: S8 medicines mandate quantity and dose in both figures and words to prevent fraudulent digit additions.'
      },
      {
        id: 's8_strict_expiry_rule',
        title_fa: 'اعتبار زمانی اکیداً ۶ ماهه نسخه‌های S8 (Strict 6 Months Expiry)',
        title_en: 'Strict 6-Month Expiry Rule for Schedule 8 Drugs',
        category: 'LEGAL_EXPIRY',
        laws_fa: [
          'برخلاف داروهای عادی S4 که ۱۲ ماه اعتبار دارند، نسخه‌های S8 دقیقاً و اکیداً ۶ ماه پس از تاریخ صدور منقضی و باطل می‌شوند.',
          'هیچ تکراری پس از گذشت ۶ ماه از تاریخ نگارش نسخه قابل تحویل نیست.'
        ],
        laws_en: [
          'S8 prescriptions legally expire strictly 6 months after the date of issue (compared to 12 months for standard S4 medicines).',
          'No repeat authorisations may be supplied after the 6-month threshold.'
        ],
        dos_and_donts_fa: {
          dos: [
            'تاریخ نسخه S8 را محاسبه کنید تا دقیقاً زیر ۱۸۰ روز (۶ ماه) باشد.',
            'حتی اگر تکرار باقیمانده دارد، پس از ۶ ماه بیمار را به پزشک ارجاع دهید.'
          ],
          donts: [
            'تحویل داروی S8 در ماه هفتم یا بعد از آن ممنوع و پیگرد قانونی دارد.'
          ]
        },
        dos_and_donts_en: {
          dos: [
            'Calculate exact days from issuance date (must be <= 6 months).',
            'Refer patient to GP for a fresh prescription once 6 months expire.'
          ],
          donts: [
            'Never dispense an S8 repeat after the 6-month validity threshold.'
          ]
        },
        clinical_tip_fa: 'نکته انقضای S8: اعتبار کلیه نسخه‌های داروهای تحت کنترل اکیداً ۶ ماه است و هیچ نوبت تکراری پس از گذشت ۶ ماه قابل تحویل نیست.',
        clinical_tip_en: 'Expiry Rule: Controlled drug prescriptions expire strictly 6 months from issue; repeats cannot be fulfilled beyond this timeframe.'
      },
      {
        id: 's8_safescript_audit',
        title_fa: 'استعلام اجباری سامانه پایش کشوری SafeScript NSW (RTPM)',
        title_en: 'Mandatory SafeScript NSW Real-Time Prescription Monitoring',
        category: 'S8_COMPLIANCE',
        laws_fa: [
          'داروساز موظف است پیش از تحویل داروی S8، سوابق بیمار را در سامانه مانیتورینگ بلادرنگ SafeScript بررسی کند.',
          'بررسی هشدارهای دوزهای بالا، مصرف همزمان بنزودیازپین‌ها یا دریافت دارو از چند پزشک مختلف (Doctor Shopping).'
        ],
        laws_en: [
          'Pharmacists are legally required to review SafeScript NSW alerts before supplying any monitored S8 medicine.',
          'Screens for dangerous high-dose opioids, multi-prescriber access, or concurrent benzodiazepines.'
        ],
        dos_and_donts_fa: {
          dos: [
            'هشدار قرمز (Red Alert) را جدی بگیرید و پیش از تحویل با پزشک معالج هماهنگ کنید.',
            'تراکنش را در سامانه SafeScript و دفتر رسمی مخدرات (S8 Drug Register) ثبت نمایید.'
          ],
          donts: [
            'هشدار قرمز پایش دارویی را بدون بررسی بالینی نادیده نگیرید.'
          ]
        },
        dos_and_donts_en: {
          dos: [
            'Investigate Red Alerts and consult prescriber before dispensing.',
            'Record entry in official electronic pharmacy S8 Dangerous Drugs Register.'
          ],
          donts: [
            'Never bypass high-risk SafeScript red alerts without clinical intervention.'
          ]
        },
        clinical_tip_fa: 'نکته پایش بالینی: بررسی سیستم مانیتورینگ SafeScript پیش از تحویل اوپیوئیدها مانع از تداخلات مرگبار و دریافت همزمان داروهای پرخطر می‌شود.',
        clinical_tip_en: 'Clinical Monitoring: Reviewing real-time monitoring alerts ensures patient safety and prevents concurrent high-risk polypharmacy.'
      },
      {
        id: 's8_repeat_intervals',
        title_fa: 'رعایت فواصل زمانی تکرار (Repeat Intervals Compliance)',
        title_en: 'Enforcing Repeat Intervals & Anti-Abuse Controls',
        category: 'LEGAL_EXPIRY',
        laws_fa: [
          'پزشک معمولاً فاصله زمانی مشخصی (مثلاً هر ۱۴ یا ۲۸ روز) برای تحویل تکرارها تعیین می‌کند.',
          'تحویل زودتر از موعد بدون تاییدیه صریح پزشک غیرقانونی است.'
        ],
        laws_en: [
          'Prescribers specify mandatory minimum intervals between repeats (e.g. repeat every 14 days).',
          'Early supply without explicit prescriber endorsement is strictly prohibited.'
        ],
        dos_and_donts_fa: {
          dos: [
            'فاصله آخرین تاریخ تحویل را در سیستم قفل کنید.',
            'در صورت درخواست زودهنگام بیمار، با پزشک تماس بگیرید.'
          ],
          donts: [
            'از تحویل زودهنگام داروهای مسکن مخدری به اصرار بیمار خودداری کنید.'
          ]
        },
        dos_and_donts_en: {
          dos: [
            'Enforce system interval locks between repeat supplies.',
            'Contact prescriber if patient requests early supply due to loss or travel.'
          ],
          donts: [
            'Never supply S8 repeats early based solely on patient insistence.'
          ]
        },
        clinical_tip_fa: 'نکته کنترل توزیع: پایبندی دقیق به بازه زمانی تعیین‌شده برای تحویل تکرارهای S8 از ایجاد وابستگی یا سوءمصرف دارویی جلوگیری می‌کند.',
        clinical_tip_en: 'Supply Control Note: Strict adherence to repeat intervals prevents drug accumulation, dependence, and potential diversion.'
      }
    ]
  },

  // 6. NSW ODT & RACF Chart
  {
    id: 'script_odt_racf',
    tab_id: 'odt_racf',
    title_fa: '۶. فرم درمان اعتیاد و چارت سالمندان (NSW ODT & RACF Chart)',
    title_en: '6. NSW Opioid Treatment Program & Residential Medication Chart',
    badge: 'فرم NSW ODT & چارت RACF',
    badge_color: 'bg-purple-700 text-purple-100 border-purple-500',
    short_description_fa: 'پروتکل درمان جایگزین اپیوئید (متادون/بوپرنورفین) با تفکیک دوز تحت‌نظارت و خانگی، به همراه چارت چنددارویی NRMC خانه سالمندان.',
    short_description_en: 'NSW OTP protocol for Methadone/Buprenorphine dosing matrix, alongside National Residential Medication Charts (NRMC/Webster-pak).',
    schedule: 'ODT',
    filing_summary_fa: 'فرم‌های ODT در پوشه کلینیکال روزانه OTP نگهداری و پس از پایان دوره آرشیو می‌شوند. چارت‌های NRMC حداکثر ۶ ماه اعتبار دیسپنس دارند.',
    filing_summary_en: 'OTP forms kept in daily dosing folder and archived for 2 years; NRMC aged care charts remain valid for up to 6 months.',
    hotspots: [
      {
        id: 'odt_nominated_pharmacy_check',
        title_fa: 'الزام نام‌بردن داروخانه منتخب (Nominated Pharmacy)',
        title_en: 'Strict Nominated Pharmacy Requirement',
        category: 'ODT_DOSING',
        laws_fa: [
          'نسخه ODT فقط و فقط در داروخانه‌ای که نام و آدرس آن صراحتاً در فرم توسط پزشک درج شده، دارای اعتبار قانونی است.',
          'دریافت همزمان دارو از دو مرکز ممنوع و نیازمند هماهنگی کتبی با واحد هماهنگی NSW Health است.'
        ],
        laws_en: [
          'An OTP prescription is strictly valid ONLY at the specific pharmacy nominated on the prescriber form.',
          'Dosing at multiple pharmacies concurrently is strictly illegal.'
        ],
        dos_and_donts_fa: {
          dos: [
            'مطمئن شوید نام داروخانه شما به عنوان Nominated Pharmacy درج شده باشد.',
            'در صورت انتقال بیمار از داروخانه دیگر، برگه تاییدیه انتقال رسمی را مطالبه کنید.'
          ],
          donts: [
            'هرگز به بیماری که نام داروخانه دیگری در فرم او قید شده دوز تحویل ندهید.'
          ]
        },
        dos_and_donts_en: {
          dos: [
            'Verify your exact pharmacy name is specified on the OTP authority form.',
            'Obtain formal transfer documentation if client is transitioning from another pharmacy.'
          ],
          donts: [
            'Never dose a patient registered to a different nominated pharmacy.'
          ]
        },
        clinical_tip_fa: 'نکته قانونی برنامه درمان اعتیاد: تحویل داروی ODT منحصراً در داروخانه منتخب قید شده در برگه پزشک مجاز است و در سایر داروخانه‌ها باطل است.',
        clinical_tip_en: 'OTP Legal Standard: Pharmacotherapy dosing is strictly restricted to the authorized nominated pharmacy written on the protocol.'
      },
      {
        id: 'odt_supervised_vs_takeaway_check',
        title_fa: 'تفکیک دوز تحت‌نظارت از دوز خانگی (Supervised vs Takeaway)',
        title_en: 'Supervised vs Takeaway Dosing Matrix',
        category: 'ODT_DOSING',
        laws_fa: [
          'دوزهای روزانه تحت نظارت (Supervised) باید مستقیماً در حضور داروساز میل شوند.',
          'دوزهای خانگی (Takeaway) فقط برای روزهای مشخص‌شده توسط پزشک و در ظروف ایمن ضدکودک (Child-resistant) تحویل می‌گردند.'
        ],
        laws_en: [
          'Supervised doses must be fully consumed under direct visual observation of the pharmacist.',
          'Takeaway doses are restricted strictly to authorized days and packaged in child-resistant bottles.'
        ],
        dos_and_donts_fa: {
          dos: [
            'بلع کامل مایع متادون و صحبت کردن بیمار پس از مصرف را مشاهده کنید.',
            'تاریخ دقیق هر روز را در جدول امضا و خط بزنید (Strikethrough).'
          ],
          donts: [
            'تعداد دوزهای خانگی را بیش از حد مجاز فرم پزشک افزایش ندهید.'
          ]
        },
        dos_and_donts_en: {
          dos: [
            'Visually confirm complete swallowing (engage client in brief conversation).',
            'Cross out and initial each completed dosing date in the matrix.'
          ],
          donts: [
            'Never grant extra takeaway doses without written prescriber amendment.'
          ]
        },
        clinical_tip_fa: 'نکته مصرف تحت نظارت: جهت تایید بلع کامل دوز مایع، داروساز باید پس از مصرف با بیمار گفتگوی کوتاهی انجام دهد.',
        clinical_tip_en: 'Supervised Dosing Practice: Engage client in brief conversation after ingestion to confirm complete swallowing.'
      },
      {
        id: 'odt_missed_doses_protocol',
        title_fa: 'قانون طلایی غیبت بیش از ۳ روز متوالی (Missed Doses > 3 Days)',
        title_en: 'Critical Clinical Rule: >3 Missed Doses Protocol',
        category: 'ODT_DOSING',
        laws_fa: [
          'در صورت غیبت بیمار بیش از ۳ روز متوالی، به دلیل افت سریع تحمل بدنی نسبت به اوپیوئیدها، تحویل دوز معمول اکیداً ممنوع و خطر مرگ دارد.',
          'داروساز موظف است بیمار را متوقف کرده و فوراً با پزشک معالج جهت دریافت دوز تعدیل‌شده (Re-titration dose) تماس بگیرد.'
        ],
        laws_en: [
          'If a client misses >3 consecutive days of Methadone/Buprenorphine, tolerance drops drastically; resuming normal dose risks fatal overdose.',
          'Pharmacist must hold dose and contact prescriber for a safe dose step-down or re-induction plan.'
        ],
        dos_and_donts_fa: {
          dos: [
            'جدول حضور روزانه بیمار را بررسی کنید.',
            'در صورت ۴ روز غیبت، دوز را تحویل ندهید و فوراً به پزشک ارجاع دهید.'
          ],
          donts: [
            'هرگز پس از ۴ روز غیبت دوز کامل متادون (مثلاً 80mg) را تحویل ندهید.'
          ]
        },
        dos_and_donts_en: {
          dos: [
            'Audit consecutive days since last recorded dose.',
            'Withhold dose if >3 days missed and contact the prescriber immediately.'
          ],
          donts: [
            'Never administer full maintenance dose after >3 missed days.'
          ]
        },
        clinical_tip_fa: 'هشدار حیاتی ایمنی بیمار: پس از ۳ روز غیبت متوالی، به دلیل افت تحمل فیزیولوژیک بدن، مصرف دوز قبلی خطر مسمومیت شدید و ایست تنفسی دارد و هماهنگی مجدد با پزشک الزامی است.',
        clinical_tip_en: 'Vital Patient Safety Warning: Resuming full dose after >3 missed days risks fatal respiratory depression due to rapid loss of opioid tolerance.'
      },
      {
        id: 'racf_nrmc_chart_rules',
        title_fa: 'الزامات چارت NRMC و وبسترپک سالمندان (NRMC & Webster-pak Rules)',
        title_en: 'National Residential Medication Chart 6-Month Expiry',
        category: 'LEGAL_EXPIRY',
        laws_fa: [
          'چارت NRMC به عنوان نسخه مادر برای سالمندان عمل کرده و حداکثر ۶ ماه اعتبار دیسپنس مداوم دارد.',
          'هر قلم دارو باید دارای امضا و تاریخ مجزای پزشک باشد (امضای کلی در انتهای صفحه فاقد اعتبار است).'
        ],
        laws_en: [
          'NRMC acts as the legal dispensing script for aged care facilities, valid for up to 6 months.',
          'Each individual medication order must be signed and dated by the medical officer.'
        ],
        dos_and_donts_fa: {
          dos: [
            'تاریخ اعتبار ۶ ماهه چارت را پیش از بسته‌بندی هفتگی وبسترپک کنترل کنید.',
            'لیبل هفتگی با تصاویر و مشخصات قرص‌ها را پشت شیت الصاق نمایید.'
          ],
          donts: [
            'از بسته‌بندی داروهایی که سطر آن‌ها توسط پزشک امضا نشده خودداری کنید.'
          ]
        },
        dos_and_donts_en: {
          dos: [
            'Audit chart 6-month expiry prior to packing Webster-paks.',
            'Affix comprehensive weekly header labels with pill identification images.'
          ],
          donts: [
            'Do not pack unsigned or ambiguous medication line items.'
          ]
        },
        clinical_tip_fa: 'نکته مراقبت سالمندان: هرگونه تغییر در دوز داروهای چارت NRMC مستلزم خط زدن سطر قبلی و ثبت دستور دارویی جدید با امضای مستقل پزشک است.',
        clinical_tip_en: 'Aged Care Practice: Any dosage alteration on an NRMC chart requires a distinct cancellation and a newly signed prescriber entry.'
      }
    ]
  }
];
