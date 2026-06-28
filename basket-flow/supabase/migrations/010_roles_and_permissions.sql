-- ============================================
-- BasketFlow - Roles, Permisos y Nuevas Tablas
-- ============================================

-- 1. is_superadmin en profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN NOT NULL DEFAULT false;

-- 2. Actualizar club_members role CHECK
ALTER TABLE public.club_members DROP CONSTRAINT IF EXISTS club_members_role_check;
ALTER TABLE public.club_members ADD CONSTRAINT club_members_role_check
  CHECK (role IN ('club_admin', 'team_admin', 'coach'));

-- 3. club_id en players + team_id nullable
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;
ALTER TABLE public.players
  ALTER COLUMN team_id DROP NOT NULL;

-- 4. player_teams (many-to-many)
CREATE TABLE IF NOT EXISTS public.player_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(player_id, team_id)
);

-- 5. team_staff
CREATE TABLE IF NOT EXISTS public.team_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('head_coach', 'assistant_coach')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- 6. exercise_shares
CREATE TABLE IF NOT EXISTS public.exercise_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exercise_id, shared_with_user_id)
);

-- 7. Índices
CREATE INDEX IF NOT EXISTS idx_player_teams_player ON public.player_teams(player_id);
CREATE INDEX IF NOT EXISTS idx_player_teams_team ON public.player_teams(team_id);
CREATE INDEX IF NOT EXISTS idx_team_staff_team ON public.team_staff(team_id);
CREATE INDEX IF NOT EXISTS idx_team_staff_user ON public.team_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_shares_exercise ON public.exercise_shares(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_shares_user ON public.exercise_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_players_club ON public.players(club_id);

-- 8. RLS en nuevas tablas
ALTER TABLE public.player_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_shares ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FUNCIONES AYUDA RLS
-- ============================================

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_superadmin = true);
$$;

