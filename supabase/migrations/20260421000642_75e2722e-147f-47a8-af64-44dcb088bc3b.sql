
-- Add task_id to notes (multi-notes per task)
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_notes_task_id ON public.notes(task_id);

-- Add advanced recurrence rule to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurrence_rule JSONB;

-- Create private bucket for note media
INSERT INTO storage.buckets (id, name, public)
VALUES ('note-media', 'note-media', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for note-media: users can manage files only in their own folder
CREATE POLICY "Users read own media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'note-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'note-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'note-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'note-media' AND auth.uid()::text = (storage.foldername(name))[1]);
