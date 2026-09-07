
REVOKE EXECUTE ON FUNCTION public.has_share_access(uuid, public.share_resource_type, uuid, public.share_permission) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_share_access(uuid, public.share_resource_type, uuid, public.share_permission) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.link_shares_on_signup() FROM PUBLIC, anon, authenticated;
