export interface ScriptHotspot {
  id: string;
  title_fa: string;
  title_en: string;
  x_percent: number; // For touch/click positioning on the visual template
  y_percent: number;
  type: 'signature' | 'expiry' | 's8_rules' | 'odt_rules' | 'pbs_item' | 'patient_details' | 'brand_substitution' | 'general';
  summary_fa: string;
  summary_en: string;
  rules_fa: string[];
  rules_en: string[];
  validity_status?: 'VALID' | 'WARNING' | 'CRITICAL_CHECK';
}

export interface FilingWorkflow {
  pharmacy_archive_fa: {
    original_script: string;
    store_copy_label: string;
    retention_period: string;
    s8_safe_file?: string;
  };
  patient_handout_fa: {
    main_cal_label: string;
    repeat_form_pb24: string;
    escript_token_handling?: string;
  };
  duplicate_handling_fa: {
    if_repeats_exist: string;
    if_no_repeats_or_final: string;
  };
}

export interface AustralianScriptTypeData {
  id: string;
  code: string;
  title_fa: string;
  title_en: string;
  badge: string;
  badge_color: string; // Tailwind color classes
  short_summary_fa: string;
  short_summary_en: string;
  prescription_schedule: 'S4' | 'S8' | 'ODT' | 'MULTI_CHART';
  legal_expiry_months: number;
  filing_rules: FilingWorkflow;
  hotspots: ScriptHotspot[];
  mock_data: {
    patient_name: string;
    patient_dob: string;
    medication_line: string;
    prescriber_name: string;
    prescriber_provider_no: string;
    script_date: string;
    repeats: number;
    repeats_remaining: number;
    pbs_code: string;
  };
}