CREATE OR REPLACE FUNCTION public.has_club_role(_club_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_id = _club_id AND user_id = auth.uid() AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_staff(_team_id UUID, _role TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_staff
    WHERE team_id = _team_id AND user_id = auth.uid()
    AND (_role IS NULL OR role = _role)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_club_member_or_admin(_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_id = _club_id AND user_id = auth.uid()
  );
$$;

-- ============================================
-- POLÍTICAS RLS ACTUALIZADAS
-- ============================================

-- --- PROFILES ---
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "View profiles" ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR public.is_superadmin()
  );

-- --- CLUBS ---
DROP POLICY IF EXISTS "Members can view their clubs" ON public.clubs;
CREATE POLICY "View clubs" ON public.clubs FOR SELECT
  USING (
    public.is_superadmin()
    OR EXISTS (SELECT 1 FROM public.club_members WHERE club_id = id AND user_id = auth.uid())
    OR created_by = auth.uid()
  );

-- Solo superadmin o club_admin pueden actualizar un club
DROP POLICY IF EXISTS "club_update_policy" ON public.clubs;
CREATE POLICY "Update clubs" ON public.clubs FOR UPDATE
  USING (
    public.is_superadmin()
    OR public.has_club_role(id, 'club_admin')
  );

-- Solo superadmin puede borrar clubs
DROP POLICY IF EXISTS "club_delete_policy" ON public.clubs;
CREATE POLICY "Delete clubs" ON public.clubs FOR DELETE
  USING (public.is_superadmin());

-- --- CLUB MEMBERS ---
DROP POLICY IF EXISTS "Members can view club members" ON public.club_members;
CREATE POLICY "View club members" ON public.club_members FOR SELECT
  USING (
    public.is_superadmin()
    OR public.is_club_member(club_id, auth.uid())
    OR user_id = auth.uid()
  );

-- Solo superadmin o club_admin pueden insertar/actualizar/borrar miembros
DROP POLICY IF EXISTS "club_members_insert_policy" ON public.club_members;
CREATE POLICY "Insert club members" ON public.club_members FOR INSERT
  WITH CHECK (
    public.is_superadmin()
    OR public.has_club_role(club_id, 'club_admin')
  );

DROP POLICY IF EXISTS "club_members_update_policy" ON public.club_members;
CREATE POLICY "Update club members" ON public.club_members FOR UPDATE
  USING (
    public.is_superadmin()
    OR public.has_club_role(club_id, 'club_admin')
  );

DROP POLICY IF EXISTS "club_members_delete_policy" ON public.club_members;
CREATE POLICY "Delete club members" ON public.club_members FOR DELETE
  USING (
    public.is_superadmin()
    OR public.has_club_role(club_id, 'club_admin')
  );

-- --- TEAMS ---
DROP POLICY IF EXISTS "Members can view teams" ON public.teams;
CREATE POLICY "View teams" ON public.teams FOR SELECT
  USING (
    public.is_superadmin()
    OR EXISTS (SELECT 1 FROM public.club_members WHERE club_id = teams.club_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "teams_insert_policy" ON public.teams;
CREATE POLICY "Insert teams" ON public.teams FOR INSERT
  WITH CHECK (
    public.is_superadmin()
    OR public.has_club_role(club_id, 'club_admin')
    OR (public.has_club_role(club_id, 'team_admin') AND public.is_team_staff(id))
  );

DROP POLICY IF EXISTS "teams_update_policy" ON public.teams;
CREATE POLICY "Update teams" ON public.teams FOR UPDATE
  USING (
    public.is_superadmin()
    OR public.has_club_role(club_id, 'club_admin')
    OR (public.has_club_role(club_id, 'team_admin') AND public.is_team_staff(id))
  );

DROP POLICY IF EXISTS "teams_delete_policy" ON public.teams;
CREATE POLICY "Delete teams" ON public.teams FOR DELETE
  USING (
    public.is_superadmin()
    OR public.has_club_role(club_id, 'club_admin')
    OR (public.has_club_role(club_id, 'team_admin') AND public.is_team_staff(id))
  );

-- --- TEAM STAFF ---
CREATE POLICY "View team staff" ON public.team_staff FOR SELECT
  USING (
    public.is_superadmin()
    OR public.is_club_member(
      (SELECT club_id FROM public.teams WHERE id = team_staff.team_id),
      auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Insert team staff" ON public.team_staff FOR INSERT
  WITH CHECK (
    public.is_superadmin()
    OR public.has_club_role(
      (SELECT club_id FROM public.teams WHERE id = team_id),
      'club_admin'
    )
    OR (
      public.has_club_role(
        (SELECT club_id FROM public.teams WHERE id = team_id),
        'team_admin'
      )
      AND public.is_team_staff(team_id)
    )
  );

CREATE POLICY "Update team staff" ON public.team_staff FOR UPDATE
  USING (
    public.is_superadmin()
    OR public.has_club_role(
      (SELECT club_id FROM public.teams WHERE id = team_id),
      'club_admin'
    )
    OR (
      public.has_club_role(
        (SELECT club_id FROM public.teams WHERE id = team_id),
        'team_admin'
      )
      AND public.is_team_staff(team_id)
    )
  );

CREATE POLICY "Delete team staff" ON public.team_staff FOR DELETE
  USING (
    public.is_superadmin()
    OR public.has_club_role(
      (SELECT club_id FROM public.teams WHERE id = team_id),
      'club_admin'
    )
    OR (
      public.has_club_role(
        (SELECT club_id FROM public.teams WHERE id = team_id),
        'team_admin'
      )
      AND public.is_team_staff(team_id)
    )
  );

-- --- PLAYERS ---
DROP POLICY IF EXISTS "Members can view players" ON public.players;
CREATE POLICY "View players" ON public.players FOR SELECT
  USING (
    public.is_superadmin()
    OR (
      EXISTS (
        SELECT 1 FROM public.club_members cm
        WHERE cm.club_id = players.club_id AND cm.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "players_insert_policy" ON public.players;
CREATE POLICY "Insert players" ON public.players FOR INSERT
  WITH CHECK (
    public.is_superadmin()
    OR public.has_club_role(club_id, 'club_admin')
    OR (
      public.has_club_role(club_id, 'team_admin')
      AND EXISTS (
        SELECT 1 FROM public.player_teams pt
        WHERE pt.player_id = id AND public.is_team_staff(pt.team_id)
      )
    )
    OR (
      public.has_club_role(club_id, 'coach')
      AND EXISTS (
        SELECT 1 FROM public.player_teams pt
        WHERE pt.player_id = id AND public.is_team_staff(pt.team_id)
      )
    )
  );

DROP POLICY IF EXISTS "players_update_policy" ON public.players;
CREATE POLICY "Update players" ON public.players FOR UPDATE
  USING (
    public.is_superadmin()
    OR public.has_club_role(club_id, 'club_admin')
    OR (
      public.has_club_role(club_id, 'team_admin')
      AND EXISTS (
        SELECT 1 FROM public.player_teams pt
        WHERE pt.player_id = id AND public.is_team_staff(pt.team_id)
      )
    )
    OR (
      public.has_club_role(club_id, 'coach')
      AND EXISTS (
        SELECT 1 FROM public.player_teams pt
        WHERE pt.player_id = id AND public.is_team_staff(pt.team_id)
      )
    )
  );

DROP POLICY IF EXISTS "players_delete_policy" ON public.players;
CREATE POLICY "Delete players" ON public.players FOR DELETE
  USING (
    public.is_superadmin()
    OR public.has_club_role(club_id, 'club_admin')
  );

-- --- PLAYER TEAMS ---
CREATE POLICY "View player teams" ON public.player_teams FOR SELECT
  USING (
    public.is_superadmin()
    OR public.is_club_member(
      (SELECT club_id FROM public.teams WHERE id = player_teams.team_id),
      auth.uid()
    )
  );

CREATE POLICY "Insert player teams" ON public.player_teams FOR INSERT
  WITH CHECK (
    public.is_superadmin()
    OR public.has_club_role(
      (SELECT club_id FROM public.teams WHERE id = team_id),
      'club_admin'
    )
    OR public.is_team_staff(team_id)
  );

CREATE POLICY "Delete player teams" ON public.player_teams FOR DELETE
  USING (
    public.is_superadmin()
    OR public.has_club_role(
      (SELECT club_id FROM public.teams WHERE id = team_id),
      'club_admin'
    )
    OR public.is_team_staff(team_id)
  );

-- --- EXERCISES ---
DROP POLICY IF EXISTS "Members can view exercises" ON public.exercises;
DROP POLICY IF EXISTS "Members can insert exercises" ON public.exercises;
DROP POLICY IF EXISTS "Members can update exercises" ON public.exercises;
DROP POLICY IF EXISTS "Members can delete exercises" ON public.exercises;

CREATE POLICY "View exercises" ON public.exercises FOR SELECT
  USING (
    -- Propios
    created_by = auth.uid()
    -- Compartidos y aceptados
    OR EXISTS (
      SELECT 1 FROM public.exercise_shares
      WHERE exercise_id = id AND shared_with_user_id = auth.uid() AND status = 'accepted'
    )
    -- En sesiones de equipos donde soy staff
    OR EXISTS (
      SELECT 1 FROM public.session_exercises se
      JOIN public.training_sessions ts ON ts.id = se.session_id
      JOIN public.team_staff ts2 ON ts2.team_id = ts.team_id
      WHERE se.exercise_id = id AND ts2.user_id = auth.uid()
    )
    -- Superadmin
    OR public.is_superadmin()
  );

CREATE POLICY "Insert exercises" ON public.exercises FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.is_superadmin()
      OR public.is_club_member(club_id, auth.uid())
    )
  );

CREATE POLICY "Update exercises" ON public.exercises FOR UPDATE
  USING (created_by = auth.uid() OR public.is_superadmin());

CREATE POLICY "Delete exercises" ON public.exercises FOR DELETE
  USING (created_by = auth.uid() OR public.is_superadmin());

-- --- EXERCISE SHARES ---
CREATE POLICY "View exercise shares" ON public.exercise_shares FOR SELECT
  USING (
    public.is_superadmin()
    OR shared_with_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.exercises
      WHERE id = exercise_shares.exercise_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Insert exercise shares" ON public.exercise_shares FOR INSERT
  WITH CHECK (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.exercises
      WHERE id = exercise_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Update exercise shares" ON public.exercise_shares FOR UPDATE
  USING (
    public.is_superadmin()
    OR shared_with_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.exercises
      WHERE id = exercise_shares.exercise_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Delete exercise shares" ON public.exercise_shares FOR DELETE
  USING (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.exercises
      WHERE id = exercise_shares.exercise_id AND created_by = auth.uid()
    )
  );

-- --- EXERCISE VARIANTS ---
DROP POLICY IF EXISTS "Members can view exercise variants" ON public.exercise_variants;
DROP POLICY IF EXISTS "Members can insert exercise variants" ON public.exercise_variants;
DROP POLICY IF EXISTS "Members can update exercise variants" ON public.exercise_variants;
DROP POLICY IF EXISTS "Members can delete exercise variants" ON public.exercise_variants;

CREATE POLICY "View exercise variants" ON public.exercise_variants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.exercises e
      WHERE e.id = exercise_variants.exercise_id
      AND (
        e.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.exercise_shares es
          WHERE es.exercise_id = e.id AND es.shared_with_user_id = auth.uid() AND es.status = 'accepted'
        )
        OR public.is_superadmin()
      )
    )
  );

CREATE POLICY "Insert exercise variants" ON public.exercise_variants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exercises
      WHERE id = exercise_id AND (created_by = auth.uid() OR public.is_superadmin())
    )
  );

CREATE POLICY "Update exercise variants" ON public.exercise_variants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.exercises
      WHERE id = exercise_variants.exercise_id AND (created_by = auth.uid() OR public.is_superadmin())
    )
  );

CREATE POLICY "Delete exercise variants" ON public.exercise_variants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.exercises
      WHERE id = exercise_variants.exercise_id AND (created_by = auth.uid() OR public.is_superadmin())
    )
  );

