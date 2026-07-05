-- BasketFlow Initial Schema
-- Generated from consolidated migrations 001-023
-- Timestamp: 2026-07-04 12:48:39 UTC


-- ========== 001_initial_schema.sql ==========

-- BasketFlow Initial Schema
-- Generated from consolidated migrations 001-023
-- Timestamp: 2026-07-04 12:48:39 UTC


-- ========== 001_initial_schema.sql ==========



-- ========== 002_playbooks.sql ==========

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


-- ========== 003_sections_diagrams_variants.sql ==========

-- ============================================
-- BasketFlow - Secciones, Diagramas y Variantes
-- ============================================

-- 1. Agregar columna objectives a training_sessions
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS objectives TEXT;

-- 2. Agregar columna diagrams a exercises (JSONB array [{url, caption}])
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS diagrams JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 3. Tabla session_sections (secciones dentro de una sesión)
CREATE TABLE IF NOT EXISTS public.session_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Agregar section_id a session_exercises
ALTER TABLE public.session_exercises
  ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.session_sections(id) ON DELETE SET NULL;

-- 5. Tabla exercise_variants (variantes de ejercicios)
CREATE TABLE IF NOT EXISTS public.exercise_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  duration_minutes INTEGER,
  players_min INTEGER,
  players_max INTEGER,
  tags TEXT[] NOT NULL DEFAULT '{}',
  diagrams JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- 6. Migrar datos existentes: crear sección default "Parte Principal" y asignar session_exercises
DO $$
DECLARE
  rec RECORD;
  section_id UUID;
BEGIN
  FOR rec IN SELECT DISTINCT session_id FROM public.session_exercises LOOP
    INSERT INTO public.session_sections (session_id, name, sort_order)
    VALUES (rec.session_id, 'Parte Principal', 0)
    RETURNING id INTO section_id;

    UPDATE public.session_exercises
    SET section_id = section_id
    WHERE session_id = rec.session_id AND section_id IS NULL;
  END LOOP;
END $$;

-- 7. Índices
CREATE INDEX IF NOT EXISTS idx_session_sections_session ON public.session_sections(session_id);
CREATE INDEX IF NOT EXISTS idx_session_sections_order ON public.session_sections(session_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_session_exercises_section ON public.session_exercises(section_id);
CREATE INDEX IF NOT EXISTS idx_exercise_variants_exercise ON public.exercise_variants(exercise_id);

-- 8. RLS
ALTER TABLE public.session_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_variants ENABLE ROW LEVEL SECURITY;

-- Función auxiliar para crear políticas si no existen
CREATE OR REPLACE FUNCTION public.create_policy_if_not_exists(
  p_policy_name TEXT, p_table_name TEXT, p_policy_type TEXT,
  p_target_role TEXT, p_using_expr TEXT, p_check_expr TEXT
) RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = p_policy_name AND tablename = p_table_name
  ) THEN
    IF p_policy_type = 'SELECT' THEN
      EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO %s USING (%s)',
        p_policy_name, p_table_name, p_target_role, p_using_expr);
    ELSIF p_policy_type = 'INSERT' THEN
      EXECUTE format('CREATE POLICY %I ON %I FOR INSERT TO %s WITH CHECK (%s)',
        p_policy_name, p_table_name, p_target_role, p_check_expr);
    ELSIF p_policy_type = 'UPDATE' THEN
      EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE TO %s USING (%s)',
        p_policy_name, p_table_name, p_target_role, p_using_expr);
    ELSIF p_policy_type = 'DELETE' THEN
      EXECUTE format('CREATE POLICY %I ON %I FOR DELETE TO %s USING (%s)',
        p_policy_name, p_table_name, p_target_role, p_using_expr);
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Políticas para session_sections
SELECT public.create_policy_if_not_exists(
  'Members can view session sections', 'session_sections', 'SELECT', 'public',
  'EXISTS (SELECT 1 FROM public.club_members cm JOIN public.training_sessions ts ON ts.club_id = cm.club_id WHERE ts.id = session_sections.session_id AND cm.user_id = auth.uid())',
  NULL
);

SELECT public.create_policy_if_not_exists(
  'Members can insert session sections', 'session_sections', 'INSERT', 'public',
  NULL,
  'EXISTS (SELECT 1 FROM public.club_members cm JOIN public.training_sessions ts ON ts.club_id = cm.club_id WHERE ts.id = session_id AND cm.user_id = auth.uid())'
);

SELECT public.create_policy_if_not_exists(
  'Members can update session sections', 'session_sections', 'UPDATE', 'public',
  'EXISTS (SELECT 1 FROM public.club_members cm JOIN public.training_sessions ts ON ts.club_id = cm.club_id WHERE ts.id = session_sections.session_id AND cm.user_id = auth.uid())',
  NULL
);

SELECT public.create_policy_if_not_exists(
  'Members can delete session sections', 'session_sections', 'DELETE', 'public',
  'EXISTS (SELECT 1 FROM public.club_members cm JOIN public.training_sessions ts ON ts.club_id = cm.club_id WHERE ts.id = session_sections.session_id AND cm.user_id = auth.uid())',
  NULL
);

-- Políticas para exercise_variants
SELECT public.create_policy_if_not_exists(
  'Members can view exercise variants', 'exercise_variants', 'SELECT', 'public',
  'EXISTS (SELECT 1 FROM public.exercises e JOIN public.club_members cm ON cm.club_id = e.club_id WHERE e.id = exercise_variants.exercise_id AND cm.user_id = auth.uid())',
  NULL
);

SELECT public.create_policy_if_not_exists(
  'Members can insert exercise variants', 'exercise_variants', 'INSERT', 'public',
  NULL,
  'EXISTS (SELECT 1 FROM public.exercises e JOIN public.club_members cm ON cm.club_id = e.club_id WHERE e.id = exercise_id AND cm.user_id = auth.uid())'
);

SELECT public.create_policy_if_not_exists(
  'Members can update exercise variants', 'exercise_variants', 'UPDATE', 'public',
  'EXISTS (SELECT 1 FROM public.exercises e JOIN public.club_members cm ON cm.club_id = e.club_id WHERE e.id = exercise_variants.exercise_id AND cm.user_id = auth.uid())',
  NULL
);

SELECT public.create_policy_if_not_exists(
  'Members can delete exercise variants', 'exercise_variants', 'DELETE', 'public',
  'EXISTS (SELECT 1 FROM public.exercises e JOIN public.club_members cm ON cm.club_id = e.club_id WHERE e.id = exercise_variants.exercise_id AND cm.user_id = auth.uid())',
  NULL
);

