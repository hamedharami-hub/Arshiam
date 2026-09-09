import {
  initFirebase,
  signInWithGoogle,
  signOutUser,
  loadStudyState,
  saveStudyState
} from './firebase-service.js';

const TOPICS = {
  EDU: ['🎓', 'آموزش', 'Education'], TEC: ['⌘', 'فناوری', 'Technology'], ENV: ['♧', 'محیط‌زیست', 'Environment'], HEA: ['♡', 'سلامت', 'Health'], SOC: ['◌', 'جامعه', 'Society'], WOR: ['▣', 'کار', 'Work'], GOV: ['⌂', 'دولت', 'Government'], CUL: ['◒', 'فرهنگ', 'Culture'], URB: ['⌁', 'شهر و حمل‌ونقل', 'Urban'], SCI: ['✧', 'علم', 'Science'], XOV: ['◎', 'موضوعات ترکیبی', 'Cross-topic'],
};
const SUB = {
  EDU: { 'EDU-01': 'هدف آموزش', 'EDU-02': 'روش تدریس و یادگیری', 'EDU-03': 'امتحان و استاندارد', 'EDU-04': 'برنامه درسی و مهارت', 'EDU-05': 'دانشگاه و شغل', 'EDU-06': 'دسترسی و بودجه', 'EDU-07': 'تأثیر بر یادگیری' }, TEC: { 'TEC-01': 'وابستگی روزمره', 'TEC-02': 'ارتباط و روابط', 'TEC-03': 'هوش مصنوعی و اخلاق', 'TEC-04': 'خدمات دیجیتال', 'TEC-05': 'نوآوری و جامعه' }, ENV: { 'ENV-01': 'تغییرات اقلیمی', 'ENV-02': 'آلودگی و انرژی', 'ENV-03': 'حفاظت و حیات‌وحش', 'ENV-04': 'توسعه پایدار', 'ENV-05': 'شهر و روستا' }, HEA: { 'HEA-01': 'رفتار سالم', 'HEA-02': 'سلامت روان', 'HEA-03': 'عدالت درمانی', 'HEA-04': 'علم پزشکی' }, SOC: { 'SOC-01': 'خانواده و تربیت', 'SOC-02': 'موفقیت و خوشبختی', 'SOC-03': 'کار و کیفیت زندگی', 'SOC-04': 'رفتار و ارزش‌ها', 'SOC-05': 'تنوع و مهاجرت' }, WOR: { 'WOR-01': 'انتخاب شغل', 'WOR-02': 'محیط کار', 'WOR-03': 'مصرف و بازار', 'WOR-04': 'سرمایه‌گذاری عمومی' }, GOV: { 'GOV-01': 'قانون و مسئولیت', 'GOV-02': 'جرم و بازپروری', 'GOV-03': 'زیرساخت عمومی', 'GOV-04': 'اولویت‌های دولت' }, CUL: { 'CUL-01': 'رسانه و تلویزیون', 'CUL-02': 'هنر و تاریخ', 'CUL-03': 'زبان و هویت', 'CUL-04': 'گردشگری' }, URB: { 'URB-01': 'جابجایی', 'URB-02': 'مسکن و محله', 'URB-03': 'رشد شهری' }, SCI: { 'SCI-01': 'اولویت پژوهش', 'SCI-02': 'پیشرفت و اخلاق' }, XOV: { 'XOV-01': 'رقابت و همکاری', 'XOV-02': 'انتخاب فردی و وظیفه', 'XOV-03': 'سنت و تغییر' },
};
const ROLE = { benefit:'مزیت', drawback:'نکته منفی', effect:'پیامد', solution:'راهکار', balanced_solution:'راهکار متعادل', qualification:'محدودیت', reason:'دلیل', evaluation:'ارزیابی', mechanism:'سازوکار', counterargument:'مخالفت', rebuttal:'پاسخ به مخالفت', thesis:'موضع', example:'مثال', consequence:'پیامد', synthesis:'جمع‌بندی', problem_framing:'صورت‌بندی مسئله', prevention:'پیشگیری', cause:'علت', conclusion:'نتیجه‌گیری', 'cause/effect':'علت و پیامد', balanced_evaluation:'ارزیابی متعادل', balanced_effect:'پیامد متعادل', balanced_conclusion:'جمع‌بندی متعادل' };
const ARCHETYPE = { 'ARC-ACCESS':'دسترسی', 'ARC-CAUSE':'علت', 'ARC-CHANGE':'تغییر', 'ARC-COOP':'همکاری', 'ARC-EQUITY':'عدالت', 'ARC-FREEDOM':'انتخاب فردی', 'ARC-FUNDING':'بودجه', 'ARC-IMPLEMENT':'اجرا', 'ARC-INNOVATION':'نوآوری', 'ARC-LEVELS':'سطح‌بندی', 'ARC-PREVENT':'پیشگیری', 'ARC-REG':'قانون‌گذاری', 'ARC-RESP':'مسئولیت', 'ARC-SUPPORT':'حمایت', 'ARC-TIME':'بلندمدت', 'ARC-TRADEOFF':'تعادلِ سود و زیان' };
const QUESTION_FIT = {
  AGREE: 'موافق / مخالف (Agree/Disagree)',
  DISCUSS: 'بحث درباره دو دیدگاه (Discuss both views)',
  ADVDIS: 'مزایا و معایب (Advantages/Disadvantages)',
  POSNEG: 'تحول مثبت یا منفی (Positive/Negative)',
  PROBSOL: 'مشکل و راهکار (Problem/Solution)',
  DIRECT: 'سؤال مستقیم (Direct Question)'
};
const SLOT = {
  SERVICE_OR_OPPORTUNITY: 'خدمت یا فرصت',
  POLICY_OR_DEVELOPMENT: 'سیاست یا تغییر',
  TARGET_GROUP: 'گروه هدف',
  BARRIER: 'مانع',
  RESOURCE: 'منبع',
  BARRIER_1: 'مانع اول',
  BARRIER_2: 'مانع دوم',
  BARRIER_3: 'مانع سوم',
  APPROACH: 'رویکرد مفرد',
  APPROACH_PLURAL: 'رویکرد جمع',
  APPROACH_OR_PLURAL: 'رویکرد یا سیاست',
  SHORT_TERM_BENEFIT: 'فایده کوتاه‌مدت',
  OUTCOME: 'پیامد هدف',
  OUTCOME_1: 'پیامد اول',
  OUTCOME_2: 'پیامد دوم',
  MECHANISM: 'سازوکار یا دلیل',
  PRACTICAL_RESULT: 'نتیجهٔ عملی',
  POSITIVE_ELEMENT: 'عنصر مفید',
  PREDICTABLE_RISK: 'ریسک قابل پیش‌بینی',
  CLEAR_STANDARD: 'استاندارد یا قانون',
  PRACTICAL_SUPPORT: 'حمایت عملی',
  REALISTIC_ALTERNATIVE: 'جایگزین واقعی',
  COUNTERARGUMENT: 'نگرانی یا مخالفت',
  SAFEGUARD_OR_POLICY: 'راه‌حل محافظتی',
  SYSTEM_OR_APPROACH: 'سیستم یا روش',
  HUMAN_SKILL_OR_ALTERNATIVE_SYSTEM: 'مهارت یا جایگزین',
  AFFECTED_GROUP: 'گروه درگیر',
  SPECIFIC_MEASURE: 'اقدام مشخص',
  IMMEDIATE_EFFECT: 'اثر فوری',
  BROADER_CONSEQUENCE: 'پیامد بزرگ‌تر',
  MANAGEABLE_CHANGE: 'تغییر قابل مدیریت',
  BENEFIT: 'منفعت یا مزیت',
  RISK: 'ریسک یا خطر',
  PROBLEM: 'مسئله یا معضل',
  SECONDARY_HARM: 'آسیب یا پیامد ثانویه',
  ACTOR_1: 'نهاد اول (دولت / قانون‌گذار)',
  ACTOR_2: 'نهاد دوم (بخش خصوصی / کارفرما)',
  ACTOR_3: 'نهاد سوم (شهروندان / خانواده)',
  CHOICE_OR_FLEXIBILITY: 'حق انتخاب یا انعطاف',
  INFORMATION: 'اطلاعات و شفافیت',
  TRAINING: 'آموزش لازم',
  SUPPORT: 'حمایت و زیرساخت',
  OPTION_A: 'گزینه یا اولویت اول',
  OPTION_B: 'گزینه یا اولویت دوم',
  DECISION_MAKER: 'تصمیم‌گیرنده یا سیاست‌گذار',
  ISSUE_OR_DEVELOPMENT: 'پدیده یا تحول',
  DIRECTLY_AFFECTED_GROUP: 'گروه تحت تأثیر مستقیم',
  BROADER_OUTCOME_1: 'پیامد اجتماعی اول',
  BROADER_OUTCOME_2: 'پیامد اجتماعی دوم',
  RULES_OR_SAFEGUARDS: 'قوانین و تدابیر حفاظتی',
  LEGITIMATE_ACTIVITY_OR_BENEFIT: 'فعالیت مشروع یا مزیت اصلی',
  GROUPS_OR_COMMUNITIES: 'گروه‌ها یا جوامع مختلف',
  RELEVANT_CIRCUMSTANCE: 'شرایط و نیازهای ویژه',
  INFORMATION_OR_TRAINING: 'اطلاع‌رسانی یا آموزش',
  CHANGE: 'تغییر و دگرگونی',
  POLICY_OR_PROPOSAL: 'سیاست یا طرح پیشنهادی',
  SAFEGUARD: 'سپر یا تدبیر حمایتی'
};
const ENGINE_GUIDE = {
  M01:['دسترسی ← سیاست ← گروهِ دارای مانع','وقتی می‌خواهی یک مزیت عادلانه و مشخص را توضیح بدهی.'],
  M02:['تغییر ← مانع‌های دسترسی ← نابرابری','برای آوردن هشدار متعادل دربارهٔ شکاف طبقاتی یا جغرافیایی.'],
  M03:['فایدهٔ فوری ↔ دو پیامد بلندمدت','برای نقد یا ارزیابی یک سیاست؛ نه برای نتیجه‌گیری نهایی.'],
  M04:['فایده ← تعادل ← ریسک قابل‌کنترل','وقتی موضع تو «بله، اما با کنترل» است.'],
  M05:['تغییر اجتناب‌پذیر ← مدیریت ← سود/زیان','برای موضوعاتی که حذف کاملشان واقع‌بینانه نیست، مثل AI یا گردشگری.'],
  M06:['مشکل ← کاهش ← جلوگیری از آسیب دوم','برای Problem–Solution و سیاست‌های حساس به عدالت.'],
  M07:['سه بازیگر ← اقدام هماهنگ ← حل مسئله','وقتی هیچ فرد یا نهادِ واحدی به‌تنهایی کافی نیست.'],
  M08:['قانون + حمایت + جایگزین واقعی','برای نشان‌دادن راهکار عملی، نه صرفاً «دولت باید».'],
  M09:['پیشگیری زودهنگام ← هزینه/رنج کمتر','برای سلامت، جرم، محیط‌زیست و اطلاعات نادرست.'],
  M10:['آزادی انتخاب + اطلاعات + آموزش + حمایت','برای نقدِ انتخابی که بدون توانمندسازی واقعی است.'],
  M11:['دوگانهٔ ظاهری ← ادغام دو اولویت','وقتی سؤال دو ارزش را مقابل هم قرار می‌دهد.'],
  M12:['نگرانی مخالفان ← محافظت عملی ← پاسخ','یک counterargument کوتاه؛ باید واقعاً به همان نگرانی جواب دهد.'],
  M13:['اثر مستقیم ← دو اثر اجتماعی بلندمدت','برای گسترش ایده از فرد به جامعه.'],
  M14:['قانونِ دقیق ← حفاظت ← حفظِ فعالیت مشروع','برای دفاع از regulation بدون موضع افراطی.'],
  M15:['گروه‌های متفاوت ← نیاز متفاوت ← نسخهٔ منعطف','برای رد راه‌حل یکسان برای همه.'],
  M16:['حمایت/آموزش ← سازگاری ← کاهش ریسک','برای توضیح اینکه چرا اجرای سیاست نیاز به حمایت دارد.'],
  M17:['وابستگی زیاد ← تضعیف جایگزین ← آسیب‌پذیری','برای یک drawback روشن، مخصوصاً فناوری یا حمل‌ونقل.'],
  M18:['اثر فوری ↔ نتیجهٔ بلندمدت','برای جملهٔ ارزیابی یا جمع‌بندیِ بدون ادعای مطلق.'],
  M19:['اقدام مشخص ← اثر فوری ← پیامد بزرگ‌تر','برای مثالِ واقعی؛ قبلش باید ادعای اصلی را گفته باشی.'],
  M20:['موضع مثبتِ مشروط ← safeguard + support','فقط وقتی موضع نهایی تو مثبت یا qualified است.'],
  M21:['اقدام ← پیامد ← چون‌که سازوکار ← نتیجهٔ عملی','بهترین موتور برای توسعهٔ یک دلیل با توضیح و جزئیات مشخص.']
};
const STORAGE = { stars: 'pte-stars', flags: 'pte-flags', review: 'pte-review-status' };
let cloudSyncTimer = null;
let activeFirebaseUser = null;

