// 24 short bilingual (Persian + English) instructive/inspirational stories.
// Shown next to the hourly motivational quote on Home — one per hour, offline.

export type Story = {
  title_fa: string;
  title_en: string;
  body_fa: string;
  body_en: string;
  lesson_fa: string;
  lesson_en: string;
};

export const HOURLY_STORIES: Story[] = [
  {
    title_fa: "کوزه‌ی شکسته",
    title_en: "The Cracked Pot",
    body_fa: "یک آب‌کش هر روز دو کوزه را روی شانه‌اش حمل می‌کرد. یکی سالم بود و دیگری ترک داشت. کوزه‌ی ترک‌خورده شرمنده بود که نیمی از آب را در راه می‌ریزد. روزی آب‌کش به او گفت: «به کنار جاده نگاه کن.» تنها در سمت کوزه‌ی ترک‌خورده گل‌های زیبا روییده بود. آب‌کش گفته بود: «من از نقص تو استفاده کردم.»",
    body_en: "A water carrier carried two pots on his shoulders each day. One was perfect, the other had a crack. The cracked pot felt ashamed of leaking half the water. One day the carrier said: 'Look beside the path.' Only on the cracked pot's side did beautiful flowers grow. He had used the flaw on purpose.",
    lesson_fa: "ضعف‌های ما، اگر درست دیده شوند، می‌توانند زیبایی بسازند.",
    lesson_en: "Our weaknesses, seen rightly, can grow beauty.",
  },
  {
    title_fa: "دو گرگ درون",
    title_en: "Two Wolves",
    body_fa: "پیرمردی به نوه‌اش گفت: «درون هر انسان دو گرگ می‌جنگند: یکی خشم و حسد، دیگری مهربانی و امید.» نوه پرسید: «کدام پیروز می‌شود؟» پیرمرد گفت: «همانی که تو غذا می‌دهی.»",
    body_en: "An old man told his grandson: 'Inside every person two wolves fight — one of anger and envy, one of kindness and hope.' The boy asked, 'Which wins?' The old man replied, 'The one you feed.'",
    lesson_fa: "افکاری که تغذیه می‌کنیم، شخصیت ما را می‌سازند.",
    lesson_en: "The thoughts we feed become who we are.",
  },
  {
    title_fa: "سنگ بزرگ",
    title_en: "The Big Rocks",
    body_fa: "استادی شیشه‌ای را با سنگ‌های بزرگ پر کرد و پرسید: «پر است؟» شاگردان گفتند: «بله.» سپس شن ریخت و باز جا داشت. آنگاه آب ریخت. گفت: «اگر اول شن می‌ریختم، جای سنگ‌ها نبود.»",
    body_en: "A teacher filled a jar with big rocks and asked, 'Is it full?' Students said yes. He poured in sand — still room. Then water. He said, 'If I'd put sand first, the rocks wouldn't fit.'",
    lesson_fa: "اول مهم‌ترین کارها را در روزت جا بده.",
    lesson_en: "Put the most important things into your day first.",
  },
  {
    title_fa: "بامبوی چینی",
    title_en: "Chinese Bamboo",
    body_fa: "بامبوی چینی را چهار سال آب می‌دهی و چیزی نمی‌بینی. سال پنجم، در شش هفته نود فوت رشد می‌کند. در آن چهار سال، ریشه‌ها در عمق در حال ساخته‌شدن بودند.",
    body_en: "You water Chinese bamboo for four years and see nothing. In year five it grows ninety feet in six weeks. Those silent years built the roots.",
    lesson_fa: "نتیجه‌ای که نمی‌بینی، یعنی هنوز ریشه‌سازی نکردی.",
    lesson_en: "Results you can't see yet mean roots still growing.",
  },
  {
    title_fa: "فیل و طناب",
    title_en: "The Elephant and the Rope",
    body_fa: "فیلی بزرگ با طناب نازکی به میخ کوچکی بسته بود. عابری پرسید چرا فرار نمی‌کند؟ مربی گفت: «وقتی کوچک بود همین طناب نگهش می‌داشت. باور کرد نمی‌تواند.»",
    body_en: "A great elephant was tied to a small peg by a thin rope. A passerby asked why it didn't escape. The trainer said: 'When he was young this rope held him. He learned he couldn't.'",
    lesson_fa: "بزرگ‌ترین زنجیرهای ما، باورهای قدیمی ما هستند.",
    lesson_en: "Our biggest chains are old beliefs.",
  },
  {
    title_fa: "تبرزن خسته",
    title_en: "The Tired Woodcutter",
    body_fa: "تبرزنی هر روز ساعت‌های بیشتری کار می‌کرد ولی چوب کمتری می‌برید. پیرمردی پرسید: «تبرت را تیز کرده‌ای؟» گفت: «وقت ندارم، باید چوب ببرم.»",
    body_en: "A woodcutter worked longer hours each day but cut less wood. An old man asked, 'Have you sharpened your axe?' He said, 'No time — I must cut.'",
    lesson_fa: "وقت گذاشتن برای یادگیری و استراحت، خود کار است.",
    lesson_en: "Time for learning and rest is part of the work.",
  },
  {
    title_fa: "پروانه و پیله",
    title_en: "The Butterfly and the Cocoon",
    body_fa: "مردی پیله‌ای را برید تا پروانه راحت‌تر بیرون بیاید. ولی پروانه هرگز نتوانست پرواز کند؛ تقلا برای بیرون آمدن، بال‌هایش را قوی می‌ساخت.",
    body_en: "A man cut open a cocoon to help the butterfly out. But it never flew — the struggle to emerge was what would have strengthened its wings.",
    lesson_fa: "مبارزه‌ها برای رشد ما لازم هستند، نه مانع.",
    lesson_en: "Struggle is what builds us — not what blocks us.",
  },
  {
    title_fa: "سیب در باغ",
    title_en: "The Apple in the Orchard",
    body_fa: "کودکی از پدرش سیب خواست. پدر گفت: «صبر کن.» چند روز بعد سیب رسیده‌ای داد. کودک پرسید چرا اول ندادی؟ پدر گفت: «آن وقت ترش بود، نه شیرین.»",
    body_en: "A child asked his father for an apple. The father said, 'Wait.' Days later he gave a ripe one. The child asked why not before? The father said, 'It was sour then, not sweet.'",
    lesson_fa: "گاهی «نه» گفتن، شکلی از مهربانی است.",
    lesson_en: "Sometimes saying 'no' is a form of kindness.",
  },
  {
    title_fa: "آینه‌ی روستا",
    title_en: "The Village of Mirrors",
    body_fa: "سگی وارد اتاقی پر از آینه شد. غرّید — همه‌ی سگ‌ها غرّیدند. ترسید و فرار کرد. سگ دیگری آمد و دم تکان داد. همه دم تکان دادند. خوشحال بیرون رفت.",
    body_en: "A dog entered a room of mirrors. He growled — all dogs growled back. He fled, terrified. Another dog came in and wagged its tail. All wagged. He left happy.",
    lesson_fa: "دنیا اغلب همان چیزی را به ما برمی‌گرداند که می‌فرستیم.",
    lesson_en: "The world often returns what we bring to it.",
  },
  {
    title_fa: "دو قورباغه",
    title_en: "Two Frogs",
    body_fa: "دو قورباغه در شیر افتادند. یکی تسلیم شد و غرق شد. دیگری آن‌قدر دست و پا زد که شیر کره شد و او بیرون پرید.",
    body_en: "Two frogs fell into a pail of cream. One gave up and drowned. The other kept kicking until the cream churned to butter — and he leapt out.",
    lesson_fa: "ناامیدی، خود مرگ پیش از مرگ است.",
    lesson_en: "Giving up is the death before the death.",
  },
  {
    title_fa: "کاسه‌ی برنج",
    title_en: "The Bowl of Rice",
    body_fa: "استاد ذِن کاسه‌ای پر از برنج به شاگردش داد و گفت: «این را بدون ریختن یک دانه به آن طرف کوچه ببر.» شاگرد بازگشت. استاد گفت: «اگر همین تمرکز را در زندگی می‌داشتی، استاد بودی.»",
    body_en: "A Zen master gave a bowl of rice to a student: 'Carry this across the street without spilling a grain.' He returned. The master said, 'With this focus in life, you'd be a master too.'",
    lesson_fa: "تمرکز، تمرین لحظه‌های کوچک است.",
    lesson_en: "Focus is practiced in small moments.",
  },
  {
    title_fa: "گره‌ی طناب",
    title_en: "The Knot in the Rope",
    body_fa: "مرشدی طنابی پر از گره به شاگرد داد و گفت: «هر گره را با خشم باز کن.» شاگرد نتوانست. سپس گفت: «حالا با آرامش.» همه باز شد.",
    body_en: "A teacher gave a knotted rope to a student: 'Untie each knot with anger.' He couldn't. 'Now with calm.' Each one opened.",
    lesson_fa: "مشکلات با آرامش حل می‌شوند، نه با تقلا.",
    lesson_en: "Problems open with calm, not with force.",
  },
  {
    title_fa: "هویج، تخم‌مرغ، قهوه",
    title_en: "Carrot, Egg, Coffee",
    body_fa: "مادری سه ظرف آب جوش گذاشت: در یکی هویج، در دیگری تخم‌مرغ، در سومی دانه‌ی قهوه. هویج نرم شد، تخم‌مرغ سفت شد، قهوه آب را عوض کرد. پرسید: «تو کدامی در سختی؟»",
    body_en: "A mother boiled three pots: a carrot, an egg, a coffee bean. The carrot softened, the egg hardened, the coffee changed the water. She asked, 'Which are you in hardship?'",
    lesson_fa: "سختی ما را آشکار می‌کند؛ انتخاب کن چگونه واکنش دهی.",
    lesson_en: "Hardship reveals us. Choose how you respond.",
  },
  {
    title_fa: "ماهیگیر و تاجر",
    title_en: "The Fisherman and the Banker",
    body_fa: "تاجری به ماهیگیری گفت: «اگر بیشتر کار کنی، روزی کشتی می‌خری و ثروتمند می‌شوی و آرام کنار دریا می‌نشینی.» ماهیگیر خندید: «همین حالا کنار دریا نشسته‌ام.»",
    body_en: "A banker told a fisherman: 'Work more, buy boats, get rich, then relax by the sea.' The fisherman laughed: 'I'm already by the sea.'",
    lesson_fa: "گاهی هدف، همان چیزی است که اکنون داریم.",
    lesson_en: "Sometimes the goal is what we already have.",
  },
  {
    title_fa: "سایه‌ی درخت",
    title_en: "The Tree's Shade",
    body_fa: "پیرمردی درخت می‌کاشت. کودکی پرسید: «تا میوه دهد تو نیستی.» گفت: «من زیر سایه‌ی درختی نشسته‌ام که پدرم کاشته بود.»",
    body_en: "An old man planted a tree. A child said, 'You won't see its fruit.' He replied, 'I sit under a tree my father planted.'",
    lesson_fa: "بهترین کارها برای کسانی است که نمی‌بینیم.",
    lesson_en: "The best work is for those we'll never meet.",
  },
  {
    title_fa: "فنجان چای",
    title_en: "A Cup of Tea",
    body_fa: "استاد ذن چای ریخت و ریخت و ریخت تا فنجان لبریز شد. گفت: «ذهن تو هم مثل این فنجان پر است؛ تا خالی نکنی، چیز تازه‌ای نمی‌توانی یاد بگیری.»",
    body_en: "A Zen master poured tea until the cup overflowed. He said, 'Your mind is like this cup — full. Until you empty it, nothing new can enter.'",
    lesson_fa: "یادگیری با خالی‌کردن فرضیات شروع می‌شود.",
    lesson_en: "Learning starts by emptying assumptions.",
  },
  {
    title_fa: "ستاره‌ی ماهی",
    title_en: "The Starfish",
    body_fa: "کودکی ستاره‌های دریایی را به دریا برمی‌گرداند. مردی گفت: «هزاران تا هستند، فرقی نمی‌کند.» کودک یکی را برداشت و انداخت: «برای این یکی فرق کرد.»",
    body_en: "A child threw starfish back to the sea. A man said, 'There are thousands — it doesn't matter.' The child threw one and said, 'It mattered to that one.'",
    lesson_fa: "تأثیر کوچک، برای کسی همه‌چیز است.",
    lesson_en: "A small impact is everything to someone.",
  },
  {
    title_fa: "ابر و باران",
    title_en: "Cloud and Rain",
    body_fa: "ابر گفت: «من بارانم را به این صحرا نمی‌دهم؛ کسی نمی‌بیند.» باد گفت: «گاهی، دیده‌نشدن خود مهربانی است.»",
    body_en: "A cloud said, 'I won't rain on this desert — no one sees.' The wind replied, 'Sometimes, being unseen is itself the kindness.'",
    lesson_fa: "خوبی بدون تماشاگر، خالص‌ترین خوبی است.",
    lesson_en: "Goodness without an audience is the purest kind.",
  },
  {
    title_fa: "گنج خانه",
    title_en: "The Treasure at Home",
    body_fa: "مردی سال‌ها به دنبال گنج به همه‌جا رفت. خسته بازگشت و در حیاط خانه‌ی پدری، زیر درخت، گنج را یافت.",
    body_en: "A man searched the world for treasure. He returned exhausted, and beneath the tree in his father's yard, he found it.",
    lesson_fa: "آنچه می‌جوییم، اغلب نزدیک‌تر از تصور ماست.",
    lesson_en: "What we seek is often closer than we think.",
  },
  {
    title_fa: "دانه‌ی گندم",
    title_en: "The Grain of Wheat",
    body_fa: "دانه‌ای از خاک پرسید: «اگر مرا بپوشانی، می‌میرم؟» خاک گفت: «نه، تازه زنده می‌شوی.»",
    body_en: "A grain asked the soil: 'If you cover me, will I die?' The soil said, 'No — that's when you truly come alive.'",
    lesson_fa: "گاهی پنهان‌شدن، آغاز رشد است.",
    lesson_en: "Sometimes hiding is the start of growing.",
  },
  {
    title_fa: "شب و ستاره",
    title_en: "Night and the Stars",
    body_fa: "شب گفت به روز: «چرا مردم از من می‌ترسند؟» روز گفت: «چون چشم‌هایشان به نور عادت کرده. نمی‌دانند تنها در تاریکی می‌توانند ستاره‌ها را ببینند.»",
    body_en: "Night asked Day: 'Why do people fear me?' Day said, 'Their eyes are used to light. They don't know — only in darkness can stars be seen.'",
    lesson_fa: "از تاریکی نترس؛ آنجا چیزهای زیبا دیده می‌شوند.",
    lesson_en: "Don't fear the dark — beautiful things are seen there.",
  },
  {
    title_fa: "سپاسگزاری",
    title_en: "Gratitude",
    body_fa: "مردی هر شب سه چیز را که برایشان سپاسگزار بود می‌نوشت. سال‌ها بعد گفت: «نمی‌دانم زندگی‌ام بهتر شد، یا چشم‌هایم.»",
    body_en: "A man wrote three things he was grateful for each night. Years later he said, 'I don't know if my life got better — or my eyes.'",
    lesson_fa: "سپاسگزاری چشم‌هایمان را عوض می‌کند.",
    lesson_en: "Gratitude changes our eyes.",
  },
  {
    title_fa: "دریا و رودخانه",
    title_en: "Sea and River",
    body_fa: "رودخانه ترسید به دریا برسد، مبادا ناپدید شود. صدایی گفت: «نمی‌میری؛ تبدیل می‌شوی.»",
    body_en: "A river feared reaching the sea, lest it vanish. A voice said: 'You don't die — you transform.'",
    lesson_fa: "تغییر، پایان نیست؛ شکل تازه‌ای از بودن است.",
    lesson_en: "Change isn't an ending — it's a new form of being.",
  },
  {
    title_fa: "نیمه‌شب و ماه",
    title_en: "Midnight and the Moon",
    body_fa: "ماه به مسافری گفت: «اگر هنوز بیداری، با خودت مهربان باش. شب برای جنگیدن نیست؛ برای آرام شدن است.»",
    body_en: "The moon told a traveler: 'If you're still awake, be gentle with yourself. The night isn't for fighting — it's for softening.'",
    lesson_fa: "خود-مهربانی، دارویی است که فقط خودت می‌توانی به خودت بدهی.",
    lesson_en: "Self-kindness is a medicine only you can give yourself.",
  },
];

export function getStoryForHour(date = new Date()): Story {
  const h = date.getHours();
  return HOURLY_STORIES[h] || HOURLY_STORIES[0];
}
