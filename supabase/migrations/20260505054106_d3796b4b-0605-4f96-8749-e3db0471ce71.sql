-- Lock down internal SECURITY DEFINER helpers from public API exposure.
-- These are used either as triggers or inside RLS policies; they should
-- not be invokable directly through PostgREST by anon or authenticated users.

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, public;
-- admin_user_list checks is_admin internally; restrict to authenticated only.
REVOKE EXECUTE ON FUNCTION public.admin_user_list() FROM anon, public;