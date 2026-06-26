-- ============================================
-- BasketFlow - Fix RLS policies faltantes
-- ============================================

-- 1. Políticas para exercise_categories (RLS enabled sin policies)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members can view categories' AND tablename = 'exercise_categories') THEN
    CREATE POLICY "Members can view categories" ON public.exercise_categories FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.club_members WHERE club_id = exercise_categories.club_id AND user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members can insert categories' AND tablename = 'exercise_categories') THEN
    CREATE POLICY "Members can insert categories" ON public.exercise_categories FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.club_members WHERE club_id = exercise_categories.club_id AND user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members can delete categories' AND tablename = 'exercise_categories') THEN
    CREATE POLICY "Members can delete categories" ON public.exercise_categories FOR DELETE
      USING (EXISTS (SELECT 1 FROM public.club_members WHERE club_id = exercise_categories.club_id AND user_id = auth.uid()));
  END IF;
END $$;

-- 2. Políticas para player_game_stats (RLS enabled sin policies)
--    Solo lectura y escritura para miembros del club
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members can view player game stats' AND tablename = 'player_game_stats') THEN
    CREATE POLICY "Members can view player game stats" ON public.player_game_stats FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM public.game_stats gs
          JOIN public.club_members cm ON cm.club_id = gs.club_id
          WHERE gs.id = player_game_stats.game_id AND cm.user_id = auth.uid())
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members can upsert player game stats' AND tablename = 'player_game_stats') THEN
    CREATE POLICY "Members can upsert player game stats" ON public.player_game_stats FOR INSERT
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.game_stats gs
          JOIN public.club_members cm ON cm.club_id = gs.club_id
          WHERE gs.id = game_id AND cm.user_id = auth.uid())
      );
  END IF;
END $$;
