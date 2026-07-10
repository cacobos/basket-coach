-- ============================================================
-- SEED DEMO V2 — BasketFlow Demo Club
-- Usuarios (ya creados en auth.users):
--   superadmin@basketflow.com / 123456 : 56171449-06d4-4e97-a43f-dc1a8fe73ac8
--   club_admin@basketflow.com / 123456  : 491aee94-dd46-4995-bac2-2c43fbcc549e
--   coach@basketflow.com / 123456      : 3916575a-e906-4b69-8622-53429ffe1f0e
--   family@basketflow.com / 123456     : cfa69b4e-52cb-4637-94a5-5fda90c4c78e
-- ============================================================

DO $$
DECLARE
  v_superadmin_id uuid := '56171449-06d4-4e97-a43f-dc1a8fe73ac8';
  v_club_admin_id uuid := '491aee94-dd46-4995-bac2-2c43fbcc549e';
  v_coach_id uuid     := '3916575a-e906-4b69-8622-53429ffe1f0e';
  v_family_id uuid    := 'cfa69b4e-52cb-4637-94a5-5fda90c4c78e';
  v_club_id uuid;
  v_team_infantil_id uuid;
  v_team_cadete_id uuid;
  v_player1_id uuid;
  v_player2_id uuid;
  v_player3_id uuid;
  v_player4_id uuid;
  v_player5_id uuid;
  v_player6_id uuid;
  v_player7_id uuid;
  v_player8_id uuid;
  v_cat_tiro_id uuid;
  v_cat_pase_id uuid;
  v_cat_defensa_id uuid;
  v_exercise1_id uuid;
  v_exercise2_id uuid;
  v_exercise3_id uuid;
  v_exercise4_id uuid;
  v_session_id uuid;
  v_section_warmup_id uuid;
  v_section_technique_id uuid;
  v_section_tactic_id uuid;
  v_fee_plan_id uuid;
  v_player_fee_id uuid;
  v_match_id uuid;
BEGIN

-- 1. CLUB
INSERT INTO public.clubs (id, name, slug, description, created_by)
VALUES (gen_random_uuid(), 'BasketFlow Demo', 'basketflow-demo', 'Club de demostracion para el manual de usuario', v_club_admin_id)
RETURNING id INTO v_club_id;

INSERT INTO public.club_members (club_id, user_id, role) VALUES
  (v_club_id, v_club_admin_id, 'club_admin'),
  (v_club_id, v_coach_id, 'coach');

-- 2. EQUIPOS
INSERT INTO public.teams (id, club_id, name, category, season)
VALUES (gen_random_uuid(), v_club_id, 'Infantil Masculino', 'Infantil', '2025-2026')
RETURNING id INTO v_team_infantil_id;

INSERT INTO public.teams (id, club_id, name, category, season)
VALUES (gen_random_uuid(), v_club_id, 'Cadete Femenino', 'Cadete', '2025-2026')
RETURNING id INTO v_team_cadete_id;

INSERT INTO public.team_staff (team_id, user_id, role) VALUES
  (v_team_infantil_id, v_coach_id, 'head_coach');

-- 3. JUGADORES
INSERT INTO public.players (id, team_id, club_id, first_name, last_name, jersey_number, position, is_active)
VALUES (gen_random_uuid(), v_team_infantil_id, v_club_id, 'Pablo', 'Lopez', 5, 'Base', true)
RETURNING id INTO v_player1_id;

INSERT INTO public.players (id, team_id, club_id, first_name, last_name, jersey_number, position, is_active)
VALUES (gen_random_uuid(), v_team_infantil_id, v_club_id, 'Miguel', 'Rodriguez', 7, 'Alero', true)
RETURNING id INTO v_player2_id;

INSERT INTO public.players (id, team_id, club_id, first_name, last_name, jersey_number, position, is_active)
VALUES (gen_random_uuid(), v_team_infantil_id, v_club_id, 'Javier', 'Fernandez', 10, 'Pivot', true)
RETURNING id INTO v_player3_id;

INSERT INTO public.players (id, team_id, club_id, first_name, last_name, jersey_number, position, is_active)
VALUES (gen_random_uuid(), v_team_infantil_id, v_club_id, 'David', 'Gonzalez', 4, 'Base', true)
RETURNING id INTO v_player4_id;

INSERT INTO public.players (id, team_id, club_id, first_name, last_name, jersey_number, position, is_active)
VALUES (gen_random_uuid(), v_team_cadete_id, v_club_id, 'Sara', 'Martin', 8, 'Base', true)
RETURNING id INTO v_player5_id;

INSERT INTO public.players (id, team_id, club_id, first_name, last_name, jersey_number, position, is_active)
VALUES (gen_random_uuid(), v_team_cadete_id, v_club_id, 'Elena', 'Ruiz', 12, 'Alero', true)
RETURNING id INTO v_player6_id;

