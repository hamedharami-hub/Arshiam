import { beforeEach, describe, expect, it } from "vitest";
import { getLastStudy, getStudiedDocIds, recordLastStudy, syncLastStudy, syncStudiedDocs, type LastStudy, type LastStudyRemote } from "./lastStudy";

class Cloud implements LastStudyRemote {
  doc = new Map<string, LastStudy>(); down = false;
  async get(uid: string) { if (this.down) throw new Error("offline"); return this.doc.get(uid) ?? null; }
  async setIfNewer(uid: string, v: LastStudy) {
    if (this.down) throw new Error("offline");
    const s = this.doc.get(uid); if (s && s.openedAt > v.openedAt) return s;
    this.doc.set(uid, v); return v;
  }
}
const phone = () => { localStorage.clear(); };
const swapDevice = () => localStorage.clear();
beforeEach(phone);

describe("last study sync across devices (simulated with a shared in-memory account)", () => {
  it("a page read on the phone shows up on the laptop", async () => {
    const cloud = new Cloud();
    await recordLastStudy("u1", { docId: "doc-phone", title: "Phone doc" }, cloud);
    swapDevice();
    expect(getLastStudy("u1")).toBeNull();
    const synced = await syncLastStudy("u1", cloud);
    expect(synced?.docId).toBe("doc-phone");
    expect(getLastStudy("u1")?.docId).toBe("doc-phone");
  });
  it("the newest read wins in both directions", async () => {
    const cloud = new Cloud();
    cloud.doc.set("u1", { docId: "old-remote", title: "Old", openedAt: 100 });
    localStorage.setItem("arshnaz:last-study:v1:u1", JSON.stringify({ docId: "new-local", title: "New", openedAt: 200 }));
    expect((await syncLastStudy("u1", cloud))?.docId).toBe("new-local");
    expect(cloud.doc.get("u1")?.docId).toBe("new-local");
    cloud.doc.set("u1", { docId: "newest-remote", title: "Newest", openedAt: 300 });
    expect((await syncLastStudy("u1", cloud))?.docId).toBe("newest-remote");
    expect(getLastStudy("u1")?.docId).toBe("newest-remote");
  });
  it("a read made offline is pushed on the next sync and is not lost", async () => {
    const cloud = new Cloud(); cloud.down = true;
    await recordLastStudy("u1", { docId: "offline-doc", title: "Offline" }, cloud);
    expect(getLastStudy("u1")?.docId).toBe("offline-doc");
    await expect(syncLastStudy("u1", cloud)).rejects.toThrow("offline");
    cloud.down = false;
    await syncLastStudy("u1", cloud);
    expect(cloud.doc.get("u1")?.docId).toBe("offline-doc");
  });
  it("guests and other accounts stay separate and never touch the cloud", async () => {
    const cloud = new Cloud();
    await recordLastStudy("guest", { docId: "g", title: "G" }, cloud);
    expect(cloud.doc.size).toBe(0);
    await recordLastStudy("u1", { docId: "a", title: "A" }, cloud);
    expect(getLastStudy("u2")).toBeNull();
    expect(await syncLastStudy("u2", cloud)).toBeNull();
  });
});

describe("opened-lesson status sync", () => {
  class StudiedCloud extends Cloud {
    ids = new Set<string>();
    async getStudied() { if (this.down) throw new Error("offline"); return [...this.ids]; }
    async addStudied(_uid: string, ids: string[]) { if (this.down) throw new Error("offline"); ids.forEach(i => this.ids.add(i)); }
  }
  it("a lesson opened on the phone is marked learning on the laptop", async () => {
    const cloud = new StudiedCloud();
    await recordLastStudy("u1", { docId: "a", title: "A" }, cloud);
    await new Promise(r => setTimeout(r, 0));
    localStorage.clear();
    expect(getStudiedDocIds("u1").size).toBe(0);
    expect([...(await syncStudiedDocs("u1", cloud))]).toEqual(["a"]);
    expect(getStudiedDocIds("u1").has("a")).toBe(true);
  });
  it("lessons opened offline are pushed on the next sync and merged with the other device", async () => {
    const cloud = new StudiedCloud(); cloud.ids.add("laptop-doc");
    cloud.down = true;
    await recordLastStudy("u1", { docId: "phone-doc", title: "P" }, cloud);
    expect(cloud.ids.has("phone-doc")).toBe(false);
    cloud.down = false;
    const merged = await syncStudiedDocs("u1", cloud);
    expect([...merged].sort()).toEqual(["laptop-doc", "phone-doc"]);
    expect(cloud.ids.has("phone-doc")).toBe(true);
  });
  it("guests never touch the account", async () => {
    const cloud = new StudiedCloud();
    await recordLastStudy("guest", { docId: "g", title: "G" }, cloud);
    expect(cloud.ids.size).toBe(0);
    expect((await syncStudiedDocs("guest", cloud)).has("g")).toBe(true);
  });
});
