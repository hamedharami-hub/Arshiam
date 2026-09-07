import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listTasks from "./tools/list-tasks";
import createTask from "./tools/create-task";
import completeTask from "./tools/complete-task";
import listNotes from "./tools/list-notes";
import createNote from "./tools/create-note";

// Direct Supabase host (not the .lovable.cloud proxy) required for OAuth issuer.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "arshnaz-mcp",
  title: "ARSHNAZ",
  version: "0.1.0",
  instructions:
    "Access the signed-in user's ARSHNAZ tasks and notes. Use list_tasks / list_notes to read, create_task / create_note to add items, and complete_task to mark tasks done.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listTasks, createTask, completeTask, listNotes, createNote],
});
