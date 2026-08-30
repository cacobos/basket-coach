-- Hora programada del partido (ej. amistoso a las 12:00).
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS scheduled_time TIME;
