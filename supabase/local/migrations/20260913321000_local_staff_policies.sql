-- Local harness only. Copied into supabase/migrations temporarily by
-- scripts/local/with-local-migrations.sh, then removed. Never push this to
-- production.
--
-- Production installs its staff policies and status guard from LAUNCH.sql
-- (outside the historical migration chain). The migration chain still says
-- "moderator" only, so admin test accounts could sign in but saw empty review,
-- campaign, and profile queues. Mirror LAUNCH.sql here using is_staff().

drop policy if exists "Moderators view all submissions" on public.submissions;
drop policy if exists "Staff view all submissions" on public.submissions;
create policy "Staff view all submissions"
on public.submissions for select to authenticated
using (public.is_staff());

drop policy if exists "Moderators review submissions" on public.submissions;
drop policy if exists "Staff review submissions" on public.submissions;
create policy "Staff review submissions"
on public.submissions for update to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Moderators view campaigns" on public.campaigns;
drop policy if exists "Staff view campaigns" on public.campaigns;
create policy "Staff view campaigns"
on public.campaigns for select to authenticated
using (public.is_staff());

drop policy if exists "Staff view all profiles" on public.profiles;
create policy "Staff view all profiles"
on public.profiles for select to authenticated
using (public.is_staff());

create or replace function public.submissions_status_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.status is distinct from old.status then
    if auth.uid() is not null and not public.is_staff() then
      raise exception 'Only staff can change submission status';
    end if;
  end if;
  return new;
end;
$$;
