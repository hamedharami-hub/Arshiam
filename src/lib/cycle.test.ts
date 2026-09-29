import { describe, expect, it } from "vitest";
import { differenceInCalendarDays, format } from "date-fns";
import { predictFertileWindow, predictNextPeriod, type CycleLog, type CycleProfile } from "./cycle";

const profile: CycleProfile = {
  id: "profile-1",
  user_id: "user-1",
  label: "Test",
  color: "#ec4899",
  is_self: true,
  avg_cycle_length: 28,
  avg_period_length: 5,
  luteal_length: 14,
  notify_period: false,
  notify_ovulation: false,
};

const periodStart = (log_date: string): CycleLog => ({
  id: `log-${log_date}`,
  user_id: profile.user_id,
  profile_id: profile.id,
  log_date,
  event: "period_start",
  flow: null,
  pain: null,
  mood: null,
  energy: null,
  symptoms: null,
  notes: null,
});

const dateKey = (date: Date | null | undefined) => date ? format(date, "yyyy-MM-dd") : null;

describe("cycle estimates", () => {
  it("keeps a predicted period on today's calendar date even when the time is later than midnight", () => {
    const logs = [periodStart("2025-03-05")];
    const lateToday = new Date("2025-04-02T21:30:00");

    expect(dateKey(predictNextPeriod(logs, profile, lateToday))).toBe("2025-04-02");
  });

  it("advances to the next cycle only after the predicted period date has passed", () => {
    const logs = [periodStart("2025-03-05")];

    expect(dateKey(predictNextPeriod(logs, profile, new Date("2025-04-03T00:01:00")))).toBe("2025-04-30");
  });

  it("returns an inclusive six-day estimated fertile window ending on estimated ovulation", () => {
    const window = predictFertileWindow([periodStart("2025-03-05")], profile, new Date("2025-03-10T12:00:00"));

    expect(dateKey(window?.start)).toBe("2025-03-13");
    expect(dateKey(window?.end)).toBe("2025-03-18");
    expect(window && differenceInCalendarDays(window.end, window.start) + 1).toBe(6);
  });

  it("estimates the next fertile window once the current estimated window has ended", () => {
    const window = predictFertileWindow([periodStart("2025-03-05")], profile, new Date("2025-03-19T08:00:00"));

    expect(dateKey(window?.start)).toBe("2025-04-10");
    expect(dateKey(window?.end)).toBe("2025-04-15");
  });

  it("returns no calendar estimate until a period start has been recorded", () => {
    expect(predictNextPeriod([], profile, new Date("2025-03-10T12:00:00"))).toBeNull();
    expect(predictFertileWindow([], profile, new Date("2025-03-10T12:00:00"))).toBeNull();
  });
});
