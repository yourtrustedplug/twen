-- Twen welcome chat. Paste supabase/TWEN_WELCOME.sql in the SQL editor
-- (do not apply from the agent). Safe to re-run.

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'direct';

ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_kind_check;
ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_kind_check CHECK (kind IN ('direct', 'twen'));

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS twen_stage text;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS from_twen boolean NOT NULL DEFAULT false;
