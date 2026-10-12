/** Persisted focus duration is active elapsed time (not the configured timer length).
 * Pauses cannot be reconstructed from started_at/ended_at, so never subtract them.
 * All saved outcomes, including early stops, are attributed to their local end day.
 */
export type FocusMetricSession = { duration_minutes: number; ended_at: string | null; completed?: boolean };

export function focusSessionMinutes(session: FocusMetricSession): number {
  return Number.isFinite(session.duration_minutes) ? Math.max(0, session.duration_minutes) : 0;
}

export function focusMinutesInRange(sessions: readonly FocusMetricSession[], start: Date, end: Date): number {
  const total = sessions.reduce((sum, session) => {
    const ended = session.ended_at ? new Date(session.ended_at).getTime() : NaN;
    return ended >= start.getTime() && ended <= end.getTime() ? sum + focusSessionMinutes(session) : sum;
  }, 0);
  return Math.round(total * 100) / 100;
}
