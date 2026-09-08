-- Schedule verify-views every 15 minutes.
-- Paste AFTER edge function deploy. Enable extensions: pg_cron, pg_net.
-- Replace REPLACE_ME_CRON_SECRET with the same value as Edge secret CRON_SECRET.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  PERFORM cron.unschedule('unignored-verify-views');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'unignored-verify-views',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://utzkityhzxpzipvmdmxz.supabase.co/functions/v1/verify-views',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer REPLACE_ME_CRON_SECRET"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
