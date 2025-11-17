ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS placements JSONB;

COMMENT ON COLUMN public.matches.placements IS
  'JSON array storing match placements with user_id, rank, confidence, and reason metadata.';

