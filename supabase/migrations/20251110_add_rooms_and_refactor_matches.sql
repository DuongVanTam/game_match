-- Rooms and room_players tables
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  entry_fee NUMERIC(12, 2) NOT NULL,
  max_players INTEGER NOT NULL DEFAULT 8,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status = ANY (ARRAY['open', 'ongoing', 'completed', 'cancelled'])),
  created_by UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rooms_select_any_authenticated"
  ON public.rooms
  FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "rooms_insert_creator_only"
  ON public.rooms
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "rooms_update_creator_only"
  ON public.rooms
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Track players inside rooms without immediate balance deduction
CREATE TABLE IF NOT EXISTS public.room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status = ANY (ARRAY['active', 'left', 'kicked'])),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS room_players_room_user_unique
  ON public.room_players (room_id, user_id);

CREATE INDEX IF NOT EXISTS room_players_room_id_idx
  ON public.room_players (room_id);

ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "room_players_select_members"
  ON public.room_players
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.uid() = (
      SELECT created_by FROM public.rooms WHERE id = room_id
    )
  );

CREATE POLICY "room_players_insert_self"
  ON public.room_players
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "room_players_update_self_or_owner"
  ON public.room_players
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.uid() = (
      SELECT created_by FROM public.rooms WHERE id = room_id
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR auth.uid() = (
      SELECT created_by FROM public.rooms WHERE id = room_id
    )
  );

-- Extend matches to link back to rooms and track round number
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms (id),
  ADD COLUMN IF NOT EXISTS round_number INTEGER NOT NULL DEFAULT 1;

-- Populate rooms from existing matches (legacy data)
INSERT INTO public.rooms (id, title, description, entry_fee, max_players, status, created_by, created_at, updated_at)
SELECT
  m.id,
  m.title,
  m.description,
  m.entry_fee,
  m.max_players,
  COALESCE(m.status, 'open'),
  m.created_by,
  COALESCE(m.created_at, NOW()),
  COALESCE(m.updated_at, m.created_at, NOW())
FROM public.matches m
LEFT JOIN public.rooms r ON r.id = m.id
WHERE r.id IS NULL;

UPDATE public.matches
SET room_id = COALESCE(room_id, id),
    round_number = COALESCE(round_number, 1);

ALTER TABLE public.matches
  ALTER COLUMN room_id SET NOT NULL;

-- Backfill room players from existing match participants
INSERT INTO public.room_players (room_id, user_id, status, joined_at, left_at)
SELECT DISTINCT
  mp.match_id AS room_id,
  mp.user_id,
  CASE
    WHEN mp.status = 'active' THEN 'active'
    WHEN mp.status = 'disqualified' THEN 'kicked'
    ELSE 'left'
  END,
  mp.joined_at,
  mp.left_at
FROM public.match_players mp
ON CONFLICT (room_id, user_id) DO NOTHING;

-- Ensure match_players rows know which room player they originated from (optional future work)
ALTER TABLE public.match_players
  ADD COLUMN IF NOT EXISTS room_player_id UUID REFERENCES public.room_players (id);

UPDATE public.match_players mp
SET room_player_id = rp.id
FROM public.room_players rp
WHERE rp.room_id = mp.match_id
  AND rp.user_id = mp.user_id
  AND mp.room_player_id IS NULL;

CREATE INDEX IF NOT EXISTS match_players_room_player_idx
  ON public.match_players (room_player_id);

-- Helper indexes
CREATE INDEX IF NOT EXISTS matches_room_id_idx
  ON public.matches (room_id);

