-- Estado de asistencia "no le corresponde" (jugador vinculado que no debe acudir
-- a ese entrenamiento, p. ej. un junior que tiene su propio entrenamiento).
ALTER TABLE attendance
  DROP CONSTRAINT IF EXISTS attendance_status_check;

ALTER TABLE attendance
  ADD CONSTRAINT attendance_status_check
  CHECK (status = ANY (ARRAY[
    'present', 'absent', 'late', 'excused', 'injured', 'not_required'
  ]::text[]));
