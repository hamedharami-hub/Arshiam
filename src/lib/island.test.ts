import { beforeEach, describe, expect, it } from "vitest";
import { ISLAND_UNLOCK_EVENT, canBuild, creditIsland, getDayPhase, getNewlyUnlocked, getIslandLevel, getIslandState, moveBuilding, placeBuilding, removeBuilding } from "./island";

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
});
