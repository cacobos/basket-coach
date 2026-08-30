-- RLS: escritura sobre attendance (incluye nuevo estado 'not_required') y
-- gestión de la relación muchos-a-muchos player_teams (jugadores vinculados).

-- ── attendance: INSERT / UPDATE / DELETE para miembros del club ──
CREATE POLICY "Members can insert attendance"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM training_sessions ts
      JOIN club_members cm ON cm.club_id = ts.club_id
      WHERE ts.id = attendance.session_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update attendance"
  ON attendance FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM training_sessions ts
      JOIN club_members cm ON cm.club_id = ts.club_id
      WHERE ts.id = attendance.session_id AND cm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM training_sessions ts
      JOIN club_members cm ON cm.club_id = ts.club_id
      WHERE ts.id = attendance.session_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete attendance"
  ON attendance FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM training_sessions ts
      JOIN club_members cm ON cm.club_id = ts.club_id
      WHERE ts.id = attendance.session_id AND cm.user_id = auth.uid()
    )
  );

-- ── player_teams: SELECT / INSERT / DELETE para miembros del club ──
CREATE POLICY "Members can view player_teams"
  ON player_teams FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM teams t
      JOIN club_members cm ON cm.club_id = t.club_id
      WHERE t.id = player_teams.team_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert player_teams"
  ON player_teams FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM teams t
      JOIN club_members cm ON cm.club_id = t.club_id
      WHERE t.id = player_teams.team_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete player_teams"
  ON player_teams FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM teams t
      JOIN club_members cm ON cm.club_id = t.club_id
      WHERE t.id = player_teams.team_id AND cm.user_id = auth.uid()
    )
  );
