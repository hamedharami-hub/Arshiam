-- Drop widget-related tables and references
ALTER TABLE public.user_settings DROP COLUMN IF EXISTS default_widget_id;
DROP TABLE IF EXISTS public.task_widgets CASCADE;
DROP TABLE IF EXISTS public.widget_tokens CASCADE;
-- Update default landing if it pointed to widget
UPDATE public.user_settings SET default_landing = 'today' WHERE default_landing = 'widget';