function setCloudSyncStatus(status) {
  const el = $('syncStatus');
  if (el) el.textContent = status;
}

function triggerCloudSync() {
  if (!activeFirebaseUser) return;
  clearTimeout(cloudSyncTimer);
  setCloudSyncStatus('در حال ذخیره…');
  cloudSyncTimer = setTimeout(async () => {
    try {
      await saveStudyState(activeFirebaseUser.uid, {
        starred: state.stars,
        flagged: state.flags,
        review: state.review
      });
      setCloudSyncStatus('همگام با ابر ✓');
    } catch (err) {
      console.error('Cloud sync error:', err);
      setCloudSyncStatus('خطای همگام‌سازی');
    }
  }, 600);
}
const state = {
  cards: [], byId: new Map(), variants: [], variantById: new Map(), engines: [], engineById: new Map(),
  scenarios: {}, subIndex: new Map(), topic: 'EDU', subtopic: '', view: 'engines', p1Only: false,
  query: '', stars: new Set(), flags: new Set(), activeEngine: 'M01', activeSlot: null, engineSlots: {},
  engineGuideOpen: false, engineVariantsOpen: false, practiceSource: 'flags', practiceIndex: 0, practiceRevealed: false, review: {}
};
const $ = id => document.getElementById(id);
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}
if (typeof window !== 'undefined') {
  window.escapeHtml = escapeHtml;
}
const readIds = key => { try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return new Set(Array.isArray(v) ? v.filter(x => typeof x === 'string') : []); } catch { return new Set(); } };
function saveSet(name) {
  localStorage.setItem(STORAGE[name], JSON.stringify([...state[name]]));
  triggerCloudSync();
}
function readReview() { try { const v = JSON.parse(localStorage.getItem(STORAGE.review) || '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch { return {}; } }
function saveReview() {
  localStorage.setItem(STORAGE.review, JSON.stringify(state.review));
  triggerCloudSync();
}
function announce(message) {
  const el = $('status');
  if (!el) return;
  el.textContent = message;
  clearTimeout(announce.timer);
  announce.timer = setTimeout(() => { el.textContent = ''; }, 2400);
}
function toggle(name, id) {
  const set = state[name];
  set.has(id) ? set.delete(id) : set.add(id);
  saveSet(name);
  render();
  announce(name === 'stars' ? (set.has(id) ? 'به منتخب‌ها اضافه شد ★' : 'از منتخب‌ها حذف شد') : (set.has(id) ? 'برای مرور حفظی علامت خورد ⚑' : 'علامت مرور حذف شد'));
}
function label(code) { const main = code.slice(0, 3); return SUB[main]?.[code] || TOPICS[main]?.[1] || code; }
function engineLabel(engine) { return engine ? `${engine.id} · ${engine.name_fa}` : ''; }
function addSub(code, id) { if (!SUB[code.slice(0, 3)]?.[code] || !state.byId.has(id)) return; if (!state.subIndex.has(code)) state.subIndex.set(code, new Set()); state.subIndex.get(code).add(id); }
function makeIndex(questions, recommendations) {
  state.cards.forEach(card => card.topic_links.forEach(code => addSub(code, card.id)));
  const qById = new Map(questions.map(q => [q.id, q]));
  recommendations.forEach(group => {
    const q = qById.get(group.question_id);
    if (!q) return;
    group.recommended_sentence_ids.forEach(item => (item.shared_topics?.length ? item.shared_topics : [q.primary_topic]).forEach(code => addSub(code, item.card_id)));
  });
}
function topicCards() { return state.cards.filter(card => card.topic_links.some(code => code.slice(0, 3) === state.topic)); }

async function copyToClipboard(text, btn) {
  if (!text) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.append(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    if (btn) {
      const originalText = btn.innerHTML;
      btn.innerHTML = 'کپی شد ✓';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.remove('copied');
      }, 1800);
    }
    announce('جمله در کلیپ‌بورد کپی شد');
  } catch (e) {
    console.error('Clipboard copy failed:', e);
    announce('امکان کپی خودکار فراهم نشد');
  }
}

function formatRichHtml(text) {
  if (!text) return '';
  let safe = escapeHtml(text);
  safe = safe.replace(/(\*\*|__)(.+?)\1/g, '<strong class="rich-bold">$2</strong>');
  safe = safe.replace(/(\*|_)(.+?)\1/g, '<em class="rich-em">$2</em>');
  safe = safe.replace(/`([^`]+)`/g, '<code class="rich-code" dir="ltr">$1</code>');
  safe = safe.replace(/(?<=^|[\s(«"'])([A-Za-z0-9_.\-+/]{2,})(?=[\s)»"':,.!?]|$)/g, '<bdi dir="ltr" class="inline-en">$1</bdi>');
  return safe;
}

function speakSentence(text, btn) {
  if (!text) return;
  if (!('speechSynthesis' in window)) {
    announce('پخش صوتی در این مرورگر پشتیبانی نمی‌شود');
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const clean = text.replace(/\[.*?\]/g, '').replace(/[*_`]/g, '').trim();
    if (!clean) return;
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'en-US';
    utterance.rate = 0.92;
    if (btn) btn.classList.add('playing');
    const reset = () => { if (btn) btn.classList.remove('playing'); };
    utterance.onend = reset;
    utterance.onerror = reset;
    window.speechSynthesis.speak(utterance);
    announce('درحال پخش تلفظ صوتی... 🔊');
  } catch (err) {
    console.error('Speech synthesis error:', err);
    if (btn) btn.classList.remove('playing');
  }
}