-- Políticas INSERT/UPDATE/DELETE faltantes para ejercicios, sesiones y session_exercises
SELECT public.create_policy_if_not_exists(
  'Members can insert exercises', 'exercises', 'INSERT', 'public',
  NULL,
  'EXISTS (SELECT 1 FROM public.club_members WHERE club_id = exercises.club_id AND user_id = auth.uid())'
);

SELECT public.create_policy_if_not_exists(
  'Members can update exercises', 'exercises', 'UPDATE', 'public',
  'EXISTS (SELECT 1 FROM public.club_members WHERE club_id = exercises.club_id AND user_id = auth.uid())',
  NULL
);

SELECT public.create_policy_if_not_exists(
  'Members can delete exercises', 'exercises', 'DELETE', 'public',
  'EXISTS (SELECT 1 FROM public.club_members WHERE club_id = exercises.club_id AND user_id = auth.uid())',
  NULL
);

SELECT public.create_policy_if_not_exists(
  'Members can insert sessions', 'training_sessions', 'INSERT', 'public',
  NULL,
  'EXISTS (SELECT 1 FROM public.club_members WHERE club_id = training_sessions.club_id AND user_id = auth.uid())'
);

SELECT public.create_policy_if_not_exists(
  'Members can update sessions', 'training_sessions', 'UPDATE', 'public',
  'EXISTS (SELECT 1 FROM public.club_members WHERE club_id = training_sessions.club_id AND user_id = auth.uid())',
  NULL
);

SELECT public.create_policy_if_not_exists(
  'Members can delete sessions', 'training_sessions', 'DELETE', 'public',
  'EXISTS (SELECT 1 FROM public.club_members WHERE club_id = training_sessions.club_id AND user_id = auth.uid())',
  NULL
);

SELECT public.create_policy_if_not_exists(
  'Members can insert session exercises', 'session_exercises', 'INSERT', 'public',
  NULL,
  'EXISTS (SELECT 1 FROM public.training_sessions ts JOIN public.club_members cm ON cm.club_id = ts.club_id WHERE ts.id = session_id AND cm.user_id = auth.uid())'
);

SELECT public.create_policy_if_not_exists(
  'Members can update session exercises', 'session_exercises', 'UPDATE', 'public',
  'EXISTS (SELECT 1 FROM public.training_sessions ts JOIN public.club_members cm ON cm.club_id = ts.club_id WHERE ts.id = session_exercises.session_id AND cm.user_id = auth.uid())',
  NULL
);

SELECT public.create_policy_if_not_exists(
  'Members can delete session exercises', 'session_exercises', 'DELETE', 'public',
  'EXISTS (SELECT 1 FROM public.training_sessions ts JOIN public.club_members cm ON cm.club_id = ts.club_id WHERE ts.id = session_exercises.session_id AND cm.user_id = auth.uid())',
  NULL
);


-- ========== 004_playbooks_config.sql ==========

-- ============================================
-- BasketFlow - Playbooks extra config
-- ============================================

ALTER TABLE public.playbooks
  ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}'::jsonb;


-- ========== 005_rls_fixes.sql ==========

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


-- ========== 006_fix_club_members_rls.sql ==========

-- Fix infinite recursion in club_members RLS policy.
-- The old policy on club_members queried club_members itself, causing recursion.
-- Solution: SECURITY DEFINER helper that bypasses RLS for membership checks.

-- Helper function that bypasses RLS to check club membership
CREATE OR REPLACE FUNCTION public.is_club_member(_club_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.club_members cm WHERE cm.club_id = _club_id AND cm.user_id = _user_id);
$$;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Members can view club members" ON public.club_members;

-- Recreate using the helper function (no recursion because the function bypasses RLS)
CREATE POLICY "Members can view club members"
  ON public.club_members FOR SELECT
  USING (public.is_club_member(club_id, auth.uid()) OR user_id = auth.uid());


-- ========== 007_fix_session_exercises_rls.sql ==========

-- Fix RLS for session_exercises to use is_club_member helper
DROP POLICY IF EXISTS "Members can view session exercises" ON public.session_exercises;
DROP POLICY IF EXISTS "Members can insert session exercises" ON public.session_exercises;
DROP POLICY IF EXISTS "Members can update session exercises" ON public.session_exercises;
DROP POLICY IF EXISTS "Members can delete session exercises" ON public.session_exercises;

CREATE POLICY "Members can view session exercises" ON public.session_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.training_sessions ts
      WHERE ts.id = session_exercises.session_id AND public.is_club_member(ts.club_id, auth.uid())
    )
  );

CREATE POLICY "Members can insert session exercises" ON public.session_exercises FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.training_sessions ts
      WHERE ts.id = session_id AND public.is_club_member(ts.club_id, auth.uid())
    )
  );

CREATE POLICY "Members can update session exercises" ON public.session_exercises FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.training_sessions ts
      WHERE ts.id = session_exercises.session_id AND public.is_club_member(ts.club_id, auth.uid())
    )
  );

CREATE POLICY "Members can delete session exercises" ON public.session_exercises FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.training_sessions ts
      WHERE ts.id = session_exercises.session_id AND public.is_club_member(ts.club_id, auth.uid())
    )
  );


-- ========== 008_add_players.sql ==========

INSERT INTO public.players (team_id, first_name, last_name, jersey_number, position, is_active)
SELECT '44572254-9c8b-4f19-b67a-48c9dbe8fe52', first, last, num, pos, true
FROM (VALUES
  ('Carlos', 'García', 5, 'Base'),
  ('Pablo', 'López', 7, 'Escolta'),
  ('Javier', 'Martínez', 10, 'Alero'),
  ('Miguel', 'Rodríguez', 12, 'Ala-Pívot'),
  ('David', 'Fernández', 14, 'Pívot'),
  ('Alejandro', 'Sánchez', 4, 'Base'),
  ('Sergio', 'Díaz', 6, 'Escolta'),
  ('Daniel', 'Pérez', 8, 'Alero'),
  ('Manuel', 'González', 9, 'Ala-Pívot'),
  ('Adrián', 'Ruiz', 11, 'Pívot'),
  ('Álvaro', 'Hernández', 13, 'Base'),
  ('Iván', 'Jiménez', 15, 'Escolta'),
  ('Marcos', 'Álvarez', 16, 'Alero'),
  ('Raúl', 'Moreno', 18, 'Ala-Pívot'),
  ('Hugo', 'Muñoz', 20, 'Pívot')
) AS t(first, last, num, pos)
WHERE NOT EXISTS (
  SELECT 1 FROM public.players p
  WHERE p.team_id = '44572254-9c8b-4f19-b67a-48c9dbe8fe52' AND p.first_name = t.first AND p.last_name = t.last
);


-- ========== 009_manage_tags.sql ==========

