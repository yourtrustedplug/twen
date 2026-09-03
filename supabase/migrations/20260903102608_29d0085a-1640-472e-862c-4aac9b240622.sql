-- Scope campaign policies to authenticated only
drop policy if exists "Brands manage their own campaigns" on public.campaigns;
drop policy if exists "Anyone can view open campaigns" on public.campaigns;
create policy "Brands manage their own campaigns" on public.campaigns for all to authenticated using (auth.uid() = brand_id) with check (auth.uid() = brand_id);
create policy "Anyone can view open campaigns" on public.campaigns for select to authenticated using (status = 'open');

-- Lock internal definer function to service role only
revoke execute on function public.accrue_views(uuid, bigint) from public;
revoke execute on function public.accrue_views(uuid, bigint) from anon;
revoke execute on function public.accrue_views(uuid, bigint) from authenticated;