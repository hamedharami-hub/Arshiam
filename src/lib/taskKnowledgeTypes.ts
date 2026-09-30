export interface TaskKnowledgeLink {
  id: string;
  user_id: string;
  task_id: string;
  document_id: string;
  note_or_context?: string;
  created_at: string;
}