CREATE OR REPLACE FUNCTION remove_tag_from_exercises(tag_name TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE exercises SET tags = array_remove(tags, tag_name) WHERE tag_name = ANY(tags);
  UPDATE exercise_variants SET tags = array_remove(tags, tag_name) WHERE tag_name = ANY(tags);
END;
$$;


-- ========== 010_roles_and_permissions.sql ==========

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


-- ========== 011_possessions_system.sql ==========

-- Migration 011: Possession-based match analysis system
-- Adds tables for possession-based tracking: matches, catalogs, possessions, substitutions

-- 1. Matches (extends beyond game_stats for possession tracking)
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    rival TEXT NOT NULL,
    competition TEXT,
    round TEXT,
    location TEXT,
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'in_progress', 'finished', 'closed')),
    current_period INTEGER DEFAULT 1,
    score_own INTEGER DEFAULT 0,
    score_rival INTEGER DEFAULT 0,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_matches_club ON matches(club_id);
CREATE INDEX idx_matches_team ON matches(team_id);
CREATE INDEX idx_matches_date ON matches(date DESC);

-- 2. Configuration catalogs (team-specific)
CREATE TABLE catalog_attack_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    short_name TEXT,
    color TEXT DEFAULT '#6366f1',
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(club_id, name)
);

CREATE TABLE catalog_systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    short_name TEXT,
    color TEXT DEFAULT '#8b5cf6',
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(club_id, name)
);

CREATE TABLE catalog_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    short_name TEXT,
    points INTEGER NOT NULL DEFAULT 0,
    is_miss BOOLEAN DEFAULT false,
    is_turnover BOOLEAN DEFAULT false,
    is_foul_drawn BOOLEAN DEFAULT false,
    color TEXT DEFAULT '#10b981',
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(club_id, name)
);

CREATE TABLE catalog_init_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    short_name TEXT,
    color TEXT DEFAULT '#f59e0b',
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(club_id, name)
);

CREATE TABLE catalog_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6b7280',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(club_id, name)
);

-- 3. Match squads
CREATE TABLE match_squads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    starter BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(match_id, player_id)
);

-- 4. Substitutions
CREATE TABLE match_substitutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_out UUID NOT NULL REFERENCES players(id),
    player_in UUID NOT NULL REFERENCES players(id),
    period INTEGER NOT NULL,
    order_in_period INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_substitutions_match ON match_substitutions(match_id);

-- 5. Possessions (core table)
CREATE TABLE possessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    period INTEGER NOT NULL CHECK (period >= 1),
    number INTEGER NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('own', 'rival')),
    init_type_id UUID NOT NULL REFERENCES catalog_init_types(id),
    attack_type_id UUID NOT NULL REFERENCES catalog_attack_types(id),
    system_id UUID REFERENCES catalog_systems(id),
    result_id UUID NOT NULL REFERENCES catalog_results(id),
    finisher_id UUID REFERENCES players(id),
    creator_id UUID REFERENCES players(id),
    time_bucket TEXT NOT NULL CHECK (time_bucket IN ('0-8', '9-16', '17-24')),
    points INTEGER NOT NULL DEFAULT 0 CHECK (points IN (0, 1, 2, 3, 4)),
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    video_timestamp NUMERIC(10,3),
    deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_possessions_match ON possessions(match_id);
CREATE INDEX idx_possessions_side ON possessions(match_id, side);
CREATE INDEX idx_possessions_system ON possessions(system_id);
CREATE INDEX idx_possessions_attack ON possessions(attack_type_id);
CREATE INDEX idx_possessions_video ON possessions(video_timestamp) WHERE video_timestamp IS NOT NULL;

