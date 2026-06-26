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