-- --- EXERCISE CATEGORIES ---
DROP POLICY IF EXISTS "Members can view categories" ON public.exercise_categories;
DROP POLICY IF EXISTS "Members can insert categories" ON public.exercise_categories;
DROP POLICY IF EXISTS "Members can delete categories" ON public.exercise_categories;

CREATE POLICY "View categories" ON public.exercise_categories FOR SELECT
  USING (
    public.is_superadmin()
    OR public.is_club_member(club_id, auth.uid())
  );

CREATE POLICY "Insert categories" ON public.exercise_categories FOR INSERT
  WITH CHECK (
    public.is_superadmin()
    OR public.has_club_role(club_id, 'club_admin')
    OR (
      public.is_club_member(club_id, auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.exercises e
        WHERE e.category_id = exercise_categories.id AND e.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Delete categories" ON public.exercise_categories FOR DELETE
  USING (
    public.is_superadmin()
    OR public.has_club_role(club_id, 'club_admin')
  );

-- --- TRAINING SESSIONS ---
DROP POLICY IF EXISTS "Members can view sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Members can insert sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Members can update sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Members can delete sessions" ON public.training_sessions;

CREATE POLICY "View sessions" ON public.training_sessions FOR SELECT
  USING (
    public.is_superadmin()
    OR EXISTS (SELECT 1 FROM public.club_members WHERE club_id = training_sessions.club_id AND user_id = auth.uid())
  );

CREATE POLICY "Insert sessions" ON public.training_sessions FOR INSERT
  WITH CHECK (
    public.is_superadmin()
    OR public.has_club_role(club_id, 'club_admin')
    OR public.is_team_staff(team_id)
  );

CREATE POLICY "Update sessions" ON public.training_sessions FOR UPDATE
  USING (
    public.is_superadmin()
    OR public.has_club_role(club_id, 'club_admin')
    OR public.is_team_staff(team_id)
  );

CREATE POLICY "Delete sessions" ON public.training_sessions FOR DELETE
  USING (
    public.is_superadmin()
    OR public.has_club_role(club_id, 'club_admin')
    OR (public.has_club_role(club_id, 'team_admin') AND public.is_team_staff(team_id))
    OR (public.has_club_role(club_id, 'coach') AND public.is_team_staff(team_id))
  );

-- --- SESSION SECTIONS ---
DROP POLICY IF EXISTS "Members can view session sections" ON public.session_sections;
DROP POLICY IF EXISTS "Members can insert session sections" ON public.session_sections;
DROP POLICY IF EXISTS "Members can update session sections" ON public.session_sections;
DROP POLICY IF EXISTS "Members can delete session sections" ON public.session_sections;

CREATE POLICY "View session sections" ON public.session_sections FOR SELECT
  USING (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.training_sessions ts
      JOIN public.club_members cm ON cm.club_id = ts.club_id
      WHERE ts.id = session_sections.session_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Insert session sections" ON public.session_sections FOR INSERT
  WITH CHECK (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.training_sessions ts
      WHERE ts.id = session_id
      AND (
        public.has_club_role(ts.club_id, 'club_admin')
        OR public.is_team_staff(ts.team_id)
      )
    )
  );

CREATE POLICY "Update session sections" ON public.session_sections FOR UPDATE
  USING (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.training_sessions ts
      WHERE ts.id = session_sections.session_id
      AND (
        public.has_club_role(ts.club_id, 'club_admin')
        OR public.is_team_staff(ts.team_id)
      )
    )
  );

CREATE POLICY "Delete session sections" ON public.session_sections FOR DELETE
  USING (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.training_sessions ts
      WHERE ts.id = session_sections.session_id
      AND (
        public.has_club_role(ts.club_id, 'club_admin')
        OR public.is_team_staff(ts.team_id)
      )
    )
  );

-- --- SESSION EXERCISES ---
DROP POLICY IF EXISTS "Members can view session exercises" ON public.session_exercises;
DROP POLICY IF EXISTS "Members can insert session exercises" ON public.session_exercises;
DROP POLICY IF EXISTS "Members can update session exercises" ON public.session_exercises;
DROP POLICY IF EXISTS "Members can delete session exercises" ON public.session_exercises;

CREATE POLICY "View session exercises" ON public.session_exercises FOR SELECT
  USING (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.training_sessions ts
      JOIN public.club_members cm ON cm.club_id = ts.club_id
      WHERE ts.id = session_exercises.session_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Insert session exercises" ON public.session_exercises FOR INSERT
  WITH CHECK (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.training_sessions ts
      WHERE ts.id = session_id
      AND (
        public.has_club_role(ts.club_id, 'club_admin')
        OR public.is_team_staff(ts.team_id)
      )
    )
  );

CREATE POLICY "Update session exercises" ON public.session_exercises FOR UPDATE
  USING (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.training_sessions ts
      WHERE ts.id = session_exercises.session_id
      AND (
        public.has_club_role(ts.club_id, 'club_admin')
        OR public.is_team_staff(ts.team_id)
      )
    )
  );

