revoke execute on function public.has_role(uuid, app_role) from public, anon, authenticated;
revoke execute on function public.on_auth_user_created() from public, anon, authenticated;
revoke execute on function public.sync_profile_on_login() from public, anon, authenticated;