-- 6. Seed data function
CREATE OR REPLACE FUNCTION seed_match_catalogs(p_club_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Init types
    INSERT INTO catalog_init_types (club_id, name, short_name, color, sort_order) VALUES
        (p_club_id, 'Saque inicial', 'SI', '#f59e0b', 1),
        (p_club_id, 'Saque de fondo', 'SF', '#f59e0b', 2),
        (p_club_id, 'Rebote defensivo', 'RD', '#f59e0b', 3),
        (p_club_id, 'Rebote ofensivo', 'RO', '#f59e0b', 4),
        (p_club_id, 'Robo', 'RB', '#f59e0b', 5),
        (p_club_id, 'Tiro libre', 'TL', '#f59e0b', 6)
    ON CONFLICT (club_id, name) DO NOTHING;

    -- Attack types
    INSERT INTO catalog_attack_types (club_id, name, short_name, color, sort_order) VALUES
        (p_club_id, 'Contraataque', 'CA', '#6366f1', 1),
        (p_club_id, 'Transición', 'TR', '#6366f1', 2),
        (p_club_id, 'Estático', 'ES', '#6366f1', 3),
        (p_club_id, 'Saque', 'SQ', '#6366f1', 4),
        (p_club_id, 'Rebote ofensivo', 'RO', '#6366f1', 5)
    ON CONFLICT (club_id, name) DO NOTHING;

    -- Results
    INSERT INTO catalog_results (club_id, name, short_name, points, is_miss, is_turnover, is_foul_drawn, color, sort_order) VALUES
        (p_club_id, 'T2 anotado', '2P', 2, false, false, false, '#10b981', 1),
        (p_club_id, 'T2 fallado', '2F', 0, true, false, false, '#ef4444', 2),
        (p_club_id, 'T3 anotado', '3P', 3, false, false, false, '#10b981', 3),
        (p_club_id, 'T3 fallado', '3F', 0, true, false, false, '#ef4444', 4),
        (p_club_id, 'TL anotado', 'TL+', 1, false, false, false, '#10b981', 5),
        (p_club_id, 'TL fallado', 'TL-', 0, true, false, false, '#ef4444', 6),
        (p_club_id, 'Pérdida', 'PER', 0, false, true, false, '#ef4444', 7),
        (p_club_id, 'Falta recibida', 'FAL', 0, false, false, true, '#3b82f6', 8),
        (p_club_id, 'Final periodo', 'FP', 0, false, false, false, '#6b7280', 9)
    ON CONFLICT (club_id, name) DO NOTHING;

    -- Systems
    INSERT INTO catalog_systems (club_id, name, short_name, color, sort_order) VALUES
        (p_club_id, 'Horns', 'HR', '#8b5cf6', 1),
        (p_club_id, 'Flex', 'FX', '#8b5cf6', 2),
        (p_club_id, 'Spain', 'SP', '#8b5cf6', 3),
        (p_club_id, 'Delay', 'DL', '#8b5cf6', 4),
        (p_club_id, 'Motion', 'MT', '#8b5cf6', 5),
        (p_club_id, 'Dribble Drive', 'DD', '#8b5cf6', 6),
        (p_club_id, 'Pick and Roll', 'PNR', '#8b5cf6', 7),
        (p_club_id, 'Aclarado', 'AC', '#8b5cf6', 8)
    ON CONFLICT (club_id, name) DO NOTHING;
END;
$$;

-- 7. View: match summary
CREATE OR REPLACE VIEW v_match_summary AS
SELECT
    m.id AS match_id,
    m.club_id,
    m.team_id,
    m.rival,
    m.date,
    m.status,
    m.score_own,
    m.score_rival,
    m.current_period,
    COUNT(p.id) FILTER (WHERE p.side = 'own' AND NOT p.deleted) AS own_possessions,
    COUNT(p.id) FILTER (WHERE p.side = 'rival' AND NOT p.deleted) AS rival_possessions,
    COALESCE(SUM(p.points) FILTER (WHERE p.side = 'own' AND NOT p.deleted), 0) AS calculated_score_own,
    COALESCE(SUM(p.points) FILTER (WHERE p.side = 'rival' AND NOT p.deleted), 0) AS calculated_score_rival,
    ROUND(
        COALESCE(SUM(p.points) FILTER (WHERE p.side = 'own' AND NOT p.deleted), 0)::numeric /
        NULLIF(COUNT(p.id) FILTER (WHERE p.side = 'own' AND NOT p.deleted), 0), 2
    ) AS own_ppp,
    ROUND(
        COALESCE(SUM(p.points) FILTER (WHERE p.side = 'rival' AND NOT p.deleted), 0)::numeric /
        NULLIF(COUNT(p.id) FILTER (WHERE p.side = 'rival' AND NOT p.deleted), 0), 2
    ) AS rival_ppp
FROM matches m
LEFT JOIN possessions p ON p.match_id = m.id AND NOT p.deleted
GROUP BY m.id;

-- 8. RLS policies
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_attack_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_init_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_substitutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE possessions ENABLE ROW LEVEL SECURITY;

-- Helper: check club membership
CREATE OR REPLACE FUNCTION is_club_member_match(club_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM club_members
        WHERE club_members.club_id = $1
        AND club_members.user_id = auth.uid()
    );
END;
$$;

-- Match policies
CREATE POLICY "Club members can read matches"
    ON matches FOR SELECT
    USING (is_club_member_match(club_id));

CREATE POLICY "Club members can insert matches"
    ON matches FOR INSERT
    WITH CHECK (is_club_member_match(club_id));

CREATE POLICY "Club members can update matches"
    ON matches FOR UPDATE
    USING (is_club_member_match(club_id));

CREATE POLICY "Club members can delete matches"
    ON matches FOR DELETE
    USING (is_club_member_match(club_id));

-- Catalog policies
CREATE POLICY "Club members can read catalogs"
    ON catalog_attack_types FOR SELECT
    USING (is_club_member_match(club_id));

CREATE POLICY "Club members can write catalogs"
    ON catalog_attack_types FOR INSERT
    WITH CHECK (is_club_member_match(club_id));

CREATE POLICY "Club members can update catalogs"
    ON catalog_attack_types FOR UPDATE
    USING (is_club_member_match(club_id));

CREATE POLICY "Club members can delete catalogs"
    ON catalog_attack_types FOR DELETE
    USING (is_club_member_match(club_id));

-- Same for other catalog tables
CREATE POLICY "Club members can read catalog_systems"
    ON catalog_systems FOR SELECT
    USING (is_club_member_match(club_id));

CREATE POLICY "Club members can write catalog_systems"
    ON catalog_systems FOR INSERT
    WITH CHECK (is_club_member_match(club_id));

CREATE POLICY "Club members can update catalog_systems"
    ON catalog_systems FOR UPDATE
    USING (is_club_member_match(club_id));

CREATE POLICY "Club members can delete catalog_systems"
    ON catalog_systems FOR DELETE
    USING (is_club_member_match(club_id));

CREATE POLICY "Club members can read catalog_results"
    ON catalog_results FOR SELECT
    USING (is_club_member_match(club_id));

CREATE POLICY "Club members can write catalog_results"
    ON catalog_results FOR INSERT
    WITH CHECK (is_club_member_match(club_id));

CREATE POLICY "Club members can update catalog_results"
    ON catalog_results FOR UPDATE
    USING (is_club_member_match(club_id));

CREATE POLICY "Club members can delete catalog_results"
    ON catalog_results FOR DELETE
    USING (is_club_member_match(club_id));

CREATE POLICY "Club members can read catalog_init_types"
    ON catalog_init_types FOR SELECT
    USING (is_club_member_match(club_id));

CREATE POLICY "Club members can write catalog_init_types"
    ON catalog_init_types FOR INSERT
    WITH CHECK (is_club_member_match(club_id));

CREATE POLICY "Club members can update catalog_init_types"
    ON catalog_init_types FOR UPDATE
    USING (is_club_member_match(club_id));

CREATE POLICY "Club members can delete catalog_init_types"
    ON catalog_init_types FOR DELETE
    USING (is_club_member_match(club_id));

CREATE POLICY "Club members can read catalog_tags"
    ON catalog_tags FOR SELECT
    USING (is_club_member_match(club_id));

CREATE POLICY "Club members can write catalog_tags"
    ON catalog_tags FOR INSERT
    WITH CHECK (is_club_member_match(club_id));

CREATE POLICY "Club members can update catalog_tags"
    ON catalog_tags FOR UPDATE
    USING (is_club_member_match(club_id));

CREATE POLICY "Club members can delete catalog_tags"
    ON catalog_tags FOR DELETE
    USING (is_club_member_match(club_id));

-- Match squads policies
CREATE POLICY "Club members can read match_squads"
    ON match_squads FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM matches WHERE matches.id = match_squads.match_id
        AND is_club_member_match(matches.club_id)
    ));

CREATE POLICY "Club members can write match_squads"
    ON match_squads FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM matches WHERE matches.id = match_squads.match_id
        AND is_club_member_match(matches.club_id)
    ));

CREATE POLICY "Club members can delete match_squads"
    ON match_squads FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM matches WHERE matches.id = match_squads.match_id
        AND is_club_member_match(matches.club_id)
    ));

-- Substitutions policies
CREATE POLICY "Club members can read substitutions"
    ON match_substitutions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM matches WHERE matches.id = match_substitutions.match_id
        AND is_club_member_match(matches.club_id)
    ));

CREATE POLICY "Club members can write substitutions"
    ON match_substitutions FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM matches WHERE matches.id = match_substitutions.match_id
        AND is_club_member_match(matches.club_id)
    ));

CREATE POLICY "Club members can delete substitutions"
    ON match_substitutions FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM matches WHERE matches.id = match_substitutions.match_id
        AND is_club_member_match(matches.club_id)
    ));

-- Possessions policies
CREATE POLICY "Club members can read possessions"
    ON possessions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM matches WHERE matches.id = possessions.match_id
        AND is_club_member_match(matches.club_id)
    ));