CREATE POLICY "Delete session exercises" ON public.session_exercises FOR DELETE
  USING (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.training_sessions ts
      WHERE ts.id = session_exercises.session_id
      AND (
        public.has_club_role(ts.club_id, 'club_admin')
        OR public.is_team_staff(ts.team_id)
      )
    )
  );

-- --- ATTENDANCE ---
DROP POLICY IF EXISTS "Members can view attendance" ON public.attendance;

CREATE POLICY "View attendance" ON public.attendance FOR SELECT
  USING (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.training_sessions ts
      JOIN public.club_members cm ON cm.club_id = ts.club_id
      WHERE ts.id = attendance.session_id AND cm.user_id = auth.uid()
    )
  );

-- attendance INSERT/UPDATE/DELETE policies (nuevas)
DROP POLICY IF EXISTS "attendance_insert_policy" ON public.attendance;
CREATE POLICY "Insert attendance" ON public.attendance FOR INSERT
  WITH CHECK (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.training_sessions ts
      WHERE ts.id = session_id
      AND (
        public.has_club_role(ts.club_id, 'club_admin')
        OR public.is_team_staff(ts.team_id)
      )
    )
  );

CREATE POLICY "Update attendance" ON public.attendance FOR UPDATE
  USING (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.training_sessions ts
      WHERE ts.id = attendance.session_id
      AND (
        public.has_club_role(ts.club_id, 'club_admin')
        OR public.is_team_staff(ts.team_id)
      )
    )
  );