function showSelectedTerms(node, sentence, selectedValues) {
  node.replaceChildren();
  if (!sentence) return;

  const values = [...new Set((selectedValues || []).filter(v => typeof v === 'string' && v.trim()))]
    .sort((a, b) => b.length - a.length);

  // Match markdown tokens: **bold**, __bold__, `code`, *italic*, _italic_
  const mdRegex = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|(?<!\w)_[^_]+_(?!\w))/g;

  function appendSubParts(parent, text, wrapTag, wrapClass) {
    if (!values.length || !text) {
      if (wrapTag) {
        const el = document.createElement(wrapTag);
        if (wrapClass) el.className = wrapClass;
        el.textContent = text;
        parent.append(el);
      } else {
        parent.append(document.createTextNode(text));
      }
      return;
    }

    const escaped = values.map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const valRegex = new RegExp(`(${escaped.join('|')})`, 'gi');
    const parts = text.split(valRegex).filter(Boolean);

    parts.forEach(p => {
      const isVal = values.some(v => v.toLowerCase() === p.toLowerCase());
      let wrapperEl = null;

      if (wrapTag) {
        wrapperEl = document.createElement(wrapTag);
        if (wrapClass) wrapperEl.className = wrapClass;
      }

      if (isVal) {
        const mark = document.createElement('mark');
        mark.className = 'sentence-selection';
        mark.textContent = p;
        if (wrapperEl) {
          wrapperEl.append(mark);
          parent.append(wrapperEl);
        } else {
          parent.append(mark);
        }
      } else {
        if (wrapperEl) {
          wrapperEl.textContent = p;
          parent.append(wrapperEl);
        } else {
          parent.append(document.createTextNode(p));
        }
      }
    });
  }

  let lastIndex = 0;
  let match;
  while ((match = mdRegex.exec(sentence)) !== null) {
    if (match.index > lastIndex) {
      appendSubParts(node, sentence.slice(lastIndex, match.index), null, null);
    }
    const raw = match[0];
    if ((raw.startsWith('**') && raw.endsWith('**')) || (raw.startsWith('__') && raw.endsWith('__'))) {
      appendSubParts(node, raw.slice(2, -2), 'strong', 'sentence-bold');
    } else if (raw.startsWith('`') && raw.endsWith('`')) {
      appendSubParts(node, raw.slice(1, -1), 'code', 'sentence-code');
    } else if ((raw.startsWith('*') && raw.endsWith('*')) || (raw.startsWith('_') && raw.endsWith('_'))) {
      appendSubParts(node, raw.slice(1, -1), 'em', 'sentence-em');
    }
    lastIndex = match.index + raw.length;
  }
  if (lastIndex < sentence.length) {
    appendSubParts(node, sentence.slice(lastIndex), null, null);
  }
}

function renderTopics() {
  const root = $('topics');
  root.replaceChildren();
  Object.entries(TOPICS).forEach(([code, [icon, fa, en]]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `topic ${state.topic === code ? 'active' : ''}`;
    b.innerHTML = `<span>${icon}</span><b>${fa}</b><small dir="ltr">${en}</small>`;
    b.addEventListener('click', () => {
      state.topic = code;
      state.subtopic = '';
      render();
    });
    root.append(b);
  });
  const subRoot = $('subtopics');
  subRoot.replaceChildren();
  [['', 'همهٔ زیرموضوع‌ها'], ...Object.entries(SUB[state.topic])].forEach(([code, name]) => {
    const count = code ? state.subIndex.get(code)?.size || 0 : topicCards().length;
    if (code && !count) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `sub ${state.subtopic === code ? 'active' : ''}`;
    b.textContent = `${name} (${count.toLocaleString('fa-IR')})`;
    b.addEventListener('click', () => {
      state.subtopic = code;
      state.p1Only = false;
      render();
    });
    subRoot.append(b);
  });
}

function sourceResults() {
  let list = state.subtopic ? [...(state.subIndex.get(state.subtopic) || [])].map(id => state.byId.get(id)).filter(Boolean) : topicCards();
  if (state.query) {
    const q = state.query.toLowerCase();
    list = list.filter(card => {
      const textMatch = card.text.toLowerCase().includes(q);
      const roleMatch = (ROLE[card.essay_role] || '').toLowerCase().includes(q) || (card.essay_role || '').toLowerCase().includes(q);
      const topicMatch = card.topic_links.some(t => label(t).toLowerCase().includes(q));
      return textMatch || roleMatch || topicMatch;
    });
  }
  if (state.p1Only) list = list.filter(card => card.memorisation_priority === 'P1');
  return list.sort((a, b) => a.memorisation_priority.localeCompare(b.memorisation_priority) || b.reuse_score - a.reuse_score);
}

function actionButtons(id, textToCopy) {
  const starred = state.stars.has(id), flagged = state.flags.has(id);
  const wrap = document.createElement('div');
  wrap.className = 'actions';
  wrap.innerHTML = `
    <button type="button" class="round tts-action" aria-label="پخش صوتی تلفظ" title="پخش صوتی تلفظ">🔊</button>
    <button type="button" class="round star ${starred ? 'active' : ''}" aria-label="${starred ? 'حذف از منتخب‌ها' : 'افزودن به منتخب‌ها'}" title="${starred ? 'حذف از منتخب‌ها' : 'افزودن به منتخب‌ها'}">${starred ? '★' : '☆'}</button>
    <button type="button" class="round flag ${flagged ? 'active' : ''}" aria-label="${flagged ? 'حذف علامت مرور' : 'علامت‌گذاری برای مرور'}" title="${flagged ? 'حذف علامت مرور' : 'علامت‌گذاری برای مرور'}">${flagged ? '⚑' : '⚐'}</button>
    <button type="button" class="round copy-action" aria-label="کپی جمله" title="کپی جمله">⎘</button>
  `;
  const ttsBtn = wrap.querySelector('.tts-action');
  ttsBtn.addEventListener('click', () => speakSentence(textToCopy, ttsBtn));
  wrap.querySelector('.star').addEventListener('click', () => toggle('stars', id));
  wrap.querySelector('.flag').addEventListener('click', () => toggle('flags', id));
  wrap.querySelector('.copy-action').addEventListener('click', e => copyToClipboard(textToCopy, e.currentTarget));
  return wrap;
}

