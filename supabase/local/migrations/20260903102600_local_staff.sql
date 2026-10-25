-- Local harness only. Copied into supabase/migrations temporarily by
-- scripts/local/with-local-migrations.sh, then removed. Never push this to production.
--
-- supabase/LAUNCH.sql originally installed is_staff() outside the migration
-- chain. The first migration creates public.profiles, so this is the earliest
-- safe point to recreate the production function locally.

create or replace function public.is_staff(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.role in ('moderator', 'admin')
  );
$$;

revoke all on function public.is_staff(uuid) from public, anon;
grant execute on function public.is_staff(uuid) to authenticated, service_role;