CREATE POLICY "Club members can insert possessions"
    ON possessions FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM matches WHERE matches.id = possessions.match_id
        AND is_club_member_match(matches.club_id)
    ));

CREATE POLICY "Club members can update possessions"
    ON possessions FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM matches WHERE matches.id = possessions.match_id
        AND is_club_member_match(matches.club_id)
    ));

CREATE POLICY "Club members can delete possessions"
    ON possessions FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM matches WHERE matches.id = possessions.match_id
        AND is_club_member_match(matches.club_id)
    ));

-- 9. Triggers for updated_at
CREATE TRIGGER set_matches_updated_at
    BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_possessions_updated_at
    BEFORE UPDATE ON possessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. RPC: get lineup at a given point
CREATE OR REPLACE FUNCTION get_match_lineup(
    p_match_id UUID,
    p_period INTEGER DEFAULT 1,
    p_possession_number INTEGER DEFAULT 0
)
RETURNS TABLE (player_id UUID, player_name TEXT, jersey_number INTEGER, position TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH starting_five AS (
        SELECT ms.player_id
        FROM match_squads ms
        WHERE ms.match_id = p_match_id AND ms.starter = true
    ),
    subs_before AS (
        SELECT ms.player_out, ms.player_in
        FROM match_substitutions ms
        WHERE ms.match_id = p_match_id
          AND (ms.period < p_period
            OR (ms.period = p_period AND ms.order_in_period <= p_possession_number))
    ),
    player_changes AS (
        SELECT player_out AS pid, -1 AS delta FROM subs_before
        UNION ALL
        SELECT player_in AS pid, 1 AS delta FROM subs_before
    ),
    net_changes AS (
        SELECT pid, SUM(delta) AS net FROM player_changes GROUP BY pid
    )
    SELECT
        pl.id,
        pl.first_name || ' ' || pl.last_name,
        pl.jersey_number,
        pl.position
    FROM starting_five sf
    JOIN players pl ON pl.id = sf.player_id
    LEFT JOIN net_changes nc ON nc.pid = sf.player_id
    WHERE COALESCE(nc.net, 0) >= 0
    UNION
    SELECT
        pl.id,
        pl.first_name || ' ' || pl.last_name,
        pl.jersey_number,
        pl.position
    FROM net_changes nc
    JOIN players pl ON pl.id = nc.pid
    WHERE nc.net > 0;
END;
$$;

-- 11. RPC: match statistics
CREATE OR REPLACE FUNCTION get_match_stats(p_match_id UUID, p_side TEXT DEFAULT 'own')
RETURNS TABLE (
    metric TEXT,
    value NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 'possessions'::TEXT, COUNT(*)::NUMERIC
    FROM possessions WHERE match_id = p_match_id AND side = p_side AND NOT deleted
    UNION ALL
    SELECT 'points'::TEXT, COALESCE(SUM(points), 0)::NUMERIC
    FROM possessions WHERE match_id = p_match_id AND side = p_side AND NOT deleted
    UNION ALL
    SELECT 'ppp'::TEXT, ROUND(
        COALESCE(SUM(points), 0)::numeric / NULLIF(COUNT(*), 0), 2)
    FROM possessions WHERE match_id = p_match_id AND side = p_side AND NOT deleted;
END;
$$;


-- ========== 012_deprecate_game_stats.sql ==========

-- Migration 012: Deprecate game_stats and player_game_stats
-- Moves users from game_stats legacy tables to the new matches/possessions system

-- 1. Add is_home to matches for parity with game_stats
ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_home BOOLEAN DEFAULT false;

-- 2. Create compatibility view for legacy code
CREATE OR REPLACE VIEW v_game_stats_legacy AS
SELECT
  m.id,
  m.club_id,
  m.team_id,
  m.rival AS opponent,
  m.date::date AS date,
  NULL::text AS location,
  COALESCE(m.is_home, false) AS is_home,
  m.score_own AS our_score,
  m.score_rival AS opponent_score,
  m.notes,
  m.created_at
FROM matches m;

-- 3. Deprecate game_stats and player_game_stats (keep for data safety, remove in future)
-- These tables are no longer used by the application code.
-- They remain for historical data migration if needed.
COMMENT ON TABLE game_stats IS 'DEPRECATED — Use matches + possessions instead. Remove after data migration.';
COMMENT ON TABLE player_game_stats IS 'DEPRECATED — Use possessions instead. Remove after data migration.';
COMMENT ON COLUMN game_stats.our_score IS 'DEPRECATED — Use matches.score_own';
COMMENT ON COLUMN game_stats.opponent_score IS 'DEPRECATED — Use matches.score_rival';


-- ========== 013_indexes_and_constraints.sql ==========

-- Migration 013: Indexes, Foreign Keys, Soft Delete, Constraints

-- 1. Add FK for attendance and session_player_reviews (item 1.6)
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_player_id_fkey;
ALTER TABLE attendance ADD CONSTRAINT attendance_player_id_fkey
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;

ALTER TABLE session_player_reviews DROP CONSTRAINT IF EXISTS session_player_reviews_player_id_fkey;
ALTER TABLE session_player_reviews ADD CONSTRAINT session_player_reviews_player_id_fkey
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;

-- 2. Add UNIQUE constraint on session_exercises (session_id, section_id, order) (item 1.4)
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_exercises_unique_order
  ON session_exercises(session_id, section_id, "order");

-- 3. Soft delete columns (item 3.1)
ALTER TABLE players ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 4. Missing indexes (item 3.2)
CREATE INDEX IF NOT EXISTS idx_training_sessions_club_date
  ON training_sessions(club_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_possessions_match_period
  ON possessions(match_id, period, number);

CREATE INDEX IF NOT EXISTS idx_exercises_club_category
  ON exercises(club_id, category_id);

CREATE INDEX IF NOT EXISTS idx_evaluations_player_club
  ON evaluations(player_id, club_id, created_at DESC);

-- 5. Add mode column to playbooks (item 014)
ALTER TABLE playbooks ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'structured'
  CHECK (mode IN ('structured', 'freehand'));

-- 6. Add optional stats columns to possessions (item 015)
ALTER TABLE possessions ADD COLUMN IF NOT EXISTS rebounds INTEGER DEFAULT 0;
ALTER TABLE possessions ADD COLUMN IF NOT EXISTS assists INTEGER DEFAULT 0;
ALTER TABLE possessions ADD COLUMN IF NOT EXISTS turnovers INTEGER DEFAULT 0;
ALTER TABLE possessions ADD COLUMN IF NOT EXISTS fouls INTEGER DEFAULT 0;

-- 7. Add FK from training_sessions to microcycles (placeholder, actual table created in 017)
-- No-op: FK will be added by migration 017_planning


-- ========== 014_player_summary_rpc.sql ==========

-- Create get_player_summary RPC for consolidated player dashboard
CREATE OR REPLACE FUNCTION public.get_player_summary(p_player_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'player', row_to_json(p.*)::jsonb,
    'evaluations', COALESCE(
      (SELECT jsonb_agg(row_to_json(e.*)::jsonb ORDER BY e.created_at DESC)
       FROM public.evaluations e WHERE e.player_id = p_player_id),
      '[]'::jsonb
    ),
    'session_reviews', COALESCE(
      (SELECT jsonb_agg(
         jsonb_build_object(
           'review', row_to_json(spr.*)::jsonb,
           'session_title', ts.title,
           'session_date', ts.date
         ) ORDER BY ts.date DESC
       )
       FROM public.session_player_reviews spr
       JOIN public.training_sessions ts ON ts.id = spr.session_id
       WHERE spr.player_id = p_player_id),
      '[]'::jsonb
    ),
    'avg_rating', (
      SELECT jsonb_build_object(
        'shooting', COALESCE(AVG(shooting), 0),
        'dribbling', COALESCE(AVG(dribbling), 0),
        'passing', COALESCE(AVG(passing), 0),
        'defense', COALESCE(AVG(defense), 0),
        'rebounding', COALESCE(AVG(rebounding), 0),
        'basketball_iq', COALESCE(AVG(iq), 0),
        'athleticism', COALESCE(AVG(athleticism), 0),
        'teamwork', COALESCE(AVG(teamwork), 0),
        'attitude', COALESCE(AVG(attitude), 0)
      )
      FROM public.evaluations WHERE player_id = p_player_id
    )
  ) INTO result
  FROM public.players p WHERE p.id = p_player_id;

  RETURN result;
END;
$$;


-- ========== 016_saas_subscriptions.sql ==========

-- SaaS: subscription plans, club subscriptions, and feature flags

-- 1. Subscription plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_monthly NUMERIC NOT NULL DEFAULT 0,
  price_yearly NUMERIC NOT NULL DEFAULT 0,
  max_clubs INTEGER NOT NULL DEFAULT 1,
  max_players INTEGER NOT NULL DEFAULT 0,
  max_teams INTEGER NOT NULL DEFAULT 0,
  feature_match_analysis BOOLEAN NOT NULL DEFAULT false,
  feature_planning BOOLEAN NOT NULL DEFAULT false,
  feature_tactics BOOLEAN NOT NULL DEFAULT false,
  feature_evaluations BOOLEAN NOT NULL DEFAULT false,
  feature_advanced_stats BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Club subscriptions
CREATE TABLE IF NOT EXISTS public.club_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'expired')),
  trial_end_date TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_club_subscriptions_active ON public.club_subscriptions(club_id) WHERE status IN ('active', 'trialing');

-- 3. v_club_features view
CREATE OR REPLACE VIEW public.v_club_features AS
SELECT
  c.id AS club_id,
  c.name AS club_name,
  COALESCE(sp.feature_match_analysis, false) AS has_match_analysis,
  COALESCE(sp.feature_planning, false) AS has_planning,
  COALESCE(sp.feature_tactics, false) AS has_tactics,
  COALESCE(sp.feature_evaluations, false) AS has_evaluations,
  COALESCE(sp.feature_advanced_stats, false) AS has_advanced_stats,
  COALESCE(sp.max_players, 0) AS max_players,
  COALESCE(sp.max_teams, 0) AS max_teams,
  sp.name AS plan_name,
  cs.status AS subscription_status
FROM public.clubs c
LEFT JOIN public.club_subscriptions cs ON cs.club_id = c.id
LEFT JOIN public.subscription_plans sp ON sp.id = cs.plan_id;

-- 4. Trigger: enforce single club_admin per club
CREATE OR REPLACE FUNCTION public.enforce_single_club_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.role = 'club_admin' THEN
    IF EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_id = NEW.club_id AND role = 'club_admin' AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
    ) THEN
      RAISE EXCEPTION 'Club already has an admin' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_single_club_admin ON public.club_members;
