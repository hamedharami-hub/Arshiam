// Mini-IPIP — 20 items measuring Big Five (4 per trait)
// Source: Donnellan et al. (2006). 1-5 Likert scale.
export type IpipItem = {
  key: string;
  text: string;
  trait: "extraversion" | "agreeableness" | "conscientiousness" | "neuroticism" | "intellect";
  reverse: boolean;
};

export const MINI_IPIP: IpipItem[] = [
  // Extraversion
  { key: "e1", text: "در جشن‌ها و گردهمایی‌ها روح جمع هستم.", trait: "extraversion", reverse: false },
  { key: "e2", text: "زیاد حرف نمی‌زنم.", trait: "extraversion", reverse: true },
  { key: "e3", text: "با افراد زیادی در یک مهمانی صحبت می‌کنم.", trait: "extraversion", reverse: false },
  { key: "e4", text: "در پس‌زمینه باقی می‌مانم.", trait: "extraversion", reverse: true },

  // Agreeableness
  { key: "a1", text: "با احساسات دیگران همدلی می‌کنم.", trait: "agreeableness", reverse: false },
  { key: "a2", text: "به مشکلات دیگران علاقه‌ای ندارم.", trait: "agreeableness", reverse: true },
  { key: "a3", text: "احساس دیگران برایم مهم است.", trait: "agreeableness", reverse: false },
  { key: "a4", text: "واقعاً به دیگران علاقه‌مند نیستم.", trait: "agreeableness", reverse: true },

  // Conscientiousness
  { key: "c1", text: "کارها را فوراً انجام می‌دهم.", trait: "conscientiousness", reverse: false },
  { key: "c2", text: "وسایلم را در جای خودشان قرار می‌دهم.", trait: "conscientiousness", reverse: false },
  { key: "c3", text: "محیطم را به‌هم می‌ریزم.", trait: "conscientiousness", reverse: true },
  { key: "c4", text: "وظایفم را فراموش می‌کنم.", trait: "conscientiousness", reverse: true },

  // Neuroticism
  { key: "n1", text: "اغلب نوسان خلقی دارم.", trait: "neuroticism", reverse: false },
  { key: "n2", text: "به‌سادگی ناراحت می‌شوم.", trait: "neuroticism", reverse: false },
  { key: "n3", text: "بیشتر اوقات آرامش دارم.", trait: "neuroticism", reverse: true },
  { key: "n4", text: "به‌ندرت احساس دلتنگی می‌کنم.", trait: "neuroticism", reverse: true },

  // Intellect / Openness
  { key: "i1", text: "تخیل پویایی دارم.", trait: "intellect", reverse: false },
  { key: "i2", text: "علاقه‌ای به ایده‌های انتزاعی ندارم.", trait: "intellect", reverse: true },
  { key: "i3", text: "ایده‌های جدید را به‌سرعت درک می‌کنم.", trait: "intellect", reverse: false },
  { key: "i4", text: "تخیل خوبی ندارم.", trait: "intellect", reverse: true },
];

export function scoreMiniIpip(answers: Record<string, number>) {
  const traits: Record<string, { sum: number; n: number }> = {
    extraversion: { sum: 0, n: 0 },
    agreeableness: { sum: 0, n: 0 },
    conscientiousness: { sum: 0, n: 0 },
    neuroticism: { sum: 0, n: 0 },
    intellect: { sum: 0, n: 0 },
  };
  MINI_IPIP.forEach((it) => {
    const raw = answers[it.key];
    if (raw == null) return;
    const v = it.reverse ? 6 - raw : raw;
    traits[it.trait].sum += v;
    traits[it.trait].n += 1;
  });
  const out: Record<string, number> = {};
  Object.entries(traits).forEach(([t, v]) => {
    out[t] = v.n > 0 ? v.sum / v.n : 0;
  });
  return out;
}
