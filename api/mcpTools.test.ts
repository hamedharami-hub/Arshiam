import { beforeEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "./_lib/mcpTools.js";
import { testStore, type AssistantGrant } from "./_lib/assistantAccess.js";

const grant: AssistantGrant = { id: "grant", userId: "u", name: "MCP", scopes: ["tasks:read", "tasks:create", "notes:read", "notes:create"], createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString(), revokedAt: null };
beforeEach(() => { testStore.enabled = true; testStore.reset(); });
async function connected(scopes = grant.scopes) {
  const server = createMcpServer({ ...grant, scopes });
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a); await client.connect(b);
  return { server, client };
}
describe("MCP tools", () => {
  it("discovers tools and enforces scope on direct invocations", async () => {
    const { server, client } = await connected(["tasks:read"]);
    try {
      expect((await client.listTools()).tools.some(t => t.name === "get_profile")).toBe(true);
      const denied = await client.callTool({ name: "search_notes", arguments: {} });
      expect(denied.isError).toBe(true);
      expect(denied._meta).toHaveProperty("mcp/www_authenticate");
    } finally { await client.close(); await server.close(); }
  });
  it("isolates accounts/private notes and creates exactly once on retry", async () => {
    testStore.notes.set("n", { id: "n", user_id: "u", title: "Public", content: "Text", kind: "note" });
    testStore.notes.set("d", { id: "d", user_id: "u", title: "Diary", content: "Private", kind: "diary" });
    testStore.notes.set("x", { id: "x", user_id: "other", title: "Foreign", content: "Private" });
    const { server, client } = await connected();
    try {
      const notes = await client.callTool({ name: "search_notes", arguments: {} });
      expect((notes.structuredContent as any).data.notes.map((n: any) => n.id)).toEqual(["n"]);
      expect((await client.callTool({ name: "get_note", arguments: { id: "d" } })).isError).toBe(true);
      const input = { title: "Requested task", operation_id: "operation-00000001" };
      const first = await client.callTool({ name: "create_task", arguments: input });
      const second = await client.callTool({ name: "create_task", arguments: input });
      expect(first.isError).toBe(false); expect(second.structuredContent).toEqual(first.structuredContent);
      expect(testStore.tasks.size).toBe(1);
      const created = await client.callTool({ name: "create_note", arguments: { title: "Agent note", content: "General content", operation_id: "note-operation-0001" } });
      expect(created.isError).toBe(false);
      const stored = [...testStore.notes.values()].find(note => note.title === "Agent note");
      expect(stored.kind).toBe("note");
      expect(stored.task_id).toBeNull();
    } finally { await client.close(); await server.close(); }
  });
  it("rejects stale note edits and replays the exact accepted operation", async () => {
    testStore.notes.set("n", { id: "n", user_id: "u", title: "Note", content: "Original", kind: "note", updated_at: "rev-1" });
    const { server, client } = await connected(["notes:read", "notes:update"]);
    try {
      const input = { id: "n", content: "Updated", expected_revision: "rev-1", operation_id: "edit-operation-0001" };
      const first = await client.callTool({ name: "update_note", arguments: input });
      expect(first.isError).toBe(false);
      expect((await client.callTool({ name: "update_note", arguments: input })).structuredContent).toEqual(first.structuredContent);
      expect((await client.callTool({ name: "update_note", arguments: { ...input, content: "Other" } })).isError).toBe(true);
      expect((await client.callTool({ name: "update_note", arguments: { ...input, operation_id: "edit-operation-0002" } })).isError).toBe(true);
      expect(testStore.notes.get("n").content).toBe("Updated");
    } finally { await client.close(); await server.close(); }
  });
  it("computes date-only, timezone instants and period overlaps without fabricating daily commitments", async () => {
    for (const task of [
      { id: "day", work_date: "2026-10-17" },
      { id: "instant", work_date: "2026-10-16T21:30:00Z" },
      { id: "period", work_date: null, planning_start: "2026-10-15", planning_end: "2026-10-20", planning_horizon: "custom" },
      { id: "other", work_date: "2026-10-18" },
    ]) testStore.tasks.set(task.id, { ...task, title: task.id, user_id: "u", schedule_v: 2 });
    const { server, client } = await connected(["tasks:read"]);
    try {
      const response = await client.callTool({ name: "get_schedule", arguments: { start_date: "2026-10-17", end_date: "2026-10-17", timezone: "Asia/Tehran" } });
      expect((response.structuredContent as any).data.tasks.map((t: any) => t.id)).toEqual(["day", "instant", "period"]);
      expect((await client.callTool({ name: "get_schedule", arguments: { start_date: "2026-02-30", end_date: "2026-03-01", timezone: "UTC" } })).isError).toBe(true);
    } finally { await client.close(); await server.close(); }
  });
  it("completes a one-off task once and refuses recurring/study workflow mutations", async () => {
    testStore.tasks.set("one", { id: "one", title: "One", user_id: "u", updated_at: "rev-1" });
    testStore.tasks.set("repeat", { id: "repeat", title: "Repeat", user_id: "u", updated_at: "rev-1", recurrence: "daily" });
    const { server, client } = await connected(["tasks:read", "tasks:update"]);
    try {
      const input = { id: "one", expected_revision: "rev-1", operation_id: "complete-operation-1" };
      expect((await client.callTool({ name: "complete_task", arguments: input })).isError).toBe(false);
      expect((await client.callTool({ name: "complete_task", arguments: input })).isError).toBe(false);
      expect(testStore.tasks.get("one").completed).toBe(true);
      expect(testStore.audit).toHaveLength(1);
      expect((await client.callTool({ name: "complete_task", arguments: { ...input, id: "repeat" } })).isError).toBe(true);
      expect(testStore.tasks.get("repeat").completed).toBeUndefined();
    } finally { await client.close(); await server.close(); }
  });
});
