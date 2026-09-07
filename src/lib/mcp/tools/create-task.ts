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
  name: "create_task",
  title: "Create task",
  description: "Create a new task for the signed-in user.",
  inputSchema: {
    title: z.string().trim().min(1).describe("Task title."),
    description: z.string().optional(),
    priority: z.enum(["none", "low", "medium", "high"]).default("none"),
    due_date: z.string().optional().describe("ISO date (YYYY-MM-DD) or full ISO timestamp."),
    start_at: z.string().optional().describe("ISO 8601 start timestamp."),
    end_at: z.string().optional().describe("ISO 8601 end timestamp."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await sb(ctx).from("tasks").insert({
      user_id: ctx.getUserId(),
      title: input.title,
      description: input.description ?? null,
      priority: input.priority,
      due_date: input.due_date ?? null,
      start_at: input.start_at ?? null,
      end_at: input.end_at ?? null,
    }).select().single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: `Created task ${data.id}` }], structuredContent: { task: data } };
  },
});