export const AUSTRALIAN_SCRIPT_TYPES_DATA: AustralianScriptTypeData[] = [
  // 1. کامپیوتری دوبَرگی PBS (Form PB 82)
  {
    id: 'pbs_computer_pb82',
    code: 'PB 82',
    title_fa: 'نسخه چاپی کامپیوتری دوبَرگی PBS (Form PB 82)',
    title_en: 'Standard Computerized PBS Prescription (Form PB 82)',
    badge: 'دوبخشی PBS',
    badge_color: 'bg-teal-700 text-teal-100 border-teal-500',
    short_summary_fa: 'متداول‌ترین فرمت کاغذی در مطب پزشکان استرالیا؛ شامل برگه اصلی Original Script و برگه کپی نازک Medicare Duplicate.',
    short_summary_en: 'Standard dual-part PBS script used by GPs across Australia, featuring the Original page and a thin Medicare Duplicate page.',
    prescription_schedule: 'S4',
    legal_expiry_months: 12,
    filing_rules: {
      pharmacy_archive_fa: {
        original_script: 'برگه اصلی (Original Script) در بایگانی داروخانه نگهداری می‌شود.',
        store_copy_label: 'برچسب ثبت سیستم (Store Copy / Audit Label) حتماً در پشت برگه اصلی چسبانده و بارکد آن اسکن می‌گردد.',
        retention_period: 'حداقل به مدت ۲ سال طبق الزامات قانونی PBS و AHPRA بایگانی فیزیکی می‌گردد.'
      },
      patient_handout_fa: {
        main_cal_label: 'برچسب اصلی دیسپنسینگ (Dispensing CAL Label) روی قوطی/جعبه دارو چسبانده می‌شود.',
        repeat_form_pb24: 'در صورت وجود تکرار، فرم زرد تکرار (Repeat Form PB 24) به برگه Duplicate منگنه شده و تحویل بیمار می‌گردد.'
      },
      duplicate_handling_fa: {
        if_repeats_exist: 'در داروخانه نمی‌ماند؛ به فرم زرد تکرار منگنه شده و جهت نوبت‌های بعدی به بیمار تحویل داده می‌شود.',
        if_no_repeats_or_final: 'در صورت عدم وجود تکرار یا تحویل نوبت آخر، همراه برگه اصلی در داروخانه بایگانی می‌شود.'
      }
    },
    mock_data: {
      patient_name: 'David Miller',
      patient_dob: '14/08/1982',
      medication_line: 'Rosuvastatin 10mg Tab (Qty: 30)',
      prescriber_name: 'Dr. Sarah Smith',
      prescriber_provider_no: '2938471A',
      script_date: '10/08/2026',
      repeats: 5,
      repeats_remaining: 5,
      pbs_code: '8214K'
    },
    hotspots: [
      {
        id: 'pb82_sig',
        title_fa: 'امضای معتبر پزشک (Wet-Ink Signature)',
        title_en: 'Prescriber Wet Ink Signature',
        x_percent: 75,
        y_percent: 85,
        type: 'signature',
        summary_fa: 'در نسخه‌های کاغذی PB 82، امضای فیزیکی و با جوهر زنده پزشک اجباری است.',
        summary_en: 'Physical live ink signature is strictly mandatory on paper PB 82 scripts.',
        rules_fa: [
          'امضای فتوکپی یا پرینت‌شده کامپیوتری کاملاً نامعتبر و فاقد ارزش قانونی است.',
          'شماره نظام پزشکی پزشک (Provider Number) باید واضح و معتبر باشد.'
        ],
        rules_en: [
          'Photocopied or computer-printed facsimile signatures are legally void.',
          'Prescriber Provider Number must be legible and currently valid.'
        ],
        validity_status: 'VALID'
      },
      {
        id: 'pb82_expiry',
        title_fa: 'اعتبار زمانی ۱۲ ماهه (S4 Expiry)',
        title_en: 'S4 Standard 12-Month Validity',
        x_percent: 25,
        y_percent: 15,
        type: 'expiry',
        summary_fa: 'داروهای استاندارد تجویزی Schedule 4 حداکثر ۱۲ ماه از تاریخ صدور اعتبار دارند.',
        summary_en: 'Standard Schedule 4 prescription medications remain legally valid for 12 months from the date of writing.',
        rules_fa: [
          'پس از گذشت ۱۲ ماه، دیسپنس نسخه و هرگونه تکرار باقیمانده غیرقانونی است.',
          'فاصله زمانی بین تکرارها (Repeat Interval) باید توسط داروساز رعایت شود.'
        ],
        rules_en: [
          'Dispensing any remaining repeat after 12 months from the original date is illegal.',
          'Pharmacist must respect PBS safety net repeat intervals.'
        ],
        validity_status: 'VALID'
      },
      {
        id: 'pb82_brand_sub',
        title_fa: 'جعبه عدم جایگزینی برند (Brand Substitution)',
        title_en: 'Brand Substitution Not Permitted Box',
        x_percent: 60,
        y_percent: 65,
        type: 'brand_substitution',
        summary_fa: 'اگر تیک نخورده باشد، داروساز مجاز است برند معادل ژنریک (a-flagged) را جایگزین کند.',
        summary_en: 'If unticked, the pharmacist may substitute bioequivalent generic brands (a-flagged).',
        rules_fa: [
          'پزشک باید خودش مربع Brand Substitution Not Permitted را خط بزند یا تیک بزند.',
          'در صورت عدم علامت‌گذاری، طبق استاندارد PBS پیشنهاد ژنریک به بیمار مجاز و تشویق‌شده است.'
        ],
        rules_en: [
          'The prescriber must manually cross/tick the substitution box if they forbid generics.',
          'PBS encouraging generic substitution applies if left blank.'
        ],
        validity_status: 'VALID'
      }
    ]
  },

  // ۲. نسخه تکرار زرد رسمی (Repeat Authorisation & Duplicate PB 24)
  {
    id: 'pbs_repeat_pb24',
    code: 'PB-24',
    title_fa: 'نسخه تکرار زرد (Repeat Form)',
    title_en: 'Repeat Authorisation & Duplicate',
    badge: 'فرم تکرار + کپی منگنه شده',
    badge_color: 'bg-amber-600 text-amber-100 border-amber-400',
    short_summary_fa: 'بسته تکرار کاغذی شامل فرم زرد رسمی PB 24 که با منگنه به برگه دوم نسخه پزشک (Medicare Duplicate) متصل شده است. در هر نوبت تکرار، فرم زرد قبلی بایگانی شده و فرم زرد جدید به همان برگه کپی منگنه می‌شود.',
    short_summary_en: 'Paper repeat packet comprising official Yellow Form PB 24 securely stapled to the original Medicare Duplicate Copy. On each repeat, the previous yellow form is archived and a newly printed yellow form is stapled to the duplicate.',
    prescription_schedule: 'S4',
    legal_expiry_months: 12,
    filing_rules: {
      pharmacy_archive_fa: {
        original_script: 'فرم زرد رنگ نوبت قبل (Previous PB 24) از برگه Duplicate جدا شده و در بایگانی داروخانه قرار می‌گیرد.',
        store_copy_label: 'برچسب ثبت سیستم (Store Copy) این نوبت، پشت همین برگه زرد نوبت قبل چسبانده شده و اسکن بارکد آن ثبت می‌گردد.',
        retention_period: 'حداقل به مدت ۲ سال همراه مدارک دیسپنسینگ داروخانه بایگانی فیزیکی می‌گردد.'
      },
      patient_handout_fa: {
        main_cal_label: 'برچسب دیسپنسینگ نوبت فعلی روی جعبه/قوطی دارو الصاق می‌گردد.',
        repeat_form_pb24: 'فرم زرد جدید پرینت‌شده توسط سیستم Fred، مجدداً به برگه Duplicate منگنه شده و برای نوبت‌های بعدی تحویل بیمار داده می‌شود.'
      },
      duplicate_handling_fa: {
        if_repeats_exist: 'برگه Duplicate به همراه فرم زرد جدید منگنه شده و تحویل بیمار می‌گردد.',
        if_no_repeats_or_final: 'در نوبت آخر (Final Repeat)، عبارت No Repeats Remaining چاپ شده و برگه Duplicate همراه آخرین برگه زرد در داروخانه بایگانی می‌شود.'
      }
    },
    mock_data: {
      patient_name: 'David Miller',
      patient_dob: '14/08/1982',
      medication_line: 'Rosuvastatin 10mg Tab (Qty: 30)',
      prescriber_name: 'Dr. Sarah Smith',
      prescriber_provider_no: '2938471A',
      script_date: '10/08/2026',
      repeats: 5,
      repeats_remaining: 4,
      pbs_code: '8214K'
    },
    hotspots: [
      {
        id: 'repeat_staple_connection',
        title_fa: 'ناحیه اتصال منگنه فیزیکی (Staple Connection)',
        title_en: 'Mandatory Staple to Duplicate Copy',
        x_percent: 15,
        y_percent: 12,
        type: 'general',
        summary_fa: 'الزام قانونی: فرم زرد تکرار هرگز نباید به تنهایی به بیمار تحویل داده شود؛ حتماً باید به برگه دوم نسخه پزشک (Duplicate Copy) منگنه شود.',
        summary_en: 'Legal mandate: Yellow Repeat Form PB 24 must NEVER be handed to the patient alone; it must always be firmly stapled to the original Medicare Duplicate Copy.',
        rules_fa: [
          'عدم وجود برگه Duplicate متصل به فرم زرد، نسخه را از نظر قانونی نامعتبر و غیرقابل دیسپنس می‌سازد.',
          'در هر نوبت، منگنه قبلی با احتیاط باز شده، فرم زرد قبلی بایگانی و فرم زرد جدید منگنه می‌شود.'
        ],
        rules_en: [
          'A yellow repeat form presented without its attached Duplicate Copy is legally invalid and cannot be dispensed.',
          'On each dispense, previous yellow form is detached for archiving and the new yellow form is re-stapled.'
        ],
        validity_status: 'VALID'
      },
      {
        id: 'repeat_barcode_scan',
        title_fa: 'ناحیه بارکد تکرار (Repeat Barcode)',
        title_en: 'Instant Repeat Scanning Barcode',
        x_percent: 50,
        y_percent: 38,
        type: 'general',
        summary_fa: 'با اسکن مستقیم این بارکد در نرم‌افزار دیسپنس، کل سوابق بیمار، دارو و تعداد تکرارهای باقیمانده فوراً بارگذاری می‌شود.',
        summary_en: 'Scanning this 1D/2D barcode directly inside Fred Dispense instantly loads patient details, drug, script number, and remaining repeats.',
        rules_fa: [
          'سرعت و دقت دیسپنسینگ را افزایش داده و از خطای انتخاب بیمار یا نسخه اشتباه جلوگیری می‌کند.',
          'شماره شناسایی یکتای فرم تکرار (Repeat Authorisation Number) را در شبکه ملی PBS استعلام می‌کند.'
        ],
        rules_en: [
          'Prevents data entry errors and verifies repeat entitlement online.',
          'Queries the unique Repeat Authorisation Number against PBS Online claiming.'
        ],
        validity_status: 'VALID'
      },
      {
        id: 'repeat_counts_remaining',
        title_fa: 'کادر تعداد تکرارهای باقیمانده (Repeats Remaining)',
        title_en: 'Repeats Remaining Counter',
        x_percent: 50,
        y_percent: 62,
        type: 'pbs_item',
        summary_fa: 'نمایش تعداد تکرارهای مجاز باقیمانده (مثلاً 4 of 5 Repeats Remaining). در نوبت آخر عبارت No Repeats Remaining چاپ می‌شود.',
        summary_en: 'Displays remaining authorized repeats (e.g. 4 of 5 Repeats Remaining). Upon final supply, "No Repeats Remaining" is printed and no new yellow form is issued.',
        rules_fa: [
          'در هر نوبت دیسپنسینگ، یک عدد از تکرارها کسر می‌گردد.',
          'در نوبت آخر (Final Supply)، برگه زرد جدیدی صادر نمی‌شود و کل پرونده نسخه بسته می‌شود.'
        ],
        rules_en: [
          'Counter decrements by 1 with each successive dispensing event.',
          'On final supply, no new repeat form is generated and the duplicate is permanently filed in pharmacy.'
        ],
        validity_status: 'VALID'
      },
      {
        id: 'repeat_prev_dispense_record',
        title_fa: 'سوابق نوبت قبل (Previous Dispensing Record)',
        title_en: 'Previous Supply & Pharmacy Audit Record',
        x_percent: 50,
        y_percent: 80,
        type: 'expiry',
        summary_fa: 'شامل نام و کد Section 90 داروخانه قبلی، تاریخ آخرین تحویل و شماره نسخه جهت بررسی فاصله مجاز تکرارها.',
        summary_en: 'Records previous dispensing date, Section 90 Approval Number of the supplying pharmacy, and original script number to audit repeat intervals.',
        rules_fa: [
          'داروساز باید تاریخ دیسپنس قبلی را بررسی کند تا قانون تحویل زودهنگام (Immediate / Early Supply) نقض نشود.',
          'کد تأییدیه داروخانه تحویل‌دهنده قبلی جهت استعلام بین‌داروخانه‌ای کاربرد دارد.'
        ],
        rules_en: [
          'Pharmacist must verify previous supply date to ensure Safety Net 20-day rule compliance.',
          'Shows Section 90 pharmacy code for inter-pharmacy auditing.'
        ],
        validity_status: 'VALID'
      },
      {
        id: 'repeat_store_copy_area',
        title_fa: 'پشت فرم زرد (Store Copy Area)',
        title_en: 'Store Copy Affixing Area (Back of Form)',
        x_percent: 85,
        y_percent: 85,
        type: 'general',
        summary_fa: 'برچسب ثبت سیستم (Store Copy) این نوبت، پشت همین برگه زرد نوبت قبل چسبانده شده و در بایگانی داروخانه قرار می‌گیرد.',
        summary_en: 'The system audit Store Copy label for this dispensing event is adhered to the back of the previous yellow form for 2-year pharmacy filing.',
        rules_fa: [
          'اثبات قانونی دیسپنس نوبت تکرار برای ممیزی بازرسان Medicare و PBS.',
          'حاوی اطلاعات امضای دریافت بیمار (Patient Declaration) در صورت لزوم.'
        ],
        rules_en: [
          'Auditable proof of repeat supply under PBS claiming legislation.',
          'Carries patient declaration confirmation if applicable.'
        ],
        validity_status: 'VALID'
      }
    ]
  },

  // ۳. نسخه دست‌نویس کاربنی پزشک (Handwritten Carbon Script)
  {
    id: 'handwritten_carbon_script',
    code: 'Handwritten PB',
    title_fa: 'نسخه دست‌نویس کاربنی پزشک (Handwritten Carbon Script)',
    title_en: 'Doctor Handwritten Carbon Prescription Pad',
    badge: 'دست‌نویس پد',
    badge_color: 'bg-amber-700 text-amber-100 border-amber-500',
    short_summary_fa: 'پدهای دستی کاربندار برای ویزیت در منزل، بیمارستان یا قطعی سیستم؛ نیاز به دقت مضاعف در خوانایی دوز و امضا دارد.',
    short_summary_en: 'Handwritten carbon prescription pad used during home visits or IT outages; requires rigorous verification of handwriting, strength, and prescriber credentials.',
    prescription_schedule: 'S4',
    legal_expiry_months: 12,
    filing_rules: {
      pharmacy_archive_fa: {
        original_script: 'برگ اول دست‌نویس پزشک در بایگانی داروخانه قرار می‌گیرد.',
        store_copy_label: 'برچسب Store Copy پشت نسخه اصلی دست‌نویس الصاق و تأیید امضا چک می‌شود.',
        retention_period: 'حداقل به مدت ۲ سال بایگانی فیزیکی می‌گردد.'
      },
      patient_handout_fa: {
        main_cal_label: 'لیبل داروسازی با دستور مصرف شفاف و تایپ‌شده روی بسته چسبانده می‌شود.',
        repeat_form_pb24: 'فرم زرد تکرار پرینت‌شده به برگه کاربنی زرد/صورتی Duplicate منگنه شده و به بیمار داده می‌شود.'
      },
      duplicate_handling_fa: {
        if_repeats_exist: 'برگه کپی کاربنی همراه فرم زرد تکرار منگنه شده و تحویل بیمار می‌گردد.',
        if_no_repeats_or_final: 'در داروخانه همراه نسخه اصلی دست‌نویس آرشیو می‌شود.'
      }
    },
    mock_data: {
      patient_name: 'Margaret Taylor',
      patient_dob: '05/11/1954',
      medication_line: 'Amoxicillin 500mg Cap (Qty: 20)',
      prescriber_name: 'Dr. James Wilson',
      prescriber_provider_no: '4019283B',
      script_date: '12/08/2026',
      repeats: 0,
      repeats_remaining: 0,
      pbs_code: '1892B'
    },
    hotspots: [
      {
        id: 'hw_handwriting_check',
        title_fa: 'خوانایی دوز و شکل دارویی دست‌نویس',
        title_en: 'Handwritten Strength & Formulation Legibility',
        x_percent: 45,
        y_percent: 50,
        type: 'general',
        summary_fa: 'دوز و فرم دارویی دست‌نویس باید کاملاً واضح و بدون خط‌خوردگی غیرمجاز باشد.',
        summary_en: 'Handwritten strength and form must be crystal clear without uninitialed alterations.',
        rules_fa: [
          'هرگونه خط‌خوردگی یا اصلاح در متن نسخه باید توسط خود پزشک پاراف (Initial) شده باشد.',
          'در صورت هرگونه ابهام در دستور مصرف (Directions) داروساز موظف به تماس تلفنی با مطب است.'
        ],
        rules_en: [
          'Any handwritten alteration must be countersigned/initialed by the prescriber.',
          'Pharmacist must contact prescriber if dosage or directions are ambiguous.'
        ],
        validity_status: 'VALID'
      },
      {
        id: 'hw_carbon_transfer',
        title_fa: 'وضوح برگه کپی کاربنی (Carbon Legibility)',
        title_en: 'Carbon Copy Clarity Check',
        x_percent: 30,
        y_percent: 70,
        type: 'patient_details',
        summary_fa: 'انتقال اثر کاربن به برگه دوم باید خوانا و بدون محوشدگی باشد.',
        summary_en: 'Carbon transfer to the duplicate copy must remain crisp and readable for verification.',
        rules_fa: [
          'نام کامل بیمار و تاریخ نگارش نسخه باید روی هر دو برگ کامپکت و خوانا باشد.'
        ],
        rules_en: [
          'Full patient details and date of issue must be completely legible across both layers.'
        ],
        validity_status: 'VALID'
      }
    ]
  },

  // ۳. نسخه توکن تمام‌الکترونیک (eScript Token)
  {
    id: 'escript_digital_token',
    code: 'eScript (Token/ASL)',
    title_fa: 'نسخه توکن تمام‌الکترونیک (eScript Token / ASL)',
    title_en: 'Electronic Prescription QR Token & Active Script List',
    badge: 'توکن eScript',
    badge_color: 'bg-emerald-700 text-emerald-100 border-emerald-500',
    short_summary_fa: 'نسخه کاملاً دیجیتال امن با بارکد QR در تلفن بیمار یا حساب متصل به سامانه دارویی Active Script List (ASL).',
    short_summary_en: 'Fully paperless, cryptographic QR token on patient phone or connected via the national Active Script List (ASL).',
    prescription_schedule: 'S4',
    legal_expiry_months: 12,
    filing_rules: {
      pharmacy_archive_fa: {
        original_script: 'هیچ کاغذ اصلی فیزیکی وجود ندارد؛ نسخه الکترونیک در سرور ملی PDS (Prescription Delivery Service) ذخیره می‌شود.',
        store_copy_label: 'سیستم Fred/Aquarius به صورت خودکار نسخه الکترونیکی را Claim و ثبت دیجیتال می‌کند.',
        retention_period: 'بایگانی تمام‌الکترونیک در سرورهای ابری امن داروسازی استرالیا به مدت قانونی نگهداری می‌شود.'
      },
      patient_handout_fa: {
        main_cal_label: 'لیبل دارویی روی قوطی/جعبه دارو الصاق می‌شود.',
        repeat_form_pb24: 'فرم کاغذی تکرار وجود ندارد؛ توکن جدید الکترونیکی به صورت خودکار پیامک/ایمیل شده یا در ASL ذخیره می‌گردد.',
        escript_token_handling: 'توکن بارکد مصرف‌شده باطل شده و یک توکن بارکد جدید دیجیتال با تکرارهای باقی‌مانده صادر می‌شود.'
      },
      duplicate_handling_fa: {
        if_repeats_exist: 'برگه کپی فیزیکی وجود ندارد؛ چرخه تکرار تماماً در شبکه eRx / MediSecure مدیریت می‌گردد.',
        if_no_repeats_or_final: 'توکن نهایی مصرف‌شده به وضعیت Fully Dispensed تغییر یافته و بسته می‌شود.'
      }
    },
    mock_data: {
      patient_name: 'David Miller',
      patient_dob: '14/08/1982',
      medication_line: 'Rosuvastatin 10mg Tab (Qty: 30)',
      prescriber_name: 'Dr. Sarah Smith',
      prescriber_provider_no: '2938471A',
      script_date: '15/08/2026',
      repeats: 5,
      repeats_remaining: 5,
      pbs_code: '8214K'
    },
    hotspots: [
      {
        id: 'escript_qr_hash',
        title_fa: 'امضای دیجیتال و بارکد رمزنگاری‌شده (Cryptographic Hash)',
        title_en: 'Digital Token Cryptographic Signature',
        x_percent: 50,
        y_percent: 45,
        type: 'signature',
        summary_fa: 'امضای الکترونیکی پزشک درون توکن و کلید امنیتی بارکد کدگذاری شده است.',
        summary_en: 'Prescriber digital signature is securely encrypted inside the eRx/MediSecure exchange token.',
        rules_fa: [
          'نیازی به امضای دستی روی کاغذ وجود ندارد؛ اسکن بارکد اصالت نسخه را از سامانه ملی تأیید می‌کند.',
          'هر توکن تنها یک‌بار قابلیت اسکن و دیسپنس دارد (Single-Use Token Security).'
        ],
        rules_en: [
          'No manual ink signature required; barcode scan validates authenticity from the National PDS.',
          'Each token is single-use and automatically locked upon dispensing.'
        ],
        validity_status: 'VALID'
      },
      {
        id: 'escript_asl_sync',
        title_fa: 'اتصال به سامانه جامع Active Script List (ASL)',
        title_en: 'Active Script List (ASL) Cloud Sync',
        x_percent: 50,
        y_percent: 20,
        type: 'general',
        summary_fa: 'بیمار بدون نیاز به همراه داشتن توکن می‌تواند با احراز هویت داروها را از لیست ASL تحویل بگیرد.',
        summary_en: 'Patients can authorize pharmacy access to their full Active Script List without showing individual SMS tokens.',
        rules_fa: [
          'احراز هویت بیمار با ۲ شناسه (نام + آدرس/تاریخ تولد) پیش از دانلود نسخه الزامی است.',
          'تکرارهای جدید به صورت آنی در پروفایل My Script List بیمار بروزرسانی می‌شوند.'
        ],
        rules_en: [
          'Patient must be verified with 2 identifiers before downloading from ASL.',
          'Subsequent repeat tokens automatically synchronize with the patient ASL profile.'
        ],
        validity_status: 'VALID'
      }
    ]
  },

  // ۴. نسخه داروی تحت کنترل شدید (NSW S8 Script)
  {
    id: 'nsw_s8_controlled_script',
    code: 'NSW S8 Script',
    title_fa: 'نسخه داروی تحت کنترل شدید (NSW S8 Script)',
    title_en: 'NSW Schedule 8 Controlled Drug Prescription',
    badge: 'نسخه زرد S8',
    badge_color: 'bg-rose-700 text-rose-100 border-rose-500',
    short_summary_fa: 'نسخه داروهای مخدری و آرام‌بخش‌های تحت کنترل؛ الزامات سخت‌گیرانه شامل تاریخ تولد، نگارش حروفی و عددی، و استعلام SafeScript.',
    short_summary_en: 'Controlled Drugs (Narcotics & Benzodiazepines) prescription subject to strict NSW Poisons Act rules: Figures & Words, mandatory DOB, and SafeScript real-time audit.',
    prescription_schedule: 'S8',
    legal_expiry_months: 6,
    filing_rules: {
      pharmacy_archive_fa: {
        original_script: 'نسخه اصلی کاغذی S8 در زونکن اختصاصی نسخه‌های S8 (S8 Script File) نگهداری می‌شود.',
        store_copy_label: 'برچسب ثبت سیستم پشت نسخه چسبانده شده و شماره صفحه دفتر ثبت مخدرات (S8 Drug Register) روی آن درج می‌شود.',
        retention_period: 'حداقل به مدت ۲ سال بایگانی قانونی در زونکن نسخه S8 نگهداری می‌گردد.'
      },
      patient_handout_fa: {
        main_cal_label: 'برچسب دارو با هشدارهای ویژه و برچسب‌های احتیاطی CAL 1, 1A الصاق می‌گردد.',
        repeat_form_pb24: 'در صورت داشتن تکرار مجاز، فرم زرد تکرار به برگه Duplicate منگنه می‌شود اما تحویل نوبت‌های بعد منوط به فاصله زمانی است.'
      },
      duplicate_handling_fa: {
        if_repeats_exist: 'برگه کپی به برگه زرد تکرار منگنه شده و تحویل بیمار می‌گردد؛ فواصل تکرار (Interval) در سیستم قفل می‌شود.',
        if_no_repeats_or_final: 'در زونکن بایگانی S8 همراه نسخه اصلی نگهداری می‌شود.'
      }
    },
    mock_data: {
      patient_name: 'Johnathan Edwards',
      patient_dob: '23/04/1979',
      medication_line: 'Oxycodone 20mg Prolonged Release Tab (Qty: Twenty 20)',
      prescriber_name: 'Dr. Robert Kelly',
      prescriber_provider_no: '5192847C',
      script_date: '02/08/2026',
      repeats: 2,
      repeats_remaining: 2,
      pbs_code: '8642P'
    },
    hotspots: [
      {
        id: 's8_figures_words',
        title_fa: 'نگارش تعداد و دوز به عدد و حروف (Figures and Words)',
        title_en: 'Quantity & Dose in Figures and Words',
        x_percent: 60,
        y_percent: 55,
        type: 's8_rules',
        summary_fa: 'قانون NSW Poisons Regulations: تعداد قرص و دوز داروی S8 باید حتماً هم به عدد و هم با حروف نوشته شود.',
        summary_en: 'NSW law requires total quantity and strength of S8 drugs to be stated in both figures and words to prevent forgery.',
        rules_fa: [
          'مثال معتبر: Twenty (20) Tablets یا Fifty (50) mL.',
          'در صورت عدم درج حروف، دیسپنس نسخه از نظر قانونی غیرمجاز و باطل است.'
        ],
        rules_en: [
          'Compliant example: Twenty (20) Tablets.',
          'If words are missing, dispensing is strictly illegal under NSW poisons legislation.'
        ],
        validity_status: 'VALID'
      },
      {
        id: 's8_strict_expiry',
        title_fa: 'اعتبار زمانی اکیداً ۶ ماهه (Strict 6 Months Expiry)',
        title_en: 'Strict 6-Month Expiry Rule for Schedule 8',
        x_percent: 25,
        y_percent: 15,
        type: 'expiry',
        summary_fa: 'برخلاف داروهای عادی S4 که ۱۲ ماه اعتبار دارند، نسخه‌های S8 دقیقاً و اکیداً ۶ ماه پس از تاریخ صدور باطل می‌شوند.',
        summary_en: 'Unlike standard S4 medications (12 months), S8 prescriptions legally expire strictly 6 months after the date of writing.',
        rules_fa: [
          'هیچ تکراری پس از انقضای ۶ ماهه نسخه قابل تحویل نیست.',
          'فاصله زمانی تحویل تکرارها (مثلاً هر ۱۴ روز) باید به طور دقیق رعایت شود.'
        ],
        rules_en: [
          'Repeats cannot be supplied beyond 6 months from the date of issue.',
          'Repeat intervals must be strictly enforced before each dispensing.'
        ],
        validity_status: 'VALID'
      },
      {
        id: 's8_rtpm_safescript',
        title_fa: 'استعلام اجباری سامانه پایش SafeScript NSW (RTPM)',
        title_en: 'Mandatory SafeScript NSW Real-Time Prescription Monitoring',
        x_percent: 80,
        y_percent: 20,
        type: 's8_rules',
        summary_fa: 'داروساز موظف است پیش از تحویل داروی S8، سوابق بیمار را در سامانه مانیتورینگ بلادرنگ استعلام کند.',
        summary_en: 'Pharmacists are legally required to review SafeScript NSW alerts prior to supplying any monitored S8 substance.',
        rules_fa: [
          'بررسی هشدارهای دوزهای همپوشان (Overlapping high-dose opioids) یا چندپزشکی (Doctor shopping).',
          'ثبت تراکنش در رجیستر رسمی داروخانه و ثبت در سرور پایش سلامت.'
        ],
        rules_en: [
          'Screen for high-risk alerts (multi-prescriber access, concurrent benzodiazepines).',
          'Log supply in the pharmacy official electronic register and RTPM portal.'
        ],
        validity_status: 'VALID'
      }
    ]
  },

  // ۵. فرم درمان وابستگی به اوپیوئید نیوساوث‌ولز (NSW ODT Form)
  {
    id: 'nsw_odt_program_form',
    code: 'NSW ODT Protocol',
    title_fa: 'فرم درمان وابستگی به اوپیوئید نیوساوث‌ولز (NSW ODT Form)',
    title_en: 'NSW Opioid Treatment Program (OTP) Methadone / Buprenorphine Form',
    badge: 'فرم NSW ODT',
    badge_color: 'bg-purple-700 text-purple-100 border-purple-500',
    short_summary_fa: 'پروتکل اختصاصی درمان جایگزین اپیوئید با متادون/بوپرنورفین؛ الزام نام داروخانه منتخب، دوز با حروف، و تفکیک دوز تحت نظارت از خانگی.',
    short_summary_en: 'NSW Health Opioid Treatment Program protocol for Methadone/Buprenorphine; requires Nominated Pharmacy, figures & words, and Supervised vs Takeaway separation.',
    prescription_schedule: 'ODT',
    legal_expiry_months: 6,
    filing_rules: {
      pharmacy_archive_fa: {
        original_script: 'فرم اصلی ODT در زونکن روزانه و پوشه کلینیکال OTP داروخانه نگهداری می‌شود.',
        store_copy_label: 'پس از پایان دوره درمان یا تکمیل جدول دوزها، در بایگانی ویژه برنامه ODT نگهداری می‌گردد.',
        retention_period: 'حداقل به مدت ۲ سال پس از تاریخ آخرین دوز نگهداری می‌شود.'
      },
      patient_handout_fa: {
        main_cal_label: 'دوزهای تحت نظارت (Supervised) در حضور داروساز مصرف می‌شود؛ دوزهای خانگی (Takeaway) با لیبل و تاریخ مصرف تحویل می‌گردد.',
        repeat_form_pb24: 'فاقد فرم زرد است؛ برنامه دوزینگ مستقیماً در جدول روزانه فرم پزشک ثبت و مدیریت می‌شود.'
      },
      duplicate_handling_fa: {
        if_repeats_exist: 'جدول دوز روزانه در داروخانه علامت‌گذاری و خط زده (Strikethrough) می‌شود.',
        if_no_repeats_or_final: 'پس از مصرف آخرین دوز، فرم باطل شده و در بایگانی OTP داروخانه بسته می‌شود.'
      }
    },
    mock_data: {
      patient_name: 'Alexander Reed',
      patient_dob: '19/02/1988',
      medication_line: 'Methadone Oral Liquid 5mg/mL (Daily Dose: Sixty 60mg)',
      prescriber_name: 'Dr. Alan Vance (OTP Accredited)',
      prescriber_provider_no: '8839201D',
      script_date: '01/08/2026',
      repeats: 0,
      repeats_remaining: 0,
      pbs_code: '2398M'
    },
    hotspots: [
      {
        id: 'odt_nominated_pharmacy',
        title_fa: 'نام‌بردن داروخانه منتخب (Nominated Pharmacy)',
        title_en: 'Strict Nominated Pharmacy Requirement',
        x_percent: 50,
        y_percent: 30,
        type: 'odt_rules',
        summary_fa: 'نسخه ODT فقط و فقط در داروخانه‌ای که نام آن در فرم قید شده قابل اجرا و تحویل است.',
        summary_en: 'An OTP prescription is strictly valid ONLY at the specific pharmacy specified in the prescriber form.',
        rules_fa: [
          'انتقال بیمار به داروخانه دیگر نیازمند تماس و تأییدیه کتبی تیم هماهنگی NSW OTP است.',
          'تحویل همزمان دوز از دو داروخانه اکیداً ممنوع و تخلف سنگین قانونی است.'
        ],
        rules_en: [
          'Transferring patients requires formal authorization from NSW OTP coordination unit.',
          'Dosing at multiple sites simultaneously is strictly prohibited.'
        ],
        validity_status: 'VALID'
      },
      {
        id: 'odt_supervised_vs_takeaway',
        title_fa: 'تفکیک دوز تحت‌نظارت از دوز خانگی (Supervised vs Takeaway)',
        title_en: 'Supervised vs Takeaway Dosing Matrix',
        x_percent: 50,
        y_percent: 65,
        type: 'odt_rules',
        summary_fa: 'روزهای مجاز برای دوز خانگی (Takeaway) باید دقیقاً توسط پزشک تعیین شده باشد.',
        summary_en: 'Takeaway days and takeaway limits must be explicitly specified by the accredited prescriber.',
        rules_fa: [
          'دوزهای روزانه عادی باید زیر نظارت مستقیم داروساز در اتاق مشاوره میل شوند.',
          'دوزهای خانگی باید در ظروف ایمن ضدکودک (Child-resistant bottles) با لیبل اختصاصی تحویل داده شوند.'
        ],
        rules_en: [
          'Supervised doses must be fully consumed under direct pharmacist visual observation.',
          'Takeaway doses must be packaged in child-resistant containers with customized warning labels.'
        ],
        validity_status: 'VALID'
      },
      {
        id: 'odt_missed_doses_rule',
        title_fa: 'قانون طلایی غیبت بیش از ۳ روز (Missed Doses > 3 Days)',
        title_en: 'Critical Clinical Rule: >3 Missed Doses Protocol',
        x_percent: 50,
        y_percent: 85,
        type: 'odt_rules',
        summary_fa: 'در صورت غیبت بیمار بیش از ۳ روز متوالی، به دلیل افت شدید تحمل دارویی، تحویل دوز بدون هماهنگی با پزشک ممنوع است.',
        summary_en: 'If a client misses >3 consecutive doses, tolerance drops significantly; do not dose without prescriber re-assessment.',
        rules_fa: [
          'خطر اوردوز کشنده در صورت از سرگیری ناگهانی دوز کامل متادون پس از ۳ روز غیبت.',
          'داروساز باید فوراً با پزشک معالج تماس گرفته و دوز تعدیل‌شده (Re-induction dose) دریافت نماید.'
        ],
        rules_en: [
          'High risk of fatal opioid overdose if full dose is resumed after lost tolerance.',
          'Pharmacist must contact OTP prescriber for dose step-down or re-titration plan.'
        ],
        validity_status: 'CRITICAL_CHECK'
      }
    ]
  },

  // ۶. چارت دارویی خانه سالمندان و وبسترپک (RACF / NRMC Chart)
  {
    id: 'racf_nrmc_medication_chart',
    code: 'RACF / NRMC Chart',
    title_fa: 'چارت دارویی خانه سالمندان و وبسترپک (RACF / NRMC Chart)',
    title_en: 'National Residential Medication Chart (NRMC / Webster-pak)',
    badge: 'چارت RACF',
    badge_color: 'bg-indigo-700 text-indigo-100 border-indigo-500',
    short_summary_fa: 'چارت چنددارویی استاندارد ملی برای سالمندان؛ امکان دیسپنس و بسته‌بندی در دوزیت و وبسترپک با اعتبار چندماهه.',
    short_summary_en: 'National Residential Medication Chart (NRMC) used for aged care facilities and multi-dose sachet/Webster-pak packing.',
    prescription_schedule: 'MULTI_CHART',
    legal_expiry_months: 6,
    filing_rules: {
      pharmacy_archive_fa: {
        original_script: 'چارت اصلی NRMC در مرکز نگهداری سالمندان (یا رونوشت معتبر در داروخانه تأمین‌کننده) نگهداری می‌شود.',
        store_copy_label: 'هر بار بسته‌بندی هفتگی وبسترپک در سیستم دیسپنسینگ ثبت و برچسب پکینگ اسکن می‌گردد.',
        retention_period: 'سوابق چارت و دیسپنسینگ به مدت ۲ سال بایگانی قانونی می‌گردد.'
      },
      patient_handout_fa: {
        main_cal_label: 'لیبل جامع هفتگی با تصویر و مشخصات قرص‌ها روی پشت شیت وبسترپک (Header Label) چسبانده می‌شود.',
        repeat_form_pb24: 'چارت NRMC به عنوان نسخه مادر عمل می‌کند و نیازی به صدور فرم‌های زرد مجزا برای هر تک‌دارو ندارد.'
      },
      duplicate_handling_fa: {
        if_repeats_exist: 'دیسپنسینگ طبق دوره اعتبار چارت (حداکثر تا ۶ ماه برای NRMC چارت استاندارد) ادامه می‌یابد.',
        if_no_repeats_or_final: 'پس از پایان دوره اعتبار چارت، پزشک موظف به بازبینی جامع و امضای چارت جدید است.'
      }
    },
    mock_data: {
      patient_name: 'Evelyn Bennett',
      patient_dob: '12/03/1938',
      medication_line: 'Multi-Dose Webster Profile (Amlodipine 5mg, Metformin 500mg, Atorvastatin 20mg)',
      prescriber_name: 'Dr. Gregory House',
      prescriber_provider_no: '9182374F',
      script_date: '01/07/2026',
      repeats: 12,
      repeats_remaining: 8,
      pbs_code: 'NRMC-MULTI'
    },
    hotspots: [
      {
        id: 'nrmc_prescriber_signature_per_item',
        title_fa: 'امضای مجزای پزشک برای هر ردیف دارویی',
        title_en: 'Individual Prescriber Signature per Medication Order',
        x_percent: 75,
        y_percent: 50,
        type: 'signature',
        summary_fa: 'در چارت NRMC، هر قلم دارو باید به تنهایی دارای امضا، تاریخ شروع و دوز مشخص پزشک باشد.',
        summary_en: 'Each medication line item on an NRMC chart must be individually signed and dated by the medical officer.',
        rules_fa: [
          'امضای کلی در پایین صفحه برای پوشش چند قلم دارویی نامعتبر است.',
          'هرگونه تغییر دوز نیازمند خط‌خوردگی، تاریخ و امضای مجدد ردیف توسط پزشک است.'
        ],
        rules_en: [
          'A single blanket signature at the bottom of the page is invalid for PBS reimbursement.',
          'Dose alterations require re-signing and dating that specific line item.'
        ],
        validity_status: 'VALID'
      },
      {
        id: 'nrmc_validity_period',
        title_fa: 'دوره اعتبار قانونی چارت NRMC (حداکثر ۶ ماه)',
        title_en: 'NRMC Chart 6-Month Validity Threshold',
        x_percent: 25,
        y_percent: 15,
        type: 'expiry',
        summary_fa: 'چارت‌های NRMC در خانه‌های سالمندان حداکثر برای مدت ۶ ماه دارای اعتبار دیسپنسینگ پیوسته هستند.',
        summary_en: 'Standard National Residential Medication Charts are legally valid for active dispensing for up to 6 months.',
        rules_fa: [
          'پس از ۶ ماه، چارت منقضی شده و داروساز مجاز به ادامه بسته‌بندی وبسترپک نیست تا چارت جدید صادر گردد.'
        ],
        rules_en: [
          'After 6 months, a complete medication chart review and new chart issue is required.'
        ],
        validity_status: 'VALID'
      }
    ]
  }
];