function renderSource(card) {
  const article = document.createElement('article');
  article.className = 'card';
  const body = document.createElement('div');
  body.className = 'card-body';
  body.innerHTML = `
    <p class="sentence" dir="ltr"></p>
    <div class="meta">
      <span class="pill priority ${card.memorisation_priority.toLowerCase()}" dir="ltr">${card.memorisation_priority}</span>
      <span class="pill role">${ROLE[card.essay_role] || card.essay_role}</span>
      ${[...new Set(card.topic_links.map(label))].slice(0, 3).map(x => `<span class="pill">${x}</span>`).join('')}
      <button type="button" class="card-copy-btn">کپی جمله</button>
    </div>
  `;
  showSelectedTerms(body.querySelector('.sentence'), card.text, state.query ? [state.query] : []);
  body.querySelector('.card-copy-btn').addEventListener('click', e => copyToClipboard(card.text, e.currentTarget));
  article.append(actionButtons(card.id, card.text), body);
  return article;
}

function variantTopics(variant) { return [...new Set(variant.scenario_packs.flatMap(id => state.scenarios[id]?.topics || []))].map(label); }
function slotValue(variant, slot) { return slot === 'APPROACH_OR_PLURAL' ? (variant.slots.APPROACH || variant.slots.APPROACH_PLURAL) : variant.slots[slot]; }
function currentVariants() { return state.variants.filter(v => v.engine_id === state.activeEngine).filter(v => Object.entries(state.engineSlots).every(([key, value]) => slotValue(v, key) === value)); }
function variantsForSlot(slot) { return state.variants.filter(v => v.engine_id === state.activeEngine).filter(v => Object.entries(state.engineSlots).every(([key, value]) => key === slot || slotValue(v, key) === value)); }
function engineSlotKeys() {
  const engine = state.engineById.get(state.activeEngine);
  if (engine?.id === 'M03') return ['APPROACH_OR_PLURAL', 'SHORT_TERM_BENEFIT', 'OUTCOME_1', 'OUTCOME_2'];
  const keys = new Set(engine?.slots || []);
  state.variants.filter(v => v.engine_id === state.activeEngine).forEach(v => Object.keys(v.slots).forEach(k => keys.add(k)));
  return [...keys];
}
function saved(name) { return [...state[name]].map(id => state.variantById.get(id) || state.byId.get(id)).filter(Boolean); }

function renderCards() {
  let items;
  if (state.view === 'engines') items = currentVariants();
  else if (state.view === 'topics') items = sourceResults();
  else items = saved(state.view === 'starred' ? 'stars' : 'flags');

  const root = $('cards');
  root.replaceChildren();
  const frag = document.createDocumentFragment();
  items.forEach(item => frag.append(item.variant_id ? renderVariant(item, state.view === 'engines') : renderSource(item)));
  root.append(frag);

  $('resultCount').textContent = state.view === 'engines' ? `${items.length.toLocaleString('fa-IR')} نسخهٔ تأییدشده` : `${items.length.toLocaleString('fa-IR')} جمله`;
  $('empty').hidden = items.length > 0;
  $('empty').textContent = state.view === 'engines' ? 'برای این ترکیب نسخهٔ تأییدشده‌ای وجود ندارد. با دکمهٔ «پاک‌کردن انتخاب‌ها» همه گزینه‌ها را بازگردان.' : state.view === 'starred' ? 'هنوز موردی را ستاره‌دار نکرده‌ای. از علامت ستاره کنار جمله‌ها استفاده کن.' : state.view === 'flagged' ? 'هنوز موردی را برای مرور حفظی علامت نزده‌ای. از علامت پرچم کنار جمله‌ها استفاده کن.' : 'برای این بخش جمله‌ای ثبت نشده است.';
}

function getEngineCompletedSentence(engine, slots) {
  const matches = state.variants.filter(v => v.engine_id === engine.id);
  const exact = matches.find(v => Object.keys(v.slots).every(k => (v.slots[k] || '') === (slots[k] || '')));
  if (exact) return { text: exact.completed_sentence, variant: exact, isComplete: true };

  const selectedApproach = slots.APPROACH_OR_PLURAL;
  const usePlural = Boolean(engine.plural_template && selectedApproach && state.variants.some(variant => variant.engine_id === engine.id && variant.slots.APPROACH_PLURAL === selectedApproach));
  const template = usePlural ? engine.plural_template : engine.template;

  let allFilled = true;
  const filledText = template.replace(/\[([A-Z0-9_]+)\]/g, (_, slot) => {
    const merged = engine.id === 'M03' && (slot === 'APPROACH' || slot === 'APPROACH_PLURAL') ? 'APPROACH_OR_PLURAL' : slot;
    if (slots[merged]) return slots[merged];
    allFilled = false;
    return `[${SLOT[merged] || merged}]`;
  });

  return { text: filledText, variant: null, isComplete: allFilled };
}

function renderTemplate(engine) {
  const selectedApproach = state.engineSlots.APPROACH_OR_PLURAL;
  const usePlural = Boolean(engine.plural_template && selectedApproach && state.variants.some(variant => variant.engine_id === engine.id && variant.slots.APPROACH_PLURAL === selectedApproach));
  const template = usePlural ? engine.plural_template : engine.template;
  const p = document.createElement('div');
  p.className = 'engine-template';
  p.dir = 'ltr';
  template.split(/(\[[A-Z0-9_]+\])/g).forEach(part => {
    const slot = part.match(/^\[([A-Z0-9_]+)\]$/)?.[1];
    if (!slot) {
      p.append(document.createTextNode(part));
    } else {
      const mergedSlot = engine.id === 'M03' && (slot === 'APPROACH' || slot === 'APPROACH_PLURAL') ? 'APPROACH_OR_PLURAL' : slot;
      const isFilled = Boolean(state.engineSlots[mergedSlot]);
      const isActive = state.activeSlot === mergedSlot;
      const b = document.createElement('span');
      b.setAttribute('role', 'button');
      b.setAttribute('tabindex', '0');
      b.className = `slot-token ${isFilled ? 'filled' : 'empty'} ${isActive ? 'active' : ''}`;
      b.title = SLOT[mergedSlot] || mergedSlot;
      if (isFilled) {
        b.dir = 'ltr';
        b.textContent = state.engineSlots[mergedSlot] || '';
      } else {
        const labelText = mergedSlot === 'APPROACH_OR_PLURAL' ? 'رویکرد یا سیاست' : (SLOT[mergedSlot] || mergedSlot);
        const bdi = document.createElement('bdi');
        bdi.dir = 'rtl';
        bdi.textContent = `[${labelText}]`;
        b.replaceChildren(bdi);
      }
      b.addEventListener('click', () => {
        state.activeSlot = mergedSlot;
        render();
      });
      b.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          b.click();
        }
      });
      p.append(b);
    }
  });
  return p;
}

