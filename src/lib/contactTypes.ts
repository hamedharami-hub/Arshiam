export interface ContactPhone {
  label: string;
  value: string;
}

export interface ContactEmail {
  label: string;
  value: string;
}

export interface ContactAddress {
  label: string;
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface ContactWebsite {
  label: string;
  url: string;
}

export interface ContactSocialLink {
  platform: string;
  url: string;
  handle?: string;
}

export type ContactSource = "manual" | "device_import";

export interface Contact {
  id: string;
  user_id: string;
  display_name: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  job_title?: string;
  photo_url?: string;
  photo_path?: string;
  phones: ContactPhone[];
  emails: ContactEmail[];
  addresses: ContactAddress[];
  websites: ContactWebsite[];
  social_links: ContactSocialLink[];
  notes?: string;
  source: ContactSource;
  created_at: string;
  updated_at: string;
}

export interface TaskContact {
  id: string;
  user_id: string;
  task_id: string;
  contact_id: string;
  role_or_context?: string;
  created_at: string;
}

export interface TaskContactWithDetails extends TaskContact {
  contact?: Contact;
}

export interface ContactDuplicateSuggestion {
  contact: Contact;
  matchedOn: "phone" | "email";
  matchedValue: string;
}
