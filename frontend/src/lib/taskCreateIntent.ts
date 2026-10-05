export type TaskCreateIntent = { key: string; id: string };
export type IntentRef = { current: TaskCreateIntent | null };

export function getTaskCreateIntent(ref: IntentRef, key: string): TaskCreateIntent {
  if (ref.current?.key !== key) {
    const id = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `t_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    ref.current = { key, id };
  }
  return ref.current;
}

export function clearTaskCreateIntent(ref: IntentRef, intent: TaskCreateIntent): void {
  if (ref.current?.key === intent.key && ref.current.id === intent.id) ref.current = null;
}