function renderBuilderHeader(engine, slots, filledCount, allSlots) {
  const { text, variant, isComplete } = getEngineCompletedSentence(engine, slots);
  const head = document.createElement('div');
  head.className = 'builder-head-compact';

  const info = document.createElement('div');
  info.className = 'builder-compact-info';

  const statusLabel = isComplete
    ? `✓ کامل (${allSlots.length.toLocaleString('fa-IR')})`
    : `⚡ ${filledCount.toLocaleString('fa-IR')}/${allSlots.length.toLocaleString('fa-IR')} پر شد`;

  info.innerHTML = `
    <div class="builder-compact-title">
      <span class="builder-dot"></span>
      <b>قالب جمله</b>
    </div>
    <span class="builder-status-pill ${isComplete ? 'complete' : 'partial'}" title="${isComplete ? 'جملهٔ نهایی کامل و تأییدشده' : 'پیش‌نمایش زنده در حال تکمیل'}">
      ${statusLabel}
    </span>
  `;
  head.append(info);

  const actions = document.createElement('div');
  actions.className = 'builder-compact-actions';

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'compact-action-btn copy-btn';
  copyBtn.innerHTML = '<span>📋 کپی</span>';
  copyBtn.title = 'کپی متن جمله';
  copyBtn.setAttribute('aria-label', 'کپی متن جمله');
  copyBtn.addEventListener('click', () => copyToClipboard(text, copyBtn));
  actions.append(copyBtn);

  const ttsBtn = document.createElement('button');
  ttsBtn.type = 'button';
  ttsBtn.className = 'compact-icon-btn tts-btn';
  ttsBtn.innerHTML = '🔊';
  ttsBtn.title = 'پخش تلفظ صوتی جمله';
  ttsBtn.setAttribute('aria-label', 'پخش تلفظ صوتی');
  ttsBtn.addEventListener('click', () => speakSentence(text, ttsBtn));
  actions.append(ttsBtn);

  if (variant) {
    const starBtn = document.createElement('button');
    starBtn.type = 'button';
    const isStarred = state.stars.has(variant.variant_id);
    starBtn.className = `compact-icon-btn star-btn ${isStarred ? 'active' : ''}`;
    starBtn.innerHTML = isStarred ? '★' : '☆';
    starBtn.title = isStarred ? 'حذف از منتخب‌ها' : 'افزودن به منتخب‌ها';
    starBtn.setAttribute('aria-label', starBtn.title);
    starBtn.addEventListener('click', () => toggle('stars', variant.variant_id));

    const flagBtn = document.createElement('button');
    flagBtn.type = 'button';
    const isFlagged = state.flags.has(variant.variant_id);
    flagBtn.className = `compact-icon-btn flag-btn ${isFlagged ? 'active' : ''}`;
    flagBtn.innerHTML = isFlagged ? '⚑' : '⚐';
    flagBtn.title = isFlagged ? 'حذف از مرور حفظی' : 'علامت‌گذاری برای مرور حفظی';
    flagBtn.setAttribute('aria-label', flagBtn.title);
    flagBtn.addEventListener('click', () => toggle('flags', variant.variant_id));

    actions.append(starBtn, flagBtn);
  }

  head.append(actions);
  return head;
}

function renderBuilderMeta(engine, slots) {
  const { variant } = getEngineCompletedSentence(engine, slots);
  const roleTags = (engine.essay_roles || []).map(r => ROLE[r] || r).join(' · ');
  const fits = variant?.question_type_fit?.length ? variant.question_type_fit.map(q => QUESTION_FIT[q] || q).join(' · ') : '';

  if (!roleTags && !fits) return null;

  const metaBox = document.createElement('div');
  metaBox.className = 'builder-compact-meta';
  let html = '';
  if (roleTags) {
    html += `<span class="meta-tag"><em>کاربرد:</em> ${roleTags}</span>`;
  }
  if (fits) {
    html += `<span class="meta-tag"><em>نوع سؤال PTE:</em> ${fits}</span>`;
  }
  metaBox.innerHTML = html;
  return metaBox;
}

function renderEngines() {
  const root = $('engineWorkspace');
  root.replaceChildren();

  const directory = document.createElement('div');
  directory.className = 'engine-directory';
  state.engines.forEach(engine => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `engine-chip ${engine.id === state.activeEngine ? 'active' : ''}`;
    b.innerHTML = `<b dir="ltr">${engine.id}</b><span>${engine.name_fa}</span>`;
    b.addEventListener('click', () => {
      state.activeEngine = engine.id;
      state.engineSlots = {};
      state.activeSlot = null;
      render();
    });
    directory.append(b);
  });
  root.append(directory);

  const engine = state.engineById.get(state.activeEngine);
  if (!engine) return;

  const panel = document.createElement('section');
  panel.className = 'engine-panel';
  const matches = currentVariants();
  const allSlots = engineSlotKeys();
  const filledCount = allSlots.filter(s => Boolean(state.engineSlots[s])).length;

  const top = document.createElement('div');
  top.className = 'engine-heading';
  top.innerHTML = `
    <div class="engine-title-wrap">
      <div class="engine-badges">
        <span class="engine-tag" dir="ltr">${engine.id}</span>
        <span class="engine-role-badge">${(engine.essay_roles || []).map(x => ROLE[x] || x).join(' · ')}</span>
      </div>
      <h2>${engine.name_fa}</h2>
    </div>
    <div class="engine-quick-actions">
      <button type="button" class="btn-sample-fill" title="پرکردن تصادفی یک نسخه کامل">
        <span class="btn-icon">🎲</span>
        <span>نمونه آماده</span>
      </button>
      <button type="button" class="btn-reset-engine" ${Object.keys(state.engineSlots).length ? '' : 'disabled'}>
        <span class="btn-icon">↺</span>
        <span>از نو</span>
      </button>
    </div>
  `;

  top.querySelector('.btn-sample-fill').addEventListener('click', () => {
    const available = state.variants.filter(v => v.engine_id === state.activeEngine);
    if (available.length) {
      const sample = available[Math.floor(Math.random() * available.length)];
      state.engineSlots = { ...sample.slots };
      state.activeSlot = null;
      render();
      announce('نمونهٔ کامل با موفقیت بارگذاری شد 🎲');
    }
  });

  top.querySelector('.btn-reset-engine').addEventListener('click', () => {
    state.engineSlots = {};
    state.activeSlot = null;
    render();
    announce('جای‌خالی‌ها پاک شدند');
  });
  panel.append(top);

  const guide = ENGINE_GUIDE[engine.id];
  if (guide) {
    const guideBox = document.createElement('div');
    guideBox.className = 'engine-guide-container';

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = `engine-guide-toggle ${state.engineGuideOpen ? 'open' : ''}`;
    toggleBtn.innerHTML = `
      <div class="toggle-content">
        <span class="bulb">💡</span>
        <b>راهنمای منطق جمله و نکات نگارش PTE</b>
      </div>
      <span class="chevron">${state.engineGuideOpen ? '▲ بستن' : '▼ مشاهده'}</span>
    `;
    toggleBtn.addEventListener('click', () => {
      state.engineGuideOpen = !state.engineGuideOpen;
      render();
    });
    guideBox.append(toggleBtn);

    if (state.engineGuideOpen) {
      const guideBody = document.createElement('div');
      guideBody.className = 'engine-guide-body';
      const flowParts = guide[0].split(/\s*([←↔+])\s*/);
      const flowHtml = flowParts.map(part => {
        if (part === '←' || part === '↔' || part === '+') {
          return `<span class="flow-arrow">${part}</span>`;
        }
        return `<span class="flow-step">${part}</span>`;
      }).join('');

      guideBody.innerHTML = `
        <div class="guide-flow-card">
          <div class="guide-header"><b>جریان منطقی جمله</b><div class="flow-container">${flowHtml}</div></div>
          <p class="guide-desc">${formatRichHtml(guide[1])}</p>
        </div>
        <div class="pte-guidance-card">
          <b>روش امن در انشا (PTE):</b>
          <span>${formatRichHtml('این جمله را **چارچوب** بدان، نه متن حفظی صِرف. در Essay دست‌کم **دو جزئیات مشخص** از خود موضوع سؤال و **یک دلیل یا مثال مرتبط** به آن اضافه کن.')}</span>
        </div>
      `;
      guideBox.append(guideBody);
    }
    panel.append(guideBox);
  }

  const builderCard = document.createElement('div');
  builderCard.className = 'sentence-builder-card';

  const builderHead = renderBuilderHeader(engine, state.engineSlots, filledCount, allSlots);
  builderCard.append(builderHead);
  builderCard.append(renderTemplate(engine));

  const builderMeta = renderBuilderMeta(engine, state.engineSlots);
  if (builderMeta) {
    builderCard.append(builderMeta);
  }

  const interactiveGrid = document.createElement('div');
  interactiveGrid.className = 'engine-interactive-grid';
  interactiveGrid.append(builderCard);

  const active = state.activeSlot || allSlots.find(s => !state.engineSlots[s]) || allSlots[0];
  if (active) {
    const options = [...new Set(variantsForSlot(active).map(v => slotValue(v, active)).filter(Boolean))];
    const isFilled = Boolean(state.engineSlots[active]);
    const chooser = document.createElement('div');
    chooser.className = 'slot-chooser-card';

    const chooserHeader = document.createElement('div');
    chooserHeader.className = 'chooser-header';
    const slotTitle = active === 'APPROACH_OR_PLURAL' ? 'رویکرد یا سیاست' : (SLOT[active] || active);
    chooserHeader.innerHTML = `
      <div class="chooser-title-box">
        <span class="chooser-badge">گام فعلی</span>
        <b>انتخاب برای «${slotTitle}»</b>
        <span class="chooser-count">(${options.length.toLocaleString('fa-IR')} گزینهٔ سازگار)</span>
      </div>
      ${isFilled ? '<button type="button" class="btn-clear-slot">✕ حذف انتخاب این بخش</button>' : ''}
    `;

    if (isFilled) {
      chooserHeader.querySelector('.btn-clear-slot').addEventListener('click', () => {
        delete state.engineSlots[active];
        render();
        announce('انتخاب این بخش حذف شد');
      });
    }
    chooser.append(chooserHeader);

    const list = document.createElement('div');
    list.className = 'choice-list';
    options.forEach(value => {
      const isSelected = state.engineSlots[active] === value;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `choice-item ${isSelected ? 'selected' : ''}`;
      const choiceSpan = document.createElement('span');
      choiceSpan.className = 'choice-text';
      choiceSpan.dir = 'ltr';
      choiceSpan.textContent = value;
      b.replaceChildren(choiceSpan);
      if (isSelected) {
        const checkSpan = document.createElement('span');
        checkSpan.className = 'choice-check';
        checkSpan.textContent = '✓';
        b.appendChild(checkSpan);
      }
      b.addEventListener('click', () => {
        state.engineSlots[active] = value;
        const remaining = allSlots.filter(s => s !== active && !state.engineSlots[s]);
        if (remaining.length) {
          state.activeSlot = remaining[0];
        } else {
          state.activeSlot = null;
        }
        render();
        announce('عبارت انتخاب شد');
      });
      list.append(b);
    });
    chooser.append(list);
    interactiveGrid.append(chooser);
  }
  panel.append(interactiveGrid);

  const engineVariants = state.variants.filter(v => v.engine_id === engine.id);
  if (engineVariants.length > 0) {
    const variantsBox = document.createElement('div');
    variantsBox.className = 'engine-variants-browser';

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'engine-variants-toggle';
    toggleBtn.innerHTML = `
      <span>📚 مشاهدهٔ نسخه‌های آمادهٔ این موتور (${engineVariants.length.toLocaleString('fa-IR')} نسخه)</span>
      <span class="chevron">${state.engineVariantsOpen ? '▲ بستن' : '▼ باز کردن'}</span>
    `;
    toggleBtn.addEventListener('click', () => {
      state.engineVariantsOpen = !state.engineVariantsOpen;
      render();
    });
    variantsBox.append(toggleBtn);

    if (state.engineVariantsOpen) {
      const listEl = document.createElement('div');
      listEl.className = 'engine-variants-list';
      engineVariants.forEach(v => {
        listEl.append(renderVariant(v, true));
      });
      variantsBox.append(listEl);
    }
    panel.append(variantsBox);
  }

  root.append(panel);
}

