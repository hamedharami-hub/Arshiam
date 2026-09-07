// Helpers to convert mental-health artifacts (Thought records, ABC, Decision)
// into actionable Tasks — one of the main "integration" points between Mind and Tasks.

import { supabase } from "@/integrations/supabase/client";

export async function createTaskFromMind(opts: {
  user_id: string;
  title: string;
  description?: string;
  due_in_days?: number; // null/undefined = inbox
}): Promise<{ ok: boolean; error?: string }> {
  const due = opts.due_in_days != null
    ? new Date(Date.now() + opts.due_in_days * 86400000).toISOString()
    : null;
  const { error } = await supabase.from("tasks").insert({
    user_id: opts.user_id,
    title: opts.title.slice(0, 200),
    description: opts.description?.slice(0, 2000) || null,
    due_date: due,
  });
  return { ok: !error, error: error?.message };
}