INSERT INTO public.players (id, team_id, club_id, first_name, last_name, jersey_number, position, is_active)
VALUES (gen_random_uuid(), v_team_cadete_id, v_club_id, 'Clara', 'Diaz', 6, 'Pivot', true)
RETURNING id INTO v_player7_id;

INSERT INTO public.players (id, team_id, club_id, first_name, last_name, jersey_number, position, is_active)
VALUES (gen_random_uuid(), v_team_cadete_id, v_club_id, 'Maria', 'Torres', 14, 'Escolta', true)
RETURNING id INTO v_player8_id;

-- 4. PLAYER GUARDIANS (familia)
INSERT INTO public.player_guardians (player_id, user_id, email, relationship, can_view_payments, can_view_documents)
VALUES (v_player5_id, v_family_id, 'family@basketflow.com', 'Madre', true, true);

-- 5. CONSENTS
INSERT INTO public.consents (player_id, guardian_id, consent_type, granted_at)
SELECT p.id, v_family_id, 'imagen', now() FROM public.players p WHERE p.team_id = v_team_cadete_id;
INSERT INTO public.consents (player_id, guardian_id, consent_type, granted_at)
SELECT p.id, v_family_id, 'datos_medicos', now() FROM public.players p WHERE p.team_id = v_team_cadete_id;
INSERT INTO public.consents (player_id, guardian_id, consent_type, granted_at)
SELECT p.id, v_family_id, 'tratamiento_datos', now() FROM public.players p WHERE p.team_id = v_team_cadete_id;

-- 6. CATALOGOS DE EJERCICIOS
INSERT INTO public.exercise_categories (id, club_id, name, color) VALUES (gen_random_uuid(), v_club_id, 'Tiro', '#0068ed')
RETURNING id INTO v_cat_tiro_id;

INSERT INTO public.exercise_categories (id, club_id, name, color) VALUES (gen_random_uuid(), v_club_id, 'Pase', '#10b981')
RETURNING id INTO v_cat_pase_id;

INSERT INTO public.exercise_categories (id, club_id, name, color) VALUES (gen_random_uuid(), v_club_id, 'Defensa', '#ef4444')
RETURNING id INTO v_cat_defensa_id;

-- 7. EJERCICIOS
INSERT INTO public.exercises (id, club_id, category_id, name, description, difficulty, duration_minutes, created_by, diagrams)
VALUES (gen_random_uuid(), v_club_id, v_cat_tiro_id, 'Tiro en suspension', 'Ejercicio de tiro desde media distancia con recepcion y bote', 'intermediate', 15, v_club_admin_id, '[]'::jsonb)
RETURNING id INTO v_exercise1_id;

INSERT INTO public.exercises (id, club_id, category_id, name, description, difficulty, duration_minutes, created_by, diagrams)
VALUES (gen_random_uuid(), v_club_id, v_cat_tiro_id, 'Layups en carrera', 'Bandejas consecutivas desde ambos lados con cambio de mano', 'beginner', 10, v_club_admin_id, '[]'::jsonb)
RETURNING id INTO v_exercise2_id;

INSERT INTO public.exercises (id, club_id, category_id, name, description, difficulty, duration_minutes, created_by, diagrams)
VALUES (gen_random_uuid(), v_club_id, v_cat_pase_id, 'Combinacion de pases', 'Rueda de pases en movimiento con 3 jugadores', 'beginner', 12, v_club_admin_id, '[]'::jsonb)
RETURNING id INTO v_exercise3_id;

INSERT INTO public.exercises (id, club_id, category_id, name, description, difficulty, duration_minutes, created_by, diagrams)
VALUES (gen_random_uuid(), v_club_id, v_cat_defensa_id, '1c1 defensivo', 'Ejercicio de defensa individual con ataque controlado', 'intermediate', 15, v_club_admin_id, '[]'::jsonb)
RETURNING id INTO v_exercise4_id;

-- 8. SESION DE ENTRENAMIENTO
INSERT INTO public.training_sessions (id, club_id, team_id, title, date, start_time, end_time, status, created_by)
VALUES (gen_random_uuid(), v_club_id, v_team_infantil_id, 'Entrenamiento semanal', CURRENT_DATE + 1, '18:00', '19:30', 'planned', v_coach_id)
RETURNING id INTO v_session_id;

INSERT INTO public.session_sections (id, session_id, name, sort_order) VALUES
  (gen_random_uuid(), v_session_id, 'Calentamiento', 1),
  (gen_random_uuid(), v_session_id, 'Tecnica individual', 2),
  (gen_random_uuid(), v_session_id, 'Tactica colectiva', 3);

SELECT id FROM public.session_sections WHERE session_id = v_session_id AND sort_order = 1 INTO v_section_warmup_id;
SELECT id FROM public.session_sections WHERE session_id = v_session_id AND sort_order = 2 INTO v_section_technique_id;
SELECT id FROM public.session_sections WHERE session_id = v_session_id AND sort_order = 3 INTO v_section_tactic_id;