function renderVariant(variant, compact = false) {
  const article = document.createElement('article');
  article.className = `card variant-card ${compact ? 'compact' : ''}`;
  const body = document.createElement('div');
  body.className = 'card-body';
  const engine = state.engineById.get(variant.engine_id);
  const roles = variant.essay_roles || variant.roles || engine?.essay_roles || [];
  body.innerHTML = `
    <div class="variant-top">
      <span class="approved">✓ تأییدشده</span>
      <div class="variant-engine-info">
        <span class="variant-engine-id" dir="ltr">${variant.engine_id}</span>
        <span class="variant-engine-name">${engine ? engine.name_fa : ''}</span>
      </div>
    </div>
    <p class="sentence" dir="ltr"></p>
    <div class="meta">
      <span class="pill role">${roles.map(x => ROLE[x] || x).join(' · ')}</span>
      ${variantTopics(variant).slice(0, 3).map(x => `<span class="pill">${x}</span>`).join('')}
      <button type="button" class="card-copy-btn">کپی جمله</button>
      ${compact ? '' : '<button type="button" class="use-variant">بارگذاری در موتور</button>'}
    </div>
  `;
  showSelectedTerms(body.querySelector('.sentence'), variant.completed_sentence, state.view === 'engines' ? Object.values(state.engineSlots) : []);
  body.querySelector('.card-copy-btn').addEventListener('click', e => copyToClipboard(variant.completed_sentence, e.currentTarget));
  body.querySelector('.use-variant')?.addEventListener('click', () => {
    state.activeEngine = variant.engine_id;
    state.engineSlots = { ...variant.slots };
    state.activeSlot = null;
    state.view = 'engines';
    render();
    announce('نسخه در موتور بارگذاری شد');
  });
  article.append(actionButtons(variant.variant_id, variant.completed_sentence), body);
  return article;
}

function itemId(item) { return item.variant_id || item.id; }
function practiceItems() {
  return saved(state.practiceSource === 'stars' ? 'stars' : 'flags');
}

function renderPractice() {
  const root = $('practiceWorkspace');
  root.replaceChildren();
  const flagged = saved('flags'), starred = saved('stars');

  const headerBox = document.createElement('div');
  headerBox.className = 'practice-header-box';

  const picker = document.createElement('div');
  picker.className = 'practice-picker';
  [['flags', 'پرچم‌دارها', flagged.length], ['stars', 'منتخب‌ها', starred.length]].forEach(([source, title, count]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `practice-mode ${state.practiceSource === source ? 'active' : ''}`;
    button.textContent = `${title} (${count.toLocaleString('fa-IR')})`;
    button.addEventListener('click', () => {
      state.practiceSource = source;
      state.practiceIndex = 0;
      state.practiceRevealed = false;
      render();
    });
    picker.append(button);
  });
  headerBox.append(picker);
  root.append(headerBox);

  const items = practiceItems();
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'practice-empty';
    empty.innerHTML = `
      <p>${state.practiceSource === 'flags' ? 'هنوز جمله‌ای برای مرور حفظی علامت نزده‌ای. از دکمهٔ پرچم (⚐) کنار هر جمله استفاده کن.' : 'هنوز جمله‌ای به منتخب‌ها اضافه نکرده‌ای. از دکمهٔ ستاره (☆) استفاده کن.'}</p>
    `;
    root.append(empty);
    return;
  }

  if (state.practiceIndex >= items.length) state.practiceIndex = 0;
  if (state.practiceIndex < 0) state.practiceIndex = items.length - 1;

  const item = items[state.practiceIndex];
  const id = itemId(item);
  const status = state.review[id] || 'unreviewed';

  // Stats calculation
  let knownCount = 0, hardCount = 0, unreviewedCount = 0;
  items.forEach(it => {
    const st = state.review[itemId(it)] || 'unreviewed';
    if (st === 'known') knownCount++;
    else if (st === 'hard') hardCount++;
    else unreviewedCount++;
  });

  const card = document.createElement('article');
  card.className = 'practice-card';
  const source = item.variant_id ? `نسخهٔ تأییدشده · ${engineLabel(state.engineById.get(item.engine_id))}` : `جملهٔ منبع · ${item.memorisation_priority}`;
  const completedText = item.completed_sentence || item.text;

  card.innerHTML = `
    <div class="practice-meta">
      <span class="practice-source-tag">${source}</span>
      <span class="practice-counter">کارت <b>${(state.practiceIndex + 1).toLocaleString('fa-IR')}</b> از <b>${items.length.toLocaleString('fa-IR')}</b></span>
    </div>
    <div class="practice-stats-bar">
      <span class="stat-pill known">بلد بودم: ${knownCount.toLocaleString('fa-IR')}</span>
      <span class="stat-pill hard">نیاز به مرور: ${hardCount.toLocaleString('fa-IR')}</span>
      <span class="stat-pill unreviewed">مرور نشده: ${unreviewedCount.toLocaleString('fa-IR')}</span>
    </div>
    <div class="practice-status-line">
      وضعیت این کارت: 
      <span class="status-badge ${status}">${status === 'hard' ? 'نیاز به مرور ↺' : status === 'known' ? 'بلد بودم ✓' : 'مرور نشده'}</span>
    </div>
    <div class="practice-prompt ${state.practiceRevealed ? 'revealed' : ''}" dir="${state.practiceRevealed ? 'ltr' : 'rtl'}"></div>
    <div class="practice-actions">
      <div class="practice-actions-row row-primary">
        <button type="button" class="practice-btn practice-reveal">${state.practiceRevealed ? 'پنهان‌کردن پاسخ' : 'نمایش پاسخ'}</button>
        <button type="button" class="practice-btn practice-speak" ${state.practiceRevealed ? '' : 'disabled'}>پخش صوتی 🔊</button>
        <button type="button" class="practice-btn practice-copy" ${state.practiceRevealed ? '' : 'disabled'}>کپی جمله 📋</button>
      </div>
      <div class="practice-actions-row row-secondary">
        <button type="button" class="practice-btn practice-nav-prev" title="کارت قبلی">← قبلی</button>
        <button type="button" class="practice-btn practice-hard" ${state.practiceRevealed ? '' : 'disabled'}>دوباره ↺</button>
        <button type="button" class="practice-btn practice-known" ${state.practiceRevealed ? '' : 'disabled'}>بلد بودم ✓</button>
        <button type="button" class="practice-btn practice-nav-next" title="کارت بعدی">بعدی →</button>
      </div>
    </div>
  `;

  const prompt = card.querySelector('.practice-prompt');
  if (state.practiceRevealed) {
    showSelectedTerms(prompt, completedText, []);
  } else {
    prompt.textContent = 'جمله را در ذهن خود بساز؛ سپس پاسخ را باز کن و ساختار را با نسخهٔ تأییدشده مقایسه کن.';
  }

  card.querySelector('.practice-nav-prev').addEventListener('click', () => {
    state.practiceIndex = (state.practiceIndex - 1 + items.length) % items.length;
    state.practiceRevealed = false;
    render();
  });
  card.querySelector('.practice-nav-next').addEventListener('click', () => {
    state.practiceIndex = (state.practiceIndex + 1) % items.length;
    state.practiceRevealed = false;
    render();
  });
  card.querySelector('.practice-reveal').addEventListener('click', () => {
    state.practiceRevealed = !state.practiceRevealed;
    render();
  });
  card.querySelector('.practice-speak').addEventListener('click', e => {
    speakSentence(completedText, e.currentTarget);
  });
  card.querySelector('.practice-copy').addEventListener('click', e => {
    copyToClipboard(completedText, e.currentTarget);
  });

  const rate = value => {
    state.review[id] = value;
    saveReview();
    state.practiceIndex = (state.practiceIndex + 1) % items.length;
    state.practiceRevealed = false;
    render();
    announce(value === 'known' ? 'به‌عنوان «بلد بودم» ثبت شد ✓' : 'برای مرور دوباره علامت خورد ↺');
  };

  card.querySelector('.practice-hard').addEventListener('click', () => rate('hard'));
  card.querySelector('.practice-known').addEventListener('click', () => rate('known'));

  root.append(card);
}