CREATE TRIGGER trg_enforce_single_club_admin
  BEFORE INSERT OR UPDATE ON public.club_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_club_admin();

-- 5. Default plans
INSERT INTO public.subscription_plans (name, slug, description, price_monthly, price_yearly, max_clubs, max_players, max_teams, feature_match_analysis, feature_planning, feature_tactics, feature_evaluations, feature_advanced_stats, sort_order, is_active)
VALUES
  ('Gratuito', 'free', 'Plan gratuito para probar la plataforma', 0, 0, 1, 15, 2, false, false, true, false, false, 0, true),
  ('Starter', 'starter', 'Para entrenadores individuales', 9.99, 99.99, 1, 30, 4, true, true, true, true, false, 1, true),
  ('Pro', 'pro', 'Para clubes pequeños y medianos', 24.99, 249.99, 3, 100, 10, true, true, true, true, true, 2, true),
  ('Elite', 'elite', 'Para clubes profesionales', 49.99, 499.99, 10, 500, 50, true, true, true, true, true, 3, true)
ON CONFLICT (slug) DO NOTHING;

-- 6. RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read subscription plans" ON public.subscription_plans;
CREATE POLICY "Anyone can read subscription plans" ON public.subscription_plans FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Superadmin can manage subscription plans" ON public.subscription_plans;
CREATE POLICY "Superadmin can manage subscription plans" ON public.subscription_plans FOR ALL
  USING (public.is_superadmin());

DROP POLICY IF EXISTS "Club members can read club subscriptions" ON public.club_subscriptions;
CREATE POLICY "Club members can read club subscriptions" ON public.club_subscriptions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.club_members WHERE club_id = club_subscriptions.club_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Superadmin can manage club subscriptions" ON public.club_subscriptions;
CREATE POLICY "Superadmin can manage club subscriptions" ON public.club_subscriptions FOR ALL
  USING (public.is_superadmin());


-- ========== 017_planning.sql ==========

-- Planning system: macrocycles, mesocycles, microcycles, objectives

