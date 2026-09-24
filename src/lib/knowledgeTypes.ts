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

export type DocumentViewMode = "reader" | "original" | "split";
export type DocumentLanguageMode = "fa" | "en" | "bilingual";