function buildPrintableDocument(items) {
  const container = $('printContainer');
  if (!container) return;

  const now = new Date();
  const dateFa = now.toLocaleDateString('fa-IR');
  const dateEn = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const cardsHtml = items.map((item, idx) => {
    const isVariant = Boolean(item.variant_id);
    const num = (idx + 1).toLocaleString('fa-IR');
    const priority = isVariant ? 'P1' : (item.memorisation_priority || 'P2');
    const priorityLabel = priority === 'P1' ? 'P1 · اولویت طلایی' : priority;
    const priorityClass = priority.toLowerCase();
    
    const roleText = isVariant ? 'نسخهٔ موتور' : (ROLE[item.essay_role] || item.essay_role || 'جمله استاندارد');
    const topicsText = isVariant
      ? (variantTopics(item).slice(0, 2).join(' · ') || 'موضوعات مشترک')
      : (item.topic_links ? item.topic_links.map(label).slice(0, 3).join(' · ') : '');
    
    const sentenceText = isVariant ? item.completed_sentence : item.text;
    const engineInfo = isVariant && item.engine_id ? `${item.engine_id} (${state.engineById.get(item.engine_id)?.name_fa || ''})` : '';

    return `
      <div class="print-item-card">
        <div class="print-item-head">
          <div class="print-item-tags">
            <span class="print-num">#${num}</span>
            <span class="print-pill ${priorityClass}">${priorityLabel}</span>
            <span class="print-pill role">${escapeHtml(roleText)}</span>
            ${topicsText ? `<span class="print-pill">${escapeHtml(topicsText)}</span>` : ''}
          </div>
          <div class="print-study-box">
            <span>ارزیابی:</span>
            <span>[ ] دور ۱</span>
            <span>[ ] دور ۲</span>
            <span>[ ] تسلط کامل</span>
          </div>
        </div>
        <p class="print-item-sentence" dir="ltr">${escapeHtml(sentenceText)}</p>
        ${engineInfo ? `<div class="print-item-meta"><span>موتور سازنده: ${escapeHtml(engineInfo)}</span></div>` : ''}
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="print-doc-header">
      <div class="print-brand-row">
        <h1 class="print-doc-title">جمله‌یار PTE — برگهٔ مطالعه آفلاین جمله‌های منتخب</h1>
        <span class="print-badge-count">مجموع: ${items.length.toLocaleString('fa-IR')} جمله</span>
      </div>
      <div class="print-doc-subtitle">PTE Academic Essay — Selected Core Sentences & High-Frequency Structures</div>
      <div class="print-meta-grid">
        <div><strong>تاریخ آماده‌سازی:</strong> ${dateFa} (${dateEn})</div>
        <div><strong>هدف مطالعه:</strong> تسلط بر واژگان و ساختارهای دستوری طلایی برای رایتینگ PTE</div>
        <div><strong>راهنما:</strong> ستون ارزیابی بالا برای علامت‌زدن پیشرفت در زمان مطالعهٔ چاپی یا آفلاین است.</div>
      </div>
    </div>
    <div class="print-cards-list">
      ${cardsHtml}
    </div>
    <div class="print-doc-footer">
      <span>تولید شده توسط جمله‌یار PTE (PTE Sentence Map) · https://ai.studio</span>
      <span dir="ltr">Offline Study Deck</span>
    </div>
  `;
}

function downloadPrintableHtml() {
  const content = $('printContainer').innerHTML;
  const fullHtml = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>جمله‌یار PTE — برگهٔ مطالعه آفلاین جمله‌های منتخب</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Vazirmatn:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
body { font-family: Vazirmatn, system-ui, sans-serif; background: #f8fafc; margin: 0; padding: 24px 16px; color: #0f172a; line-height: 1.6; }
.print-container { background: #fff; max-width: 800px; margin: 0 auto; padding: 32px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
.print-doc-header { border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px; }
.print-brand-row { display: flex; justify-content: space-between; align-items: baseline; }
.print-doc-title { font-size: 20px; font-weight: 800; margin: 0; color: #0f172a; }
.print-badge-count { font-size: 12px; font-weight: 700; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 3px 10px; border-radius: 9999px; }
.print-doc-subtitle { font-family: 'DM Sans', sans-serif; direction: ltr; text-align: right; font-size: 12px; color: #475569; margin: 4px 0 10px; }
.print-meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; font-size: 11px; color: #475569; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
.print-cards-list { display: flex; flex-direction: column; gap: 12px; }
.print-item-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; background: #fff; page-break-inside: avoid; break-inside: avoid; }
.print-item-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.print-item-tags { display: flex; align-items: center; gap: 6px; }
.print-num { font-weight: 700; font-size: 11px; color: #64748b; }
.print-pill { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 4px; border: 1px solid #e2e8f0; background: #f8fafc; color: #334155; }
.print-pill.p1 { background: #fef3c7; border-color: #fde68a; color: #92400e; font-weight: 700; }
.print-pill.p2 { background: #eff6ff; border-color: #dbeafe; color: #1e40af; }
.print-pill.p3 { background: #f1f5f9; border-color: #e2e8f0; color: #475569; }
.print-pill.role { background: #f0fdf4; border-color: #dcfce7; color: #166534; }
.print-study-box { display: inline-flex; align-items: center; gap: 8px; font-size: 10px; color: #64748b; border: 1px dashed #cbd5e1; padding: 2px 8px; border-radius: 4px; }
.print-item-sentence { font-family: 'DM Sans', system-ui, sans-serif; font-size: 14px; line-height: 1.6; font-weight: 500; color: #0f172a; margin: 0 0 6px 0; direction: ltr; text-align: left; }
.print-item-meta { font-size: 11px; color: #64748b; display: flex; gap: 12px; }
.print-doc-footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #64748b; }
@media print {
  @page { size: A4 portrait; margin: 14mm 10mm; }
  body { background: #fff !important; padding: 0 !important; }
  .print-container { box-shadow: none !important; padding: 0 !important; max-width: 100% !important; }
  .print-item-card { break-inside: avoid !important; page-break-inside: avoid !important; }
}
</style>
</head>
<body>
<div class="print-container">
${content}
</div>
<script>
window.onload = function() {
  setTimeout(function() { window.print(); }, 500);
};
</script>
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pte-starred-sentences.html';
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function closePrintModal() {
  $('printModal').hidden = true;
}

function openPrintModal() {
  const items = saved('stars');
  if (!items.length) {
    announce('هنوز جمله‌ای در منتخب‌ها ذخیره نشده است.');
    return;
  }
  $('printCount').textContent = items.length.toLocaleString('fa-IR');
  buildPrintableDocument(items);
  $('printModal').hidden = false;
  try {
    window.print();
  } catch (err) {
    console.warn('Direct print invoke not supported in this frame:', err);
  }
}

function bind() {
  $('search').addEventListener('input', e => {
    state.query = e.target.value.trim();
    $('clearSearch').hidden = !state.query;
    render();
  });
  $('clearSearch').addEventListener('click', () => {
    $('search').value = '';
    state.query = '';
    $('clearSearch').hidden = true;
    render();
  });
  $('onlyP1').addEventListener('click', () => {
    state.p1Only = !state.p1Only;
    $('onlyP1').classList.toggle('active', state.p1Only);
    render();
  });
  $('exportPdfBtn').addEventListener('click', openPrintModal);
  $('printModalClose').addEventListener('click', closePrintModal);
  $('printModalBackdrop').addEventListener('click', closePrintModal);
  $('printDirectBtn').addEventListener('click', () => {
    try {
      window.print();
    } catch (err) {
      console.warn('Print invocation blocked:', err);
    }
  });
  $('printDownloadBtn').addEventListener('click', downloadPrintableHtml);
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => {
    state.view = b.dataset.view;
    state.subtopic = '';
    state.p1Only = false;
    render();
  }));
}

function render() {
  $('loading').hidden = true;
  $('starCount').textContent = state.stars.size.toLocaleString('fa-IR');
  $('flagCount').textContent = state.flags.size.toLocaleString('fa-IR');
  document.querySelectorAll('.tab').forEach(button => {
    const active = button.dataset.view === state.view;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  const isEngines = state.view === 'engines';
  const topics = state.view === 'topics', practice = state.view === 'practice';
  $('topicWorkspace').hidden = !topics;
  $('engineWorkspace').hidden = !isEngines;
  $('practiceWorkspace').hidden = !practice;
  $('onlyP1').hidden = !topics;
  $('listHead').hidden = practice || isEngines;
  $('cards').hidden = practice || isEngines;

  const isStarred = state.view === 'starred';
  const exportBtn = $('exportPdfBtn');
  if (exportBtn) {
    exportBtn.hidden = !isStarred;
    exportBtn.disabled = state.stars.size === 0;
    exportBtn.style.opacity = state.stars.size === 0 ? '0.5' : '1';
    exportBtn.style.pointerEvents = state.stars.size === 0 ? 'none' : 'auto';
  }

  const titles = { engines: 'موتورهای جمله', starred: 'منتخب‌های من', flagged: 'مرور حفظی', practice: 'تمرین حفظ' };
  $('titleText').textContent = topics ? (state.subtopic ? SUB[state.topic][state.subtopic] : TOPICS[state.topic][1]) : titles[state.view];
  $('subtitle').textContent = topics
    ? (state.subtopic ? 'جمله‌های مرتبط با همین زیرموضوع؛ موارد P1 و با تکرار بالا در اولویت هستند.' : 'زیرموضوع مورد نظر را انتخاب کن تا جمله‌های استانداردِ همان بخش نمایش داده شوند.')
    : isEngines
    ? 'یک جای‌خالی را انتخاب کن؛ فقط عبارت‌ها و نسخه‌های تأییدشدهٔ سازگار نمایش داده می‌شوند.'
    : state.view === 'practice'
    ? 'ابتدا جمله را از حافظه در ذهن بساز؛ سپس پاسخ را باز کن و با نسخهٔ استاندارد مقایسه کن.'
    : state.view === 'starred'
    ? 'جمله‌ها و نسخه‌های استانداردی که برای Essay گلچین کرده‌ای.'
    : 'مواردی که برای تمرین و یادگیری نشانه‌گذاری کرده‌ای.';

  if (topics) renderTopics();
  if (isEngines) renderEngines();
  if (practice) renderPractice();
  if (!practice && !isEngines) renderCards();
}

async function load(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

async function setupFirebaseAuth() {
  const loginBtn = $('loginBtn');
  const logoutBtn = $('logoutBtn');

  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      try {
        $('authLabel').textContent = 'در حال اتصال…';
        await signInWithGoogle();
      } catch (err) {
        console.error('Sign in failed:', err);
        $('authLabel').textContent = 'خطا در ورود، دوباره امتحان کنید';
        setTimeout(() => {
          if (!activeFirebaseUser) $('authLabel').textContent = 'همگام‌سازی ابری با گوگل';
        }, 3000);
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOutUser();
      } catch (err) {
        console.error('Sign out failed:', err);
      }
    });
  }

  await initFirebase({
    onAuthChange: async user => {
      activeFirebaseUser = user;
      if (user) {
        $('loginBtn').hidden = true;
        $('userInfo').hidden = false;
        $('userName').textContent = user.displayName || user.email || 'کاربر گرامی';
        setCloudSyncStatus('در حال همگام‌سازی…');

        try {
          const remoteData = await loadStudyState(user.uid);
          if (remoteData) {
            let changed = false;
            if (Array.isArray(remoteData.starred)) {
              remoteData.starred.forEach(id => {
                if (typeof id === 'string' && !state.stars.has(id)) {
                  state.stars.add(id);
                  changed = true;
                }
              });
            }
            if (Array.isArray(remoteData.flagged)) {
              remoteData.flagged.forEach(id => {
                if (typeof id === 'string' && !state.flags.has(id)) {
                  state.flags.add(id);
                  changed = true;
                }
              });
            }
            if (remoteData.review && typeof remoteData.review === 'object') {
              state.review = { ...state.review, ...remoteData.review };
              changed = true;
            }
            if (changed) {
              localStorage.setItem(STORAGE.stars, JSON.stringify([...state.stars]));
              localStorage.setItem(STORAGE.flags, JSON.stringify([...state.flags]));
              localStorage.setItem(STORAGE.review, JSON.stringify(state.review));
              render();
            }
          } else {
            await saveStudyState(user.uid, {
              starred: state.stars,
              flagged: state.flags,
              review: state.review
            });
          }
          setCloudSyncStatus('همگام با ابر ✓');
        } catch (err) {
          console.error('Failed to sync study state:', err);
          setCloudSyncStatus('خطا در بارگذاری ابر');
        }
      } else {
        $('loginBtn').hidden = false;
        $('userInfo').hidden = true;
        $('authLabel').textContent = 'همگام‌سازی ابری با گوگل';
      }
    }
  });
}

async function init() {
  state.stars = readIds(STORAGE.stars);
  state.flags = readIds(STORAGE.flags);
  state.review = readReview();
  bind();
  setupFirebaseAuth();
  try {
    const [cards, questions, recommendations, bank, wave1, wave2, wave3] = await Promise.all([
      load('data/cards.json'),
      load('data/questions.json'),
      load('data/recommendations.json'),
      load('data/engine-bank.json'),
      load('data/wave1-variants.json'),
      load('data/wave2-variants.json'),
      load('data/wave3-variants.json')
    ]);
    state.cards = cards.cards;
    state.cards.forEach(x => state.byId.set(x.id, x));
    makeIndex(questions.questions, recommendations.recommendations);
    state.engines = bank.engines;
    state.engines.forEach(x => state.engineById.set(x.id, x));
    state.variants = [...wave1.variants, ...wave2.variants, ...wave3.variants];
    state.variants.forEach(x => state.variantById.set(x.variant_id, x));
    state.scenarios = { ...wave1.scenario_packs, ...(wave2.additional_scenario_packs || {}) };
    render();
  } catch (e) {
    console.error(e);
    $('loading').hidden = true;
    $('loadError').hidden = false;
  }
}

init();
