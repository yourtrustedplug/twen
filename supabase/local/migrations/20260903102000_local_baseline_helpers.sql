-- Local harness only. This file is copied into supabase/migrations temporarily by
-- scripts/local/with-local-migrations.sh, then removed. It must never be pushed to production.
--
-- The production project was bootstrapped with the legacy SQL in
-- supabase/PASTE_ME.sql, so its first migration assumes a few helper objects
-- that are not part of the migration chain. These objects are not secret and do
-- not seed data; they only make a fresh local database match production.

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- The original Lovable schema had these tables. The migration that adds their
-- policies still references them, but they were later dropped from production.
-- Keep empty local stubs so the historical migration can be replayed locally.
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null default 0,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.invoices to authenticated;
grant all on public.clients to service_role;
grant all on public.invoices to service_role;
alter table public.clients enable row level security;
alter table public.invoices enable row level security;
