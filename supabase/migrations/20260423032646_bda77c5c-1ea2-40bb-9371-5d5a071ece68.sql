
CREATE TABLE public.task_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  task_id uuid NOT NULL,
  url text NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  kind text NOT NULL DEFAULT 'file',
  size_bytes bigint,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own task_attachments"
ON public.task_attachments
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_task_attachments_task ON public.task_attachments(task_id);

-- Storage policies for note-media bucket so users can upload/read/delete their own files (folder = user_id)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='note-media own read') THEN
    CREATE POLICY "note-media own read" ON storage.objects FOR SELECT
      USING (bucket_id = 'note-media' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='note-media own insert') THEN
    CREATE POLICY "note-media own insert" ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'note-media' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='note-media own delete') THEN
    CREATE POLICY "note-media own delete" ON storage.objects FOR DELETE
      USING (bucket_id = 'note-media' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END$$;
