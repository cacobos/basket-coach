-- ============================================================
-- SEED DEMO — BasketFlow Demo Club
-- Usuarios, club, equipos, jugadores, ejercicios, sesiones
-- Contraseña común: 1234
--
-- NOTA: La función seed_match_catalogs() se ha actualizado
-- para usar catalog_tags en lugar de catalog_systems (que
-- no tiene columna club_id, solo team_id).
-- ============================================================

-- Limpiar datos demo previos
DELETE FROM public.payments WHERE player_fee_id IN (SELECT id FROM public.player_fees WHERE player_id IN (SELECT id FROM public.players WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo')));
DELETE FROM public.player_fees WHERE player_id IN (SELECT id FROM public.players WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo'));
DELETE FROM public.fee_plans WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo');
DELETE FROM public.announcement_reads WHERE announcement_id IN (SELECT id FROM public.announcements WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo'));
DELETE FROM public.announcements WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo');
DELETE FROM public.documents WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo');
DELETE FROM public.consents WHERE player_id IN (SELECT id FROM public.players WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo'));
DELETE FROM public.player_guardians WHERE player_id IN (SELECT id FROM public.players WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo'));
DELETE FROM public.evaluations WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo');
DELETE FROM public.session_player_reviews WHERE session_id IN (SELECT id FROM public.training_sessions WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo'));
DELETE FROM public.attendance WHERE session_id IN (SELECT id FROM public.training_sessions WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo'));
DELETE FROM public.session_exercises WHERE session_id IN (SELECT id FROM public.training_sessions WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo'));
DELETE FROM public.session_sections WHERE session_id IN (SELECT id FROM public.training_sessions WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo'));
DELETE FROM public.training_sessions WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo');
DELETE FROM public.exercise_variants WHERE exercise_id IN (SELECT id FROM public.exercises WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo'));
DELETE FROM public.exercises WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo');
DELETE FROM public.exercise_categories WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo');
DELETE FROM public.possessions WHERE match_id IN (SELECT id FROM public.matches WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo'));
DELETE FROM public.match_substitutions WHERE match_id IN (SELECT id FROM public.matches WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo'));
DELETE FROM public.match_squads WHERE match_id IN (SELECT id FROM public.matches WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo'));
DELETE FROM public.matches WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo');
DELETE FROM public.objective_achievements WHERE objective_id IN (SELECT id FROM public.tactical_objective_catalog WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo'));
DELETE FROM public.tactical_objective_catalog WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo');
DELETE FROM public.microcycles WHERE mesocycle_id IN (SELECT id FROM public.mesocycles WHERE macrocycle_id IN (SELECT id FROM public.macrocycles WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo')));
DELETE FROM public.mesocycles WHERE macrocycle_id IN (SELECT id FROM public.macrocycles WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo'));
DELETE FROM public.macrocycles WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo');
DELETE FROM public.playbooks WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo');
DELETE FROM public.player_teams WHERE player_id IN (SELECT id FROM public.players WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo'));
DELETE FROM public.players WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo');
DELETE FROM public.team_staff WHERE team_id IN (SELECT id FROM public.teams WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo'));
DELETE FROM public.teams WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo');
DELETE FROM public.club_members WHERE club_id = (SELECT id FROM public.clubs WHERE slug = 'basketflow-demo'));
DELETE FROM public.clubs WHERE slug = 'basketflow-demo';

-- ============================================================
-- 1. USUARIOS (auth.users deberían existir ya del seed externo)
-- ============================================================
-- Actualizar perfiles
UPDATE public.profiles SET full_name = 'Admin General', is_superadmin = true WHERE id = '00000000-0000-0000-0000-000000000001';
UPDATE public.profiles SET full_name = 'Carlos García' WHERE id = '00000000-0000-0000-0000-000000000002';
UPDATE public.profiles SET full_name = 'Laura Martínez' WHERE id = '00000000-0000-0000-0000-000000000003';
UPDATE public.profiles SET full_name = 'Ana Pérez' WHERE id = '00000000-0000-0000-0000-000000000004';

-- ============================================================
-- DO Block principal
-- ============================================================
DO $$
DECLARE
  v_superadmin_id uuid := '00000000-0000-0000-0000-000000000001';
  v_club_admin_id uuid := '00000000-0000-0000-0000-000000000002';
  v_coach_id uuid     := '00000000-0000-0000-0000-000000000003';
  v_family_id uuid    := '00000000-0000-0000-0000-000000000004';
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
  v_announcement_id uuid;
  v_fee_plan_id uuid;
  v_player_fee_id uuid;
  v_match_id uuid;
BEGIN

-- 2. CLUB
INSERT INTO public.clubs (id, name, slug, description, created_by)
VALUES (gen_random_uuid(), 'BasketFlow Demo', 'basketflow-demo', 'Club de demostración para el manual de usuario', v_club_admin_id)
RETURNING id INTO v_club_id;

INSERT INTO public.club_members (club_id, user_id, role) VALUES
  (v_club_id, v_club_admin_id, 'club_admin'),
  (v_club_id, v_coach_id, 'coach');

-- 3. EQUIPOS (individual INSERTs)
INSERT INTO public.teams (id, club_id, name, category, season)
VALUES (gen_random_uuid(), v_club_id, 'Infantil Masculino', 'Infantil', '2025-2026')
RETURNING id INTO v_team_infantil_id;

INSERT INTO public.teams (id, club_id, name, category, season)
VALUES (gen_random_uuid(), v_club_id, 'Cadete Femenino', 'Cadete', '2025-2026')
RETURNING id INTO v_team_cadete_id;

INSERT INTO public.team_staff (team_id, user_id, role) VALUES
  (v_team_infantil_id, v_coach_id, 'head_coach');

-- 4. JUGADORES (individual INSERTs con RETURNING)
INSERT INTO public.players (id, team_id, club_id, first_name, last_name, jersey_number, position, is_active)
VALUES (gen_random_uuid(), v_team_infantil_id, v_club_id, 'Pablo', 'López', 5, 'Base', true)
RETURNING id INTO v_player1_id;

INSERT INTO public.players (id, team_id, club_id, first_name, last_name, jersey_number, position, is_active)
VALUES (gen_random_uuid(), v_team_infantil_id, v_club_id, 'Miguel', 'Rodríguez', 7, 'Alero', true)
RETURNING id INTO v_player2_id;

INSERT INTO public.players (id, team_id, club_id, first_name, last_name, jersey_number, position, is_active)
VALUES (gen_random_uuid(), v_team_infantil_id, v_club_id, 'Javier', 'Fernández', 10, 'Pívot', true)
RETURNING id INTO v_player3_id;

INSERT INTO public.players (id, team_id, club_id, first_name, last_name, jersey_number, position, is_active)
VALUES (gen_random_uuid(), v_team_infantil_id, v_club_id, 'David', 'González', 4, 'Base', true)
RETURNING id INTO v_player4_id;

INSERT INTO public.players (id, team_id, club_id, first_name, last_name, jersey_number, position, is_active)
VALUES (gen_random_uuid(), v_team_cadete_id, v_club_id, 'Sara', 'Martín', 8, 'Base', true)
RETURNING id INTO v_player5_id;

INSERT INTO public.players (id, team_id, club_id, first_name, last_name, jersey_number, position, is_active)
VALUES (gen_random_uuid(), v_team_cadete_id, v_club_id, 'Elena', 'Ruiz', 12, 'Alero', true)
RETURNING id INTO v_player6_id;

INSERT INTO public.players (id, team_id, club_id, first_name, last_name, jersey_number, position, is_active)
VALUES (gen_random_uuid(), v_team_cadete_id, v_club_id, 'Clara', 'Díaz', 6, 'Pívot', true)
RETURNING id INTO v_player7_id;

INSERT INTO public.players (id, team_id, club_id, first_name, last_name, jersey_number, position, is_active)
VALUES (gen_random_uuid(), v_team_cadete_id, v_club_id, 'María', 'Torres', 14, 'Escolta', true)
RETURNING id INTO v_player8_id;

-- 5. PLAYER GUARDIANS (familia)
INSERT INTO public.player_guardians (player_id, user_id, email, relationship, can_view_payments, can_view_documents) VALUES
  (v_player5_id, v_family_id, 'family@basketflow.com', 'Madre', true, true);

-- 6. CONSENTS
INSERT INTO public.consents (player_id, guardian_id, consent_type, granted_at) SELECT p.id, v_family_id, 'imagen', now() FROM public.players p WHERE p.team_id = v_team_infantil_id;
INSERT INTO public.consents (player_id, guardian_id, consent_type, granted_at) SELECT p.id, v_family_id, 'datos_medicos', now() FROM public.players p WHERE p.team_id = v_team_infantil_id;
INSERT INTO public.consents (player_id, guardian_id, consent_type, granted_at) SELECT p.id, v_family_id, 'tratamiento_datos', now() FROM public.players p WHERE p.team_id = v_team_infantil_id;
INSERT INTO public.consents (player_id, guardian_id, consent_type, granted_at) SELECT p.id, v_family_id, 'imagen', now() FROM public.players p WHERE p.team_id = v_team_cadete_id;
INSERT INTO public.consents (player_id, guardian_id, consent_type, granted_at) SELECT p.id, v_family_id, 'datos_medicos', now() FROM public.players p WHERE p.team_id = v_team_cadete_id;
INSERT INTO public.consents (player_id, guardian_id, consent_type, granted_at) SELECT p.id, v_family_id, 'tratamiento_datos', now() FROM public.players p WHERE p.team_id = v_team_cadete_id;

-- 7. CATÁLOGOS DE EJERCICIOS
INSERT INTO public.exercise_categories (id, club_id, name, color) VALUES (gen_random_uuid(), v_club_id, 'Tiro', '#0068ed')
RETURNING id INTO v_cat_tiro_id;

INSERT INTO public.exercise_categories (id, club_id, name, color) VALUES (gen_random_uuid(), v_club_id, 'Pase', '#10b981')
RETURNING id INTO v_cat_pase_id;

INSERT INTO public.exercise_categories (id, club_id, name, color) VALUES (gen_random_uuid(), v_club_id, 'Defensa', '#ef4444')
RETURNING id INTO v_cat_defensa_id;

-- 8. EJERCICIOS
INSERT INTO public.exercises (id, club_id, category_id, name, description, difficulty, duration_minutes, created_by, diagrams)
VALUES (gen_random_uuid(), v_club_id, v_cat_tiro_id, 'Tiro en suspensión', 'Ejercicio de tiro desde media distancia con recepción y bote', 'intermediate', 15, v_club_admin_id, '[]'::jsonb)
RETURNING id INTO v_exercise1_id;

INSERT INTO public.exercises (id, club_id, category_id, name, description, difficulty, duration_minutes, created_by, diagrams)
VALUES (gen_random_uuid(), v_club_id, v_cat_tiro_id, 'Layups en carrera', 'Bandejas consecutivas desde ambos lados con cambio de mano', 'beginner', 10, v_club_admin_id, '[]'::jsonb)
RETURNING id INTO v_exercise2_id;

INSERT INTO public.exercises (id, club_id, category_id, name, description, difficulty, duration_minutes, created_by, diagrams)
VALUES (gen_random_uuid(), v_club_id, v_cat_pase_id, 'Combinación de pases', 'Rueda de pases en movimiento con 3 jugadores', 'beginner', 12, v_club_admin_id, '[]'::jsonb)
RETURNING id INTO v_exercise3_id;

INSERT INTO public.exercises (id, club_id, category_id, name, description, difficulty, duration_minutes, created_by, diagrams)
VALUES (gen_random_uuid(), v_club_id, v_cat_defensa_id, '1c1 defensivo', 'Ejercicio de defensa individual con ataque controlado', 'intermediate', 15, v_club_admin_id, '[]'::jsonb)
RETURNING id INTO v_exercise4_id;

-- 9. SESIÓN DE ENTRENAMIENTO
INSERT INTO public.training_sessions (id, club_id, team_id, title, date, start_time, end_time, status, created_by)
VALUES (gen_random_uuid(), v_club_id, v_team_infantil_id, 'Entrenamiento semanal', CURRENT_DATE + 1, '18:00', '19:30', 'planned', v_coach_id)
RETURNING id INTO v_session_id;

INSERT INTO public.session_sections (id, session_id, name, sort_order) VALUES
  (gen_random_uuid(), v_session_id, 'Calentamiento', 1),
  (gen_random_uuid(), v_session_id, 'Técnica individual', 2),
  (gen_random_uuid(), v_session_id, 'Táctica colectiva', 3);

SELECT id FROM public.session_sections WHERE session_id = v_session_id AND sort_order = 1 INTO v_section_warmup_id;
SELECT id FROM public.session_sections WHERE session_id = v_session_id AND sort_order = 2 INTO v_section_technique_id;
SELECT id FROM public.session_sections WHERE session_id = v_session_id AND sort_order = 3 INTO v_section_tactic_id;

INSERT INTO public.session_exercises (session_id, section_id, exercise_id, "order", duration_minutes) VALUES
  (v_session_id, v_section_warmup_id, v_exercise2_id, 1, 10),
  (v_session_id, v_section_technique_id, v_exercise1_id, 1, 15);

-- Asistencia
INSERT INTO public.attendance (session_id, player_id, status) VALUES
  (v_session_id, v_player1_id, 'present'),
  (v_session_id, v_player2_id, 'present'),
  (v_session_id, v_player3_id, 'present'),
  (v_session_id, v_player4_id, 'absent');

-- 10. EVALUACIONES
INSERT INTO public.evaluations (club_id, player_id, evaluator_id, date, type, shooting, dribbling, passing, defense, rebounding, iq, athleticism, teamwork, attitude, notes)
VALUES
  (v_club_id, v_player1_id, v_coach_id, CURRENT_DATE, 'internal', 7, 8, 6, 7, 5, 7, 8, 9, 8, 'Buena evolución en el bote'),
  (v_club_id, v_player2_id, v_coach_id, CURRENT_DATE, 'internal', 8, 6, 7, 6, 7, 8, 7, 8, 7, 'Mejoría en el tiro exterior');

-- 11. ANNOUNCEMENTS
INSERT INTO public.announcements (id, club_id, team_id, title, body, created_by, sent_at)
VALUES (gen_random_uuid(), v_club_id, v_team_infantil_id, 'Partido este sábado', 'Recordatorio: partido contra CD Estudio el sábado a las 10:00 en el polideportivo municipal. Quedamos a las 9:15.', v_club_admin_id, now())
RETURNING id INTO v_announcement_id;

INSERT INTO public.announcements (club_id, team_id, title, body, created_by, sent_at)
VALUES (v_club_id, null, 'Inicio de temporada', 'Bienvenidos a la temporada 2025-2026. Recordad que los entrenamientos comienzan la próxima semana.', v_club_admin_id, now());

-- 12. FEE PLANS & PLAYER FEES
INSERT INTO public.fee_plans (id, club_id, team_id, name, amount, frequency)
VALUES (gen_random_uuid(), v_club_id, v_team_infantil_id, 'Cuota mensual infantil', 35.00, 'monthly')
RETURNING id INTO v_fee_plan_id;

INSERT INTO public.player_fees (id, player_id, fee_plan_id, due_date, amount, status)
VALUES (gen_random_uuid(), v_player1_id, v_fee_plan_id, '2026-08-01', 35.00, 'pending')
RETURNING id INTO v_player_fee_id;

INSERT INTO public.player_fees (player_id, fee_plan_id, due_date, amount, status)
VALUES (v_player2_id, v_fee_plan_id, '2026-08-01', 35.00, 'paid');

-- 13. MATCH (partido de demostración)
INSERT INTO public.matches (id, club_id, team_id, rival, status, score_own, score_rival, is_home, date)
VALUES (gen_random_uuid(), v_club_id, v_team_infantil_id, 'CD Estudio', 'finished', 68, 55, true, CURRENT_DATE - 7)
RETURNING id INTO v_match_id;

INSERT INTO public.match_squads (match_id, player_id, starter) VALUES
  (v_match_id, v_player1_id, true),
  (v_match_id, v_player2_id, true),
  (v_match_id, v_player3_id, true),
  (v_match_id, v_player4_id, true);

-- 14. SEED CATÁLOGOS DE PARTIDO
PERFORM seed_match_catalogs(v_club_id);

-- 15. MACROCICLO DE DEMO
DECLARE
  v_macro_id uuid;
  v_meso_id uuid;
  v_micro_id uuid;
BEGIN
  INSERT INTO public.macrocycles (id, club_id, team_id, name, start_date, end_date, goals, created_by)
  VALUES (gen_random_uuid(), v_club_id, v_team_infantil_id, 'Temporada 2025-2026', '2025-09-01', '2026-06-30', 'Desarrollo integral de los jugadores, mejora del juego en equipo y preparación para competiciones.', v_coach_id)
  RETURNING id INTO v_macro_id;

  INSERT INTO public.mesocycles (id, macrocycle_id, name, phase, start_date, end_date, intensity)
  VALUES (gen_random_uuid(), v_macro_id, 'Pretemporada', 'preseason', '2025-09-01', '2025-10-15', 7)
  RETURNING id INTO v_meso_id;

  INSERT INTO public.microcycles (id, mesocycle_id, week_number, start_date, end_date, focus, planned_sessions, has_match)
  VALUES (gen_random_uuid(), v_meso_id, 1, '2025-09-01', '2025-09-07', 'Adaptación física y técnica', 3, false)
  RETURNING id INTO v_micro_id;

  UPDATE public.training_sessions SET microcycle_id = v_micro_id WHERE id = v_session_id;
END;

END $$;
