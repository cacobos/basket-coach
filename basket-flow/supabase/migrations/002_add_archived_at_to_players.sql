-- BasketFlow Migration 002
-- Add archived_at column to players for season-based archiving

ALTER TABLE public.players ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_players_archived_at ON public.players(archived_at) WHERE archived_at IS NOT NULL;

COMMENT ON COLUMN public.players.archived_at IS 'When set, the player is archived (left the club/team). Archive keeps data but excludes from active rosters.';