-- 1. Macrocycles (season-level planning)
CREATE TABLE IF NOT EXISTS public.macrocycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  goals TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Mesocycles (training blocks)
CREATE TABLE IF NOT EXISTS public.mesocycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  macrocycle_id UUID NOT NULL REFERENCES public.macrocycles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  phase TEXT NOT NULL CHECK (phase IN ('preseason', 'competition', 'peak', 'transition', 'rest', 'special')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  tactical_goals TEXT,
  technical_goals TEXT,
  physical_goals TEXT,
  intensity INTEGER NOT NULL DEFAULT 5 CHECK (intensity >= 1 AND intensity <= 10),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Microcycles (weekly planning)
CREATE TABLE IF NOT EXISTS public.microcycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesocycle_id UUID NOT NULL REFERENCES public.mesocycles(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  focus TEXT,
  load_distribution JSONB DEFAULT '{}'::jsonb,
  planned_sessions INTEGER NOT NULL DEFAULT 3,
  has_match BOOLEAN NOT NULL DEFAULT false,
  match_day DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tactical objective catalog (reusable)
CREATE TABLE IF NOT EXISTS public.tactical_objective_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  area TEXT NOT NULL CHECK (area IN ('offense', 'defense', 'transition', 'special_situations')),
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Objective achievements (tracking)
CREATE TABLE IF NOT EXISTS public.objective_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES public.tactical_objective_catalog(id) ON DELETE CASCADE,
  mesocycle_id UUID REFERENCES public.mesocycles(id) ON DELETE CASCADE,
  microcycle_id UUID REFERENCES public.microcycles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  achievement_level INTEGER NOT NULL DEFAULT 0 CHECK (achievement_level >= 0 AND achievement_level <= 10),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. FK: training_sessions -> microcycles
ALTER TABLE public.training_sessions ADD COLUMN IF NOT EXISTS microcycle_id UUID REFERENCES public.microcycles(id) ON DELETE SET NULL;

-- 7. Views
CREATE OR REPLACE VIEW public.v_macrocycle_summary AS
SELECT
  m.id AS macrocycle_id,
  m.name,
  m.start_date,
  m.end_date,
  m.status,
  COUNT(DISTINCT me.id) AS mesocycle_count,
  COUNT(DISTINCT mi.id) AS microcycle_count,
  COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'completed') AS completed_sessions,
  COUNT(DISTINCT s.id) AS total_sessions
FROM public.macrocycles m
LEFT JOIN public.mesocycles me ON me.macrocycle_id = m.id
LEFT JOIN public.microcycles mi ON mi.mesocycle_id = me.id
LEFT JOIN public.training_sessions s ON s.microcycle_id = mi.id
GROUP BY m.id;

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_macrocycles_club ON public.macrocycles(club_id);
CREATE INDEX IF NOT EXISTS idx_macrocycles_team ON public.macrocycles(team_id);
CREATE INDEX IF NOT EXISTS idx_mesocycles_macro ON public.mesocycles(macrocycle_id);
CREATE INDEX IF NOT EXISTS idx_microcycles_meso ON public.microcycles(mesocycle_id);
CREATE INDEX IF NOT EXISTS idx_objective_achievements_obj ON public.objective_achievements(objective_id);
CREATE INDEX IF NOT EXISTS idx_objective_achievements_micro ON public.objective_achievements(microcycle_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_microcycle ON public.training_sessions(microcycle_id);

-- 9. RLS
ALTER TABLE public.macrocycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mesocycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.microcycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tactical_objective_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objective_achievements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Macrocycles
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'macrocycles' AND policyname = 'Club members can read macrocycles') THEN
    CREATE POLICY "Club members can read macrocycles" ON public.macrocycles FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.club_members WHERE club_id = macrocycles.club_id AND user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'macrocycles' AND policyname = 'Club members can manage macrocycles') THEN
    CREATE POLICY "Club members can manage macrocycles" ON public.macrocycles FOR ALL
      USING (EXISTS (SELECT 1 FROM public.club_members WHERE club_id = macrocycles.club_id AND user_id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.club_members WHERE club_id = macrocycles.club_id AND user_id = auth.uid()));
  END IF;

  -- Mesocycles
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mesocycles' AND policyname = 'Club members can read mesocycles') THEN
    CREATE POLICY "Club members can read mesocycles" ON public.mesocycles FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.macrocycles mc
        JOIN public.club_members cm ON cm.club_id = mc.club_id
        WHERE mc.id = mesocycles.macrocycle_id AND cm.user_id = auth.uid()
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mesocycles' AND policyname = 'Club members can manage mesocycles') THEN
    CREATE POLICY "Club members can manage mesocycles" ON public.mesocycles FOR ALL
      USING (EXISTS (
        SELECT 1 FROM public.macrocycles mc
        JOIN public.club_members cm ON cm.club_id = mc.club_id
        WHERE mc.id = mesocycles.macrocycle_id AND cm.user_id = auth.uid()
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.macrocycles mc
        JOIN public.club_members cm ON cm.club_id = mc.club_id
        WHERE mc.id = mesocycles.macrocycle_id AND cm.user_id = auth.uid()
      ));
  END IF;

  -- Microcycles
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'microcycles' AND policyname = 'Club members can read microcycles') THEN
    CREATE POLICY "Club members can read microcycles" ON public.microcycles FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.mesocycles me
        JOIN public.macrocycles mc ON mc.id = me.macrocycle_id
        JOIN public.club_members cm ON cm.club_id = mc.club_id
        WHERE me.id = microcycles.mesocycle_id AND cm.user_id = auth.uid()
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'microcycles' AND policyname = 'Club members can manage microcycles') THEN
    CREATE POLICY "Club members can manage microcycles" ON public.microcycles FOR ALL
      USING (EXISTS (
        SELECT 1 FROM public.mesocycles me
        JOIN public.macrocycles mc ON mc.id = me.macrocycle_id
        JOIN public.club_members cm ON cm.club_id = mc.club_id
        WHERE me.id = microcycles.mesocycle_id AND cm.user_id = auth.uid()
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.mesocycles me
        JOIN public.macrocycles mc ON mc.id = me.macrocycle_id
        JOIN public.club_members cm ON cm.club_id = mc.club_id
        WHERE me.id = microcycles.mesocycle_id AND cm.user_id = auth.uid()
      ));
  END IF;

  -- Tactical objective catalog
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tactical_objective_catalog' AND policyname = 'Club members can read tactical objectives') THEN
    CREATE POLICY "Club members can read tactical objectives" ON public.tactical_objective_catalog FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.club_members WHERE club_id = tactical_objective_catalog.club_id AND user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tactical_objective_catalog' AND policyname = 'Club members can manage tactical objectives') THEN
    CREATE POLICY "Club members can manage tactical objectives" ON public.tactical_objective_catalog FOR ALL
      USING (EXISTS (SELECT 1 FROM public.club_members WHERE club_id = tactical_objective_catalog.club_id AND user_id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.club_members WHERE club_id = tactical_objective_catalog.club_id AND user_id = auth.uid()));
  END IF;

  -- Objective achievements
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objective_achievements' AND policyname = 'Club members can read objective achievements') THEN
    CREATE POLICY "Club members can read objective achievements" ON public.objective_achievements FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.tactical_objective_catalog toc
        JOIN public.club_members cm ON cm.club_id = toc.club_id
        WHERE toc.id = objective_achievements.objective_id AND cm.user_id = auth.uid()
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objective_achievements' AND policyname = 'Club members can manage objective achievements') THEN
    CREATE POLICY "Club members can manage objective achievements" ON public.objective_achievements FOR ALL
      USING (EXISTS (
        SELECT 1 FROM public.tactical_objective_catalog toc
        JOIN public.club_members cm ON cm.club_id = toc.club_id
        WHERE toc.id = objective_achievements.objective_id AND cm.user_id = auth.uid()
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.tactical_objective_catalog toc
        JOIN public.club_members cm ON cm.club_id = toc.club_id
        WHERE toc.id = objective_achievements.objective_id AND cm.user_id = auth.uid()
      ));
  END IF;