INSERT INTO public.session_exercises (session_id, section_id, exercise_id, "order", duration_minutes) VALUES
  (v_session_id, v_section_warmup_id, v_exercise2_id, 1, 10),
  (v_session_id, v_section_technique_id, v_exercise1_id, 1, 15);

INSERT INTO public.attendance (session_id, player_id, status) VALUES
  (v_session_id, v_player1_id, 'present'),
  (v_session_id, v_player2_id, 'present'),
  (v_session_id, v_player3_id, 'present'),
  (v_session_id, v_player4_id, 'absent');

-- 9. EVALUACIONES
INSERT INTO public.evaluations (club_id, player_id, evaluator_id, date, type, shooting, dribbling, passing, defense, rebounding, iq, athleticism, teamwork, attitude, notes)
VALUES
  (v_club_id, v_player1_id, v_coach_id, CURRENT_DATE, 'internal', 7, 8, 6, 7, 5, 7, 8, 9, 8, 'Buena evolucion en el bote'),
  (v_club_id, v_player2_id, v_coach_id, CURRENT_DATE, 'internal', 8, 6, 7, 6, 7, 8, 7, 8, 7, 'Mejoria en el tiro exterior');

-- 10. ANNOUNCEMENTS
INSERT INTO public.announcements (id, club_id, team_id, title, body, created_by, sent_at)
VALUES (gen_random_uuid(), v_club_id, v_team_infantil_id, 'Partido este sabado', 'Recordatorio: partido contra CD Estudio el sabado a las 10:00 en el polideportivo municipal. Quedamos a las 9:15.', v_club_admin_id, now());

INSERT INTO public.announcements (club_id, team_id, title, body, created_by, sent_at)
VALUES (v_club_id, null, 'Inicio de temporada', 'Bienvenidos a la temporada 2025-2026. Recordad que los entrenamientos comienzan la proxima semana.', v_club_admin_id, now());

-- 11. FEE PLANS & PLAYER FEES
INSERT INTO public.fee_plans (id, club_id, team_id, name, amount, frequency)
VALUES (gen_random_uuid(), v_club_id, v_team_infantil_id, 'Cuota mensual infantil', 35.00, 'monthly')
RETURNING id INTO v_fee_plan_id;

INSERT INTO public.player_fees (id, player_id, fee_plan_id, due_date, amount, status)
VALUES (gen_random_uuid(), v_player1_id, v_fee_plan_id, '2026-08-01', 35.00, 'pending');

INSERT INTO public.player_fees (player_id, fee_plan_id, due_date, amount, status)
VALUES (v_player2_id, v_fee_plan_id, '2026-08-01', 35.00, 'paid');

-- 12. MATCH
INSERT INTO public.matches (id, club_id, team_id, rival, status, score_own, score_rival, is_home, date)
VALUES (gen_random_uuid(), v_club_id, v_team_infantil_id, 'CD Estudio', 'finished', 68, 55, true, CURRENT_DATE - 7)
RETURNING id INTO v_match_id;

INSERT INTO public.match_squads (match_id, player_id, starter) VALUES
  (v_match_id, v_player1_id, true),
  (v_match_id, v_player2_id, true),
  (v_match_id, v_player3_id, true),
  (v_match_id, v_player4_id, true);

-- 13. SEED CATALOGOS DE PARTIDO
PERFORM seed_match_catalogs(v_club_id);

-- 14. MACROCICLO DE DEMO
DECLARE
  v_macro_id uuid;
  v_meso_id uuid;
  v_micro_id uuid;
BEGIN
  INSERT INTO public.macrocycles (id, club_id, team_id, name, start_date, end_date, goals, created_by)
  VALUES (gen_random_uuid(), v_club_id, v_team_infantil_id, 'Temporada 2025-2026', '2025-09-01', '2026-06-30', 'Desarrollo integral de los jugadores, mejora del juego en equipo y preparacion para competiciones.', v_coach_id)
  RETURNING id INTO v_macro_id;

  INSERT INTO public.mesocycles (id, macrocycle_id, name, phase, start_date, end_date, intensity)
  VALUES (gen_random_uuid(), v_macro_id, 'Pretemporada', 'preseason', '2025-09-01', '2025-10-15', 7)
  RETURNING id INTO v_meso_id;

  INSERT INTO public.microcycles (id, mesocycle_id, week_number, start_date, end_date, focus, planned_sessions, has_match)
  VALUES (gen_random_uuid(), v_meso_id, 1, '2025-09-01', '2025-09-07', 'Adaptacion fisica y tecnica', 3, false)
  RETURNING id INTO v_micro_id;

  UPDATE public.training_sessions SET microcycle_id = v_micro_id WHERE id = v_session_id;
END;

END $$;
