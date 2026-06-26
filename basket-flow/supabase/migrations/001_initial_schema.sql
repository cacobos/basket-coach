-- ============================================
-- BasketFlow - Esquema Inicial de Base de Datos
-- ============================================

-- 1. PROFILES (extiende auth.users de Supabase)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. CLUBS
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(id)
);

-- 3. CLUB MEMBERS
CREATE TABLE public.club_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'coach', 'assistant')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(club_id, user_id)
);

-- 4. TEAMS
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  season TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. PLAYERS
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date DATE,
  jersey_number INTEGER,
  position TEXT,
  height NUMERIC(5,2),
  weight NUMERIC(5,2),
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. EXERCISE CATEGORIES
CREATE TABLE public.exercise_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#1976d2',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. EXERCISES
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.exercise_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  objectives TEXT,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  duration_minutes INTEGER,
  players_min INTEGER,
  players_max INTEGER,
  diagram_url TEXT,
  video_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(id)
);

-- 8. TRAINING SESSIONS
CREATE TABLE public.training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('draft', 'planned', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(id)
);

-- 9. SESSION EXERCISES (ejercicios dentro de una sesión)
CREATE TABLE public.session_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. ATTENDANCE
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, player_id)
);

-- 11. GAME STATS (partidos)
CREATE TABLE public.game_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  opponent TEXT NOT NULL,
  date DATE NOT NULL,
  location TEXT,
  is_home BOOLEAN NOT NULL DEFAULT true,
  our_score INTEGER,
  opponent_score INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. PLAYER GAME STATS (estadísticas por jugador por partido)
CREATE TABLE public.player_game_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.game_stats(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  minutes_played NUMERIC(5,1) NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  rebounds INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  steals INTEGER NOT NULL DEFAULT 0,
  blocks INTEGER NOT NULL DEFAULT 0,
  turnovers INTEGER NOT NULL DEFAULT 0,
  fouls INTEGER NOT NULL DEFAULT 0,
  field_goals_made INTEGER NOT NULL DEFAULT 0,
  field_goals_attempted INTEGER NOT NULL DEFAULT 0,
  three_points_made INTEGER NOT NULL DEFAULT 0,
  three_points_attempted INTEGER NOT NULL DEFAULT 0,
  free_throws_made INTEGER NOT NULL DEFAULT 0,
  free_throws_attempted INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(game_id, player_id)
);

-- 13. EVALUATIONS
CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES public.profiles(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL CHECK (type IN ('internal', 'external')),
  shooting INTEGER CHECK (shooting >= 1 AND shooting <= 10),
  dribbling INTEGER CHECK (dribbling >= 1 AND dribbling <= 10),
  passing INTEGER CHECK (passing >= 1 AND passing <= 10),
  defense INTEGER CHECK (defense >= 1 AND defense <= 10),
  rebounding INTEGER CHECK (rebounding >= 1 AND rebounding <= 10),
  iq INTEGER CHECK (iq >= 1 AND iq <= 10),
  athleticism INTEGER CHECK (athleticism >= 1 AND athleticism <= 10),
  teamwork INTEGER CHECK (teamwork >= 1 AND teamwork <= 10),
  attitude INTEGER CHECK (attitude >= 1 AND attitude <= 10),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX idx_club_members_user ON public.club_members(user_id);
CREATE INDEX idx_players_team ON public.players(team_id);
CREATE INDEX idx_players_active ON public.players(team_id, is_active);
CREATE INDEX idx_exercises_club ON public.exercises(club_id);
CREATE INDEX idx_exercises_category ON public.exercises(category_id);
CREATE INDEX idx_sessions_team ON public.training_sessions(team_id);
CREATE INDEX idx_sessions_date ON public.training_sessions(date);
CREATE INDEX idx_session_exercises_session ON public.session_exercises(session_id);
CREATE INDEX idx_attendance_session ON public.attendance(session_id);
CREATE INDEX idx_game_stats_team ON public.game_stats(team_id);
CREATE INDEX idx_player_game_stats_game ON public.player_game_stats(game_id);
CREATE INDEX idx_evaluations_player ON public.evaluations(player_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- Política: usuarios ven su propio perfil
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Política: miembros del club pueden ver el club
CREATE POLICY "Members can view their clubs"
  ON public.clubs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.club_members WHERE club_id = id AND user_id = auth.uid())
    OR created_by = auth.uid()
  );

CREATE POLICY "Members can view club members"
  ON public.club_members FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.club_members cm WHERE cm.club_id = club_id AND cm.user_id = auth.uid())
  );

CREATE POLICY "Members can view teams"
  ON public.teams FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.club_members WHERE club_id = teams.club_id AND user_id = auth.uid())
  );

CREATE POLICY "Members can view players"
  ON public.players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      JOIN public.club_members cm ON cm.club_id = t.club_id
      WHERE t.id = players.team_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view exercises"
  ON public.exercises FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.club_members WHERE club_id = exercises.club_id AND user_id = auth.uid())
  );

CREATE POLICY "Members can view sessions"
  ON public.training_sessions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.club_members WHERE club_id = training_sessions.club_id AND user_id = auth.uid())
  );

CREATE POLICY "Members can view attendance"
  ON public.attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.training_sessions ts
      JOIN public.club_members cm ON cm.club_id = ts.club_id
      WHERE ts.id = attendance.session_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view game stats"
  ON public.game_stats FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.club_members WHERE club_id = game_stats.club_id AND user_id = auth.uid())
  );

CREATE POLICY "Members can view evaluations"
  ON public.evaluations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.club_members WHERE club_id = evaluations.club_id AND user_id = auth.uid())
  );