CREATE POLICY "Delete attendance" ON public.attendance FOR DELETE
  USING (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.training_sessions ts
      WHERE ts.id = attendance.session_id
      AND (
        public.has_club_role(ts.club_id, 'club_admin')
        OR public.is_team_staff(ts.team_id)
      )
    )
  );

-- --- GAME STATS ---
DROP POLICY IF EXISTS "Members can view game stats" ON public.game_stats;

CREATE POLICY "View game stats" ON public.game_stats FOR SELECT
  USING (
    public.is_superadmin()
    OR EXISTS (SELECT 1 FROM public.club_members WHERE club_id = game_stats.club_id AND user_id = auth.uid())
  );

-- game_stats INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "game_stats_insert_policy" ON public.game_stats;
CREATE POLICY "Insert game stats" ON public.game_stats FOR INSERT
  WITH CHECK (
    public.is_superadmin()
    OR public.has_club_role(club_id, 'club_admin')
    OR public.is_team_staff(team_id)
  );

CREATE POLICY "Update game stats" ON public.game_stats FOR UPDATE
  USING (
    public.is_superadmin()
    OR public.has_club_role(club_id, 'club_admin')
    OR public.is_team_staff(team_id)
  );

CREATE POLICY "Delete game stats" ON public.game_stats FOR DELETE
  USING (
    public.is_superadmin()
    OR public.has_club_role(club_id, 'club_admin')
    OR (public.has_club_role(club_id, 'team_admin') AND public.is_team_staff(team_id))
  );

