ALTER PUBLICATION supabase_realtime ADD TABLE public.folder_columns;
ALTER TABLE public.folder_columns REPLICA IDENTITY FULL;