import { describe, expect, it } from "vitest";

type Note = {
  id: string;
  user_id?: string;
  title: string;
  content: string;
  pinned: boolean;
  folder_id?: string | null;
  tag_ids?: string[];
  kind?: string;
};

function filterNotes(
  notes: Note[],
  options: {
    search?: string;
    folderId?: string | null;
    tagId?: string | null;
  }
): Note[] {
  const searchLower = (options.search || "").toLowerCase().trim();

  return notes.filter((n) => {
    if (n.kind === "diary") return false;

    // 1. Search text
    if (searchLower) {
      const matchesTitle = (n.title || "").toLowerCase().includes(searchLower);
      const matchesContent = (n.content || "").toLowerCase().includes(searchLower);
      if (!matchesTitle && !matchesContent) return false;
    }

    // 2. Folder filter
    if (options.folderId === "__none__") {
      if (n.folder_id) return false;
    } else if (options.folderId) {
      if (n.folder_id !== options.folderId) return false;
    }

    // 3. Tag filter
    if (options.tagId) {
      if (!n.tag_ids || !n.tag_ids.includes(options.tagId)) return false;
    }

    return true;
  });
}

function calculateFolderCounts(notes: Note[]): Record<string, number> {
  const counts: Record<string, number> = { __all__: 0, __none__: 0 };
  for (const n of notes) {
    if (n.kind === "diary") continue;
    counts.__all__++;
    if (!n.folder_id) counts.__none__ = (counts.__none__ || 0) + 1;
    else counts[n.folder_id] = (counts[n.folder_id] || 0) + 1;
  }
  return counts;
}

function calculateTagCounts(notes: Note[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const n of notes) {
    if (n.kind === "diary" || !n.tag_ids) continue;
    for (const tid of n.tag_ids) {
      counts[tid] = (counts[tid] || 0) + 1;
    }
  }
  return counts;
}

describe("NotesView filtering and categorization", () => {
  const sampleNotes: Note[] = [
    {
      id: "n1",
      title: "Project Architecture",
      content: "Frontend and backend overview",
      pinned: true,
      folder_id: "folder-work",
      tag_ids: ["tag-tech", "tag-priority"],
    },
    {
      id: "n2",
      title: "Grocery List",
      content: "Milk, eggs, coffee beans",
      pinned: false,
      folder_id: "folder-personal",
      tag_ids: ["tag-home"],
    },
    {
      id: "n3",
      title: "Quick thought",
      content: "Interesting startup idea",
      pinned: false,
      folder_id: null,
      tag_ids: ["tag-tech"],
    },
    {
      id: "n4",
      title: "Random scratchpad",
      content: "No tags and no folder",
      pinned: false,
      folder_id: null,
      tag_ids: [],
    },
    {
      id: "n5",
      title: "Diary entry",
      content: "Daily reflections",
      pinned: false,
      folder_id: "folder-personal",
      kind: "diary",
    },
  ];

  it("filters all standard notes while excluding diary items", () => {
    const res = filterNotes(sampleNotes, {});
    expect(res.map((n) => n.id)).toEqual(["n1", "n2", "n3", "n4"]);
  });

  it("filters notes by specific folder", () => {
    const res = filterNotes(sampleNotes, { folderId: "folder-work" });
    expect(res.map((n) => n.id)).toEqual(["n1"]);
  });

  it("filters uncategorized notes (without a folder)", () => {
    const res = filterNotes(sampleNotes, { folderId: "__none__" });
    expect(res.map((n) => n.id)).toEqual(["n3", "n4"]);
  });

  it("filters notes by tag", () => {
    const res = filterNotes(sampleNotes, { tagId: "tag-tech" });
    expect(res.map((n) => n.id)).toEqual(["n1", "n3"]);
  });

  it("combines folder, tag and text search filtering", () => {
    const res = filterNotes(sampleNotes, {
      folderId: "folder-work",
      tagId: "tag-tech",
      search: "Architecture",
    });
    expect(res.map((n) => n.id)).toEqual(["n1"]);

    const noMatch = filterNotes(sampleNotes, {
      folderId: "folder-work",
      tagId: "tag-home",
    });
    expect(noMatch).toEqual([]);
  });

  it("computes accurate folder and tag counts for navigation badges", () => {
    const folderCounts = calculateFolderCounts(sampleNotes);
    expect(folderCounts.__all__).toBe(4);
    expect(folderCounts.__none__).toBe(2);
    expect(folderCounts["folder-work"]).toBe(1);
    expect(folderCounts["folder-personal"]).toBe(1);

    const tagCounts = calculateTagCounts(sampleNotes);
    expect(tagCounts["tag-tech"]).toBe(2);
    expect(tagCounts["tag-priority"]).toBe(1);
    expect(tagCounts["tag-home"]).toBe(1);
  });
});
