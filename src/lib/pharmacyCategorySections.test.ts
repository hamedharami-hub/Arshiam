import { describe, expect, it } from "vitest";
import { splitPharmacyRootFolders } from "./pharmacyCategorySections";

describe("splitPharmacyRootFolders", () => {
  it("shows current categories in taxonomy order and retains old collections separately", () => {
    const result = splitPharmacyRootFolders([
      { id: "folder-pharmacy-modules", name: "Old modules", position: 2 },
      { id: "folder-pharmacy-cat-monographs", name: "Medicines", position: 13 },
      { id: "folder-pharmacy-diseases", name: "Old diseases", position: 3 },
      { id: "folder-pharmacy-cat-clinical-atlas", name: "Diseases", position: 2 },
    ]);

    expect(result.main.map((folder) => folder.name)).toEqual(["Diseases", "Medicines"]);
    expect(result.additional.map((folder) => folder.name)).toEqual(["Old modules", "Old diseases"]);
  });

  it("keeps older categories visible when no current taxonomy is installed", () => {
    const result = splitPharmacyRootFolders([
      { id: "old-b", name: "B", position: 2 },
      { id: "old-a", name: "A", position: 1 },
    ]);
    expect(result.main.map((folder) => folder.name)).toEqual(["A", "B"]);
    expect(result.additional).toEqual([]);
  });
});
