drop policy if exists "Users can view their own clients" on public.clients;
create policy "Users can view their own clients" on public.clients for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can create their own clients" on public.clients;
create policy "Users can create their own clients" on public.clients for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update their own clients" on public.clients;
create policy "Users can update their own clients" on public.clients for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own clients" on public.clients;
create policy "Users can delete their own clients" on public.clients for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can view their own invoices" on public.invoices;
create policy "Users can view their own invoices" on public.invoices for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can create their own invoices" on public.invoices;
create policy "Users can create their own invoices" on public.invoices for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update their own invoices" on public.invoices;
create policy "Users can update their own invoices" on public.invoices for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own invoices" on public.invoices;
create policy "Users can delete their own invoices" on public.invoices for delete to authenticated using (auth.uid() = user_id);