-- Local harness only. Copied into supabase/migrations temporarily by
-- scripts/local/with-local-migrations.sh, then removed. Never push this to
-- production.
--
-- CreatorEarnings joins submissions -> campaigns to decide whether earnings
-- are released. The historical policy only lets creators see open campaigns,
-- so a closed campaign appears as NULL and earnings stay "accruing" forever.
-- Allow participating creators to read the campaign row so the local payout
-- flow matches the intended product behavior.
--
-- A SECURITY DEFINER helper avoids policy recursion: submissions policies also
-- reference campaigns. This is a local-only workaround. Production should get
-- an equivalent policy if it does not already have one.

create or replace function public.creator_has_campaign_submission(p_campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.submissions s
    where s.campaign_id = p_campaign_id
      and s.creator_id = auth.uid()
  );
$$;

revoke all on function public.creator_has_campaign_submission(uuid) from public, anon;
grant execute on function public.creator_has_campaign_submission(uuid) to authenticated, service_role;

drop policy if exists "Creators view campaigns they submitted to" on public.campaigns;
create policy "Creators view campaigns they submitted to"
on public.campaigns for select to authenticated
using (public.creator_has_campaign_submission(id));
