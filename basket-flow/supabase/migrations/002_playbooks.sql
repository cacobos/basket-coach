-- ============================================
-- BasketFlow - Playbooks / Pizarra Táctica
-- ============================================

CREATE TABLE IF NOT EXISTS public.playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT '',
  court_type TEXT NOT NULL DEFAULT 'fiba' CHECK (court_type IN ('fiba', 'nba', 'highschool')),
  view_mode TEXT NOT NULL DEFAULT 'full' CHECK (view_mode IN ('full', 'attack', 'defense')),
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_playbooks_club ON public.playbooks(club_id);
CREATE INDEX IF NOT EXISTS idx_playbooks_updated ON public.playbooks(updated_at DESC);

ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members can view playbooks' AND tablename = 'playbooks') THEN
    CREATE POLICY "Members can view playbooks" ON public.playbooks FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.club_members WHERE club_id = playbooks.club_id AND user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members can insert playbooks' AND tablename = 'playbooks') THEN
    CREATE POLICY "Members can insert playbooks" ON public.playbooks FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.club_members WHERE club_id = playbooks.club_id AND user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members can update playbooks' AND tablename = 'playbooks') THEN
    CREATE POLICY "Members can update playbooks" ON public.playbooks FOR UPDATE
      USING (EXISTS (SELECT 1 FROM public.club_members WHERE club_id = playbooks.club_id AND user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members can delete playbooks' AND tablename = 'playbooks') THEN
    CREATE POLICY "Members can delete playbooks" ON public.playbooks FOR DELETE
      USING (EXISTS (SELECT 1 FROM public.club_members WHERE club_id = playbooks.club_id AND user_id = auth.uid()));
  END IF;
END $$;