-- --- PLAYER GAME STATS ---
DROP POLICY IF EXISTS "Members can view player game stats" ON public.player_game_stats;
DROP POLICY IF EXISTS "Members can upsert player game stats" ON public.player_game_stats;

CREATE POLICY "View player game stats" ON public.player_game_stats FOR SELECT
  USING (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.game_stats gs
      JOIN public.club_members cm ON cm.club_id = gs.club_id
      WHERE gs.id = player_game_stats.game_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Insert player game stats" ON public.player_game_stats FOR INSERT
  WITH CHECK (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.game_stats gs
      WHERE gs.id = game_id
      AND (
        public.has_club_role(gs.club_id, 'club_admin')
        OR public.is_team_staff(gs.team_id)
      )
    )
  );

CREATE POLICY "Update player game stats" ON public.player_game_stats FOR UPDATE
  USING (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.game_stats gs
      WHERE gs.id = player_game_stats.game_id
      AND (
        public.has_club_role(gs.club_id, 'club_admin')
        OR public.is_team_staff(gs.team_id)
      )
    )
  );

CREATE POLICY "Delete player game stats" ON public.player_game_stats FOR DELETE
  USING (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.game_stats gs
      WHERE gs.id = player_game_stats.game_id
      AND (
        public.has_club_role(gs.club_id, 'club_admin')
        OR public.is_team_staff(gs.team_id)
      )
    )
  );

-- --- EVALUATIONS ---
DROP POLICY IF EXISTS "Members can view evaluations" ON public.evaluations;

CREATE POLICY "View evaluations" ON public.evaluations FOR SELECT
  USING (
    public.is_superadmin()
    OR EXISTS (SELECT 1 FROM public.club_members WHERE club_id = evaluations.club_id AND user_id = auth.uid())
  );

-- evaluation INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "evaluations_insert_policy" ON public.evaluations;
CREATE POLICY "Insert evaluations" ON public.evaluations FOR INSERT
  WITH CHECK (
    evaluator_id = auth.uid()
    AND (
      public.is_superadmin()
      OR public.is_club_member(club_id, auth.uid())
    )
  );

CREATE POLICY "Update evaluations" ON public.evaluations FOR UPDATE
  USING (
    public.is_superadmin()
    OR evaluator_id = auth.uid()
  );

CREATE POLICY "Delete evaluations" ON public.evaluations FOR DELETE
  USING (
    public.is_superadmin()
    OR evaluator_id = auth.uid()
  );

-- --- PLAYBOOKS ---
DROP POLICY IF EXISTS "playbooks_select_policy" ON public.playbooks;
DROP POLICY IF EXISTS "playbooks_insert_policy" ON public.playbooks;
DROP POLICY IF EXISTS "playbooks_update_policy" ON public.playbooks;
DROP POLICY IF EXISTS "playbooks_delete_policy" ON public.playbooks;

CREATE POLICY "View playbooks" ON public.playbooks FOR SELECT
  USING (
    public.is_superadmin()
    OR EXISTS (SELECT 1 FROM public.club_members WHERE club_id = playbooks.club_id AND user_id = auth.uid())
  );

CREATE POLICY "Insert playbooks" ON public.playbooks FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.is_superadmin()
      OR public.is_club_member(club_id, auth.uid())
    )
  );

CREATE POLICY "Update playbooks" ON public.playbooks FOR UPDATE
  USING (
    created_by = auth.uid()
    OR public.is_superadmin()
    OR public.has_club_role(club_id, 'club_admin')
  );

CREATE POLICY "Delete playbooks" ON public.playbooks FOR DELETE
  USING (
    created_by = auth.uid()
    OR public.is_superadmin()
    OR public.has_club_role(club_id, 'club_admin')
  );

-- ============================================
-- ACTUALIZAR is_club_member para que también
-- incluya a superadmins
-- ============================================
CREATE OR REPLACE FUNCTION public.is_club_member(_club_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members cm
    WHERE cm.club_id = _club_id AND cm.user_id = _user_id
  );
$$;
