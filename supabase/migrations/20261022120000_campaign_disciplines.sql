-- UGC creators join the discipline list, and campaigns can target types.
--
-- A campaign's target_disciplines decides which creator profiles see and can
-- apply to it. Existing campaigns default to every type so nothing disappears.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_disciplines_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_disciplines_check
  CHECK (
    cardinality(disciplines) > 0
    AND disciplines <@ ARRAY['creator', 'ugc', 'model']::text[]
  );

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS target_disciplines text[] NOT NULL
  DEFAULT ARRAY['creator', 'ugc', 'model']::text[];

ALTER TABLE public.campaigns
  DROP CONSTRAINT IF EXISTS campaigns_target_disciplines_check;

ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_target_disciplines_check
  CHECK (
    cardinality(target_disciplines) > 0
    AND target_disciplines <@ ARRAY['creator', 'ugc', 'model']::text[]
  );

CREATE INDEX IF NOT EXISTS idx_campaigns_target_disciplines
  ON public.campaigns USING gin (target_disciplines);
