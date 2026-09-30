// Pearson correlation with sample size & confidence label
export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx, b = ys[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  const denom = Math.sqrt(dx * dy);
  if (denom === 0) return null;
  return num / denom;
}

export function confidenceLabel(n: number, r: number): string {
  const abs = Math.abs(r);
  if (n < 5) return "نمونه ناکافی";
  if (n >= 14 && abs >= 0.5) return "قوی";
  if (n >= 10 && abs >= 0.35) return "متوسط";
  if (n >= 7 && abs >= 0.25) return "ضعیف";
  return "ضعیف";
}

export function describeCorr(label: string, r: number): string {
  const dir = r > 0 ? "مثبت" : "منفی";
  const strength = Math.abs(r) >= 0.5 ? "قوی" : Math.abs(r) >= 0.3 ? "متوسط" : "ضعیف";
  return `${label}: همبستگی ${dir} ${strength} (r=${r.toFixed(2)})`;
}
