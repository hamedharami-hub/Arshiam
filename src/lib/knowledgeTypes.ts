export interface KnowledgeFolder {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  icon?: string;
  color?: string;
  position?: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeReviewReference {
  title: string;
  url: string;
  accessed_at: string;
}

/** Evidence recorded by a human reviewer; the app does not independently validate source authority. */
export interface KnowledgeContentReviewEvidence {
  reviewer_role: string;
  jurisdiction: string;
  scope: string;
  reviewed_at: string;
  references: KnowledgeReviewReference[];
}

/** Metadata-only reference to user-owned media in Google Drive; never store OAuth tokens or file bytes here. */
export interface KnowledgeMediaAttachment {
  provider: "google_drive";
  file_id: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  added_at: string;
}

export interface KnowledgeDocument {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  content_html: string;
  title_en?: string;
  content_en?: string;
  preferred_language?: "fa" | "en" | "bilingual";
  direction?: "rtl" | "ltr" | "auto";
  plain_text?: string;
  content_plain?: string;
  tags?: string[];
  source_url?: string;
  /** Manual review label; the UI still requires structured evidence before presenting it as recorded. */
  content_review_status?: "unreviewed" | "reviewed";
  /** Optional audit evidence for a manually recorded review. */
  content_review_evidence?: KnowledgeContentReviewEvidence;
  /** Optional external media links. Removing a link from a lesson never deletes the Drive file. */
  attachments?: KnowledgeMediaAttachment[];
  is_favorite?: boolean;
  is_pinned?: boolean;
  is_archived?: boolean;
  read_count?: number;
  view_count?: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeFolderNode extends KnowledgeFolder {
  children: KnowledgeFolderNode[];
  document_count: number;
}

export type DocumentLanguageMode = "fa" | "en" | "bilingual";
