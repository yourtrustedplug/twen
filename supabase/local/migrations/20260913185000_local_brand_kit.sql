-- Local harness only. Copied into supabase/migrations temporarily by
-- scripts/local/with-local-migrations.sh, then removed. Never push this to production.
--
-- brand_kit and profiles.logo_dark_url were part of production's original
-- Lovable schema (supabase/PASTE_ME.sql) and are used by campaign_logos before
-- any migration adds them. Create them for fresh local databases.

alter table public.campaigns
  add column if not exists brand_kit jsonb not null default '{}'::jsonb;

alter table public.profiles
  add column if not exists logo_dark_url text,
  add column if not exists website text not null default '',
  add column if not exists brand_primary_color text not null default '',
  add column if not exists brand_secondary_color text not null default '',
  add column if not exists brand_socials jsonb not null default '{}'::jsonb;
