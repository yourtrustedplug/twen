-- Local harness only. Copied into supabase/migrations temporarily by
-- scripts/local/with-local-migrations.sh, then removed. Never push this to
-- production.
--
-- The private campaign-assets bucket was created by the manual production
-- baseline (supabase/PASTE_ME.sql), not by a historical migration. Fresh local
-- databases need it before cover/logo uploads can work.

insert into storage.buckets (id, name, public)
values ('campaign-assets', 'campaign-assets', false)
on conflict (id) do nothing;