END;
$$;


-- ========== 018_evaluation_text_fields.sql ==========

-- Add notes text field to evaluations
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS notes TEXT;


-- ========== 019_single_player_review.sql ==========

-- Consolidate session_player_reviews: combine effort/performance/attitude into comments
-- First, migrate existing data: concatenate into comments
UPDATE session_player_reviews 
SET comments = TRIM(
  CASE WHEN effort IS NOT NULL AND effort != '' THEN 'Esfuerzo: ' || effort || E'\n' ELSE '' END ||
  CASE WHEN performance IS NOT NULL AND performance != '' THEN 'Rendimiento: ' || performance || E'\n' ELSE '' END ||
  CASE WHEN attitude IS NOT NULL AND attitude != '' THEN 'Actitud: ' || attitude ELSE '' END
)
WHERE comments IS NULL OR comments = '';

UPDATE session_player_reviews 
SET comments = TRIM(
  CASE WHEN effort IS NOT NULL AND effort != '' THEN 'Esfuerzo: ' || effort || E'\n' ELSE '' END ||
  CASE WHEN performance IS NOT NULL AND performance != '' THEN 'Rendimiento: ' || performance || E'\n' ELSE '' END ||
  CASE WHEN attitude IS NOT NULL AND attitude != '' THEN 'Actitud: ' || attitude ELSE '' END || E'\n' ||
  comments
)
WHERE comments IS NOT NULL AND comments != '';

-- Drop old columns
ALTER TABLE session_player_reviews DROP COLUMN IF EXISTS effort;
ALTER TABLE session_player_reviews DROP COLUMN IF EXISTS performance;
ALTER TABLE session_player_reviews DROP COLUMN IF EXISTS attitude;

-- Make comments NOT NULL with default empty string
ALTER TABLE session_player_reviews ALTER COLUMN comments SET DEFAULT '';
UPDATE session_player_reviews SET comments = '' WHERE comments IS NULL;
ALTER TABLE session_player_reviews ALTER COLUMN comments SET NOT NULL;


-- ========== 020_tags_many_to_many.sql ==========

-- Create tags table
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#4f6ef7',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(club_id, name)
);

-- Create exercise_tags junction table
CREATE TABLE exercise_tags (
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (exercise_id, tag_id)
);

-- Migrate existing data from exercises.tags[]
INSERT INTO tags (club_id, name)
SELECT DISTINCT e.club_id, unnest(e.tags)
FROM exercises e
WHERE e.tags IS NOT NULL AND array_length(e.tags, 1) > 0;

INSERT INTO exercise_tags (exercise_id, tag_id)
SELECT e.id, t.id
FROM exercises e
CROSS JOIN LATERAL unnest(e.tags) AS tag_name
JOIN tags t ON t.club_id = e.club_id AND t.name = tag_name;

-- Remove old column
ALTER TABLE exercises DROP COLUMN IF EXISTS tags;

-- Update the RPC function to work with the new schema
CREATE OR REPLACE FUNCTION remove_tag_from_exercises(tag_name TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM tags WHERE name = tag_name;
  UPDATE exercise_variants SET tags = array_remove(tags, tag_name) WHERE tag_name = ANY(tags);
END;
$$;

-- RLS policies
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read tags in their clubs"
  ON tags FOR SELECT USING (
    EXISTS (SELECT 1 FROM club_members WHERE club_id = tags.club_id AND user_id = auth.uid())
  );

CREATE POLICY "coaches can manage tags in their clubs"
  ON tags FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM club_members WHERE club_id = tags.club_id AND user_id = auth.uid() AND role IN ('admin', 'coach'))
  );

CREATE POLICY "coaches can update tags in their clubs"
  ON tags FOR UPDATE USING (
    EXISTS (SELECT 1 FROM club_members WHERE club_id = tags.club_id AND user_id = auth.uid() AND role IN ('admin', 'coach'))
  );

CREATE POLICY "coaches can delete tags in their clubs"
  ON tags FOR DELETE USING (
    EXISTS (SELECT 1 FROM club_members WHERE club_id = tags.club_id AND user_id = auth.uid() AND role IN ('admin', 'coach'))
  );

CREATE POLICY "users can read exercise_tags in their clubs"
  ON exercise_tags FOR SELECT USING (
    EXISTS (SELECT 1 FROM exercises e JOIN club_members cm ON cm.club_id = e.club_id WHERE e.id = exercise_id AND cm.user_id = auth.uid())
  );

CREATE POLICY "coaches can manage exercise_tags"
  ON exercise_tags FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM exercises e JOIN club_members cm ON cm.club_id = e.club_id WHERE e.id = exercise_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'coach'))
  );

CREATE POLICY "coaches can delete exercise_tags"
  ON exercise_tags FOR DELETE USING (
    EXISTS (SELECT 1 FROM exercises e JOIN club_members cm ON cm.club_id = e.club_id WHERE e.id = exercise_id AND cm.user_id = auth.uid() AND cm.role IN ('admin', 'coach'))
  );


-- ========== 021_soft_delete.sql ==========

-- Add soft delete columns to players, exercises, and training_sessions
ALTER TABLE players ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Update RLS policies to exclude soft-deleted rows (optional, handled at app level)
CREATE INDEX IF NOT EXISTS idx_players_deleted_at ON players(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_exercises_deleted_at ON exercises(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_training_sessions_deleted_at ON training_sessions(deleted_at) WHERE deleted_at IS NULL;


-- ========== 022_possessions_stats.sql ==========

-- Add optional per-possession stat columns
ALTER TABLE possessions ADD COLUMN IF NOT EXISTS rebounds INTEGER DEFAULT 0;
ALTER TABLE possessions ADD COLUMN IF NOT EXISTS assists INTEGER DEFAULT 0;
ALTER TABLE possessions ADD COLUMN IF NOT EXISTS turnovers INTEGER DEFAULT 0;
ALTER TABLE possessions ADD COLUMN IF NOT EXISTS fouls INTEGER DEFAULT 0;


-- ========== 023_add_injured_attendance.sql ==========

-- Add 'injured' status to attendance CHECK constraint
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_status_check;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_status_check
  CHECK (status IN ('present', 'absent', 'late', 'excused', 'injured'));

