import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "complete_task",
  title: "Complete task",
  description: "Mark a task as completed (or uncompleted).",
  inputSchema: {
    id: z.string().uuid().describe("Task id."),
    completed: z.boolean().default(true),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ id, completed }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await sb(ctx).from("tasks")
      .update({ completed, completed_at: completed ? new Date().toISOString() : null })
      .eq("id", id).eq("user_id", ctx.getUserId()).select().single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: `Task ${id} → completed=${completed}` }], structuredContent: { task: data } };
  },
});
