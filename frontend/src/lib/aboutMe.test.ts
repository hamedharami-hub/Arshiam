import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/firebaseStore", () => ({ firebaseStore: { from: mocks.from } }));

import { loadAboutMe, saveAboutMe } from "./aboutMe";

describe("About Me owner-scoped persistence", () => {
  beforeEach(() => mocks.from.mockReset());

  it("pins profile reads and writes to the supplied account id", async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(),
      upsert: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.maybeSingle.mockResolvedValue({ data: { user_id: "user-a", answers: {} }, error: null });
    query.upsert.mockResolvedValue({ error: null });
    mocks.from.mockReturnValue(query);

    await loadAboutMe("user-a");
    await saveAboutMe("user-a", { answers: { occupation: "Designer" } });

    expect(mocks.from).toHaveBeenNthCalledWith(1, "about_me", "user-a");
    expect(mocks.from).toHaveBeenNthCalledWith(2, "about_me", "user-a");
  });

  it("fails closed when an owner-pinned profile read detects an account switch", async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.maybeSingle.mockResolvedValue({ data: null, error: new Error("Account changed while reading.") });
    mocks.from.mockReturnValue(query);

    await expect(loadAboutMe("old-account")).rejects.toThrow("Account changed while reading.");
    expect(mocks.from).toHaveBeenCalledWith("about_me", "old-account");
  });
});
