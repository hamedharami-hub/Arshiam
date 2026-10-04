import { beforeEach, describe, expect, it } from "vitest";
import { getResidentCount, getResidentLine, getResidentName, setResidentName, ISLAND_UNLOCK_EVENT, claimWeeklyGift, consumeCheers, getWeekKey, getWeekProgress, recordIslandTask, refreshIslandWeek, canBuild, creditIsland, getDayPhase, getNewlyUnlocked, getIslandLevel, getIslandState, moveBuilding, placeBuilding, removeBuilding } from "./island";

describe("island game", () => {
  beforeEach(() => localStorage.clear());

  it("starts with a welcome gift and credits never go negative", () => {
    expect(getIslandState().points).toBe(40);
    creditIsland(-50);
    expect(getIslandState().points).toBe(40);
    creditIsland(10, "task");
    const s = getIslandState();
    expect(s.points).toBe(50);
    expect(s.lifetime).toBe(50);
  });

  it("builds, blocks occupied tiles, moves and refunds fully", () => {
    const r = placeBuilding("hut", 2, 3);
    expect(r.ok).toBe(true);
    expect(getIslandState().points).toBe(20);
    expect(placeBuilding("tree", 2, 3)).toEqual({ ok: false, reason: "occupied" });
    const id = getIslandState().buildings[0].id;
    expect(moveBuilding(id, 4, 4).ok).toBe(true);
    expect(getIslandState().buildings[0]).toMatchObject({ x: 4, y: 4 });
    removeBuilding(id);
    expect(getIslandState().points).toBe(40);
    expect(getIslandState().lifetime).toBe(40);
  });

  it("locks materials by lifetime points and checks wallet", () => {
    expect(canBuild(getIslandState(), "well")).toBe("locked");
    creditIsland(60);
    expect(canBuild(getIslandState(), "well")).toBe("ok");
    expect(canBuild(getIslandState(), "palace")).toBe("locked");
    expect(placeBuilding("tree", 9, 9)).toEqual({ ok: false, reason: "bounds" });
  });

  it("computes island level from building count", () => {
    expect(getIslandLevel(0).level).toBe(1);
    expect(getIslandLevel(3).level).toBe(2);
    expect(getIslandLevel(7).next).toBe(12);
  });

  it("fires an unlock event when a material threshold is crossed", () => {
    const seen: string[] = [];
    const fn = (e: Event) => (e as CustomEvent<{ id: string }[]>).detail.forEach((m) => seen.push(m.id));
    window.addEventListener(ISLAND_UNLOCK_EVENT, fn);
    creditIsland(20);
    expect(seen).toEqual([]);
    creditIsland(250);
    expect(seen).toEqual(["stone", "brick"]);
    window.removeEventListener(ISLAND_UNLOCK_EVENT, fn);
    expect(getNewlyUnlocked(0, 99)).toEqual([]);
  });

  it("maps real hours to day phases", () => {
    const at = (h: number) => getDayPhase(new Date(2026, 0, 1, h));
    expect([at(6), at(13), at(18), at(22), at(3)]).toEqual(["morning", "day", "sunset", "night", "night"]);
  });

  it("weekly gift: 5 tasks unlock a free decoration that can be placed and refunded", () => {
    const now = new Date(2026, 9, 1, 10); // Thursday
    for (let i = 0; i < 4; i++) recordIslandTask(false, now);
    recordIslandTask(true, now); // subtasks do not count toward the weekly goal
    expect(getWeekProgress(getIslandState(), now)).toMatchObject({ tasks: 4, ready: false });
    expect(claimWeeklyGift(now)).toBeNull();
    recordIslandTask(false, now);
    expect(getWeekProgress(getIslandState(), now).ready).toBe(true);
    const gift = claimWeeklyGift(now)!;
    expect(gift).toBe("flowerbed");
    expect(claimWeeklyGift(now)).toBeNull();
    const points = getIslandState().points;
    expect(placeBuilding(gift, 0, 0).ok).toBe(true);
    expect(getIslandState().points).toBe(points);
    expect(getIslandState().gifts?.flowerbed).toBe(0);
    removeBuilding(getIslandState().buildings[0].id);
    expect(getIslandState().gifts?.flowerbed).toBe(1);
    expect(consumeCheers()).toBe(6);
    expect(consumeCheers()).toBe(0);
  });

  it("auto-grants an unclaimed gift when the week rolls over", () => {
    const thu = new Date(2026, 9, 1, 10);
    for (let i = 0; i < 5; i++) recordIslandTask(false, thu);
    const nextWeek = new Date(2026, 9, 4, 10); // Sunday, new Saturday-start week
    expect(getWeekKey(thu)).not.toBe(getWeekKey(nextWeek));
    const { autoGift, state } = refreshIslandWeek(nextWeek);
    expect(autoGift).toBe("flowerbed");
    expect(state.week).toMatchObject({ tasks: 0, claimed: false });
  });

  it("residents: count from homes, custom names, friendly lines", () => {
    expect(getResidentCount([])).toBe(1);
    creditIsland(100);
    placeBuilding("hut", 1, 1);
    expect(getResidentCount(getIslandState().buildings)).toBe(2);
    expect(getResidentName(getIslandState(), 0, false)).toBe("نیلو");
    setResidentName(1, "  Rumi  ");
    expect(getResidentName(getIslandState(), 1, true)).toBe("Rumi");
    setResidentName(1, "");
    expect(getResidentName(getIslandState(), 1, true)).toBe("Arash");
    const line = getResidentLine(getIslandState(), 0, true, 1, new Date(2026, 9, 1, 10));
    expect(line).toMatch(/weekly gift/);
    expect(getResidentLine(getIslandState(), 0, false, 0, new Date(2026, 9, 1, 22))).toMatch(/شب بخیر/);
  });
});
