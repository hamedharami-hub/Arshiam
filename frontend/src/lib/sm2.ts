// SuperMemo SM-2 algorithm
// quality: 0..5 (we map to: again=0, hard=2, good=4, easy=5)
export type Sm2Input = {
  interval: number;
  ease: number;
  reps: number;
};
export type Sm2Output = Sm2Input & { dueDate: Date };

export function sm2Next(prev: Sm2Input, quality: number, now: Date = new Date()): Sm2Output {
  let { interval, ease, reps } = prev;
  ease = Math.max(1.3, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  if (quality < 3) {
    reps = 0;
    interval = 1;
  } else {
    reps += 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 6;
    else interval = Math.round(interval * ease);
  }
  const dueDate = new Date(now.getTime() + interval * 86_400_000);
  return { interval, ease, reps, dueDate };
}

export const QUALITY_MAP = {
  again: 0,
  hard: 2,
  good: 4,
  easy: 5,
} as const;
