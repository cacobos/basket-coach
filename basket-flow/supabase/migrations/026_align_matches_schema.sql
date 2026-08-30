-- Alinear la tabla `matches` al modelo Match de la app (match analysis por posesiones)
-- El esquema real de producción usaba fixtures (home_team_id/away_team_id/season_id/matchday_id),
-- que no coincide con el modelo de la app (team_id/rival/date/score_*/status/current_period/is_home).
-- No hay filas en la tabla ni FK entrantes, así que es seguro alinear columnas.

ALTER TABLE matches
  DROP COLUMN IF EXISTS season_id,
  DROP COLUMN IF EXISTS matchday_id,
  DROP COLUMN IF EXISTS home_team_id,
  DROP COLUMN IF EXISTS away_team_id,
  DROP COLUMN IF EXISTS match_date,
  DROP COLUMN IF EXISTS video_url,
  DROP COLUMN IF EXISTS video_kind;

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS rival TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS competition TEXT,
  ADD COLUMN IF NOT EXISTS round TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'created'
      CHECK (status IN ('created', 'in_progress', 'finished', 'closed')),
  ADD COLUMN IF NOT EXISTS current_period INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS score_own INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_rival INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_home BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_matches_club ON matches(club_id);
CREATE INDEX IF NOT EXISTS idx_matches_team ON matches(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(date DESC);
