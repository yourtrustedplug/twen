-- Local harness only. Copied into supabase/migrations temporarily by
-- scripts/local/with-local-migrations.sh, then removed. Never push this to production.
--
-- Production's role check allows admin (installed by LAUNCH.sql). The migration
-- chain only re-adds creator/brand/moderator, so restore admin for local tests.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('creator', 'brand', 'moderator', 'admin'));

update public.profiles
set roles = (
  select array_agg(distinct r)
  from unnest(coalesce(roles, array[role]) || array['admin']) as r
)
where role = 'admin'
  and not (coalesce(roles, array[]::text[]) @> array['admin']::text[]);
