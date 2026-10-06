import { describe, expect, it } from "vitest";
import { moduleState } from "../../../api/arsh/modules.js";

describe("module access state", () => {
  it("enables every module for a verified owner without a code", () => {
    expect(moduleState(undefined, true, true)).toEqual({
      catalog: ["study", "mind"],
      unlocked: ["study", "mind"],
      installed: ["study", "mind"],
      is_admin: true,
      is_owner: true,
    });
  });

  it("does not grant ordinary administrators owner module access", () => {
    expect(moduleState(undefined, true, false).installed).toEqual([]);
  });

  it("keeps normal users limited to their installed code grants", () => {
    const access = moduleState({ modules: {
      study: { code_id: "one", installed: false, unlocked_at: "", installed_at: "" },
      mind: { code_id: "two", installed: true, unlocked_at: "", installed_at: "" },
    } }, false, false);
    expect(access.unlocked).toEqual(["study", "mind"]);
    expect(access.installed).toEqual(["mind"]);
  });
});
