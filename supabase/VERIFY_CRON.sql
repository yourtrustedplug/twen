-- =============================================================================
-- Unignored — paste AFTER CRON_VERIFY_VIEWS.sql to confirm the job exists.
-- Read-only. Expect one row for jobname = unignored-verify-views.
-- =============================================================================

SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'unignored-verify-views';
