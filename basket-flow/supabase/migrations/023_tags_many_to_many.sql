-- Migration: Tags many-to-many
-- Migrates exercises.tags TEXT[] to separate tags + exercise_tag_relations tables

-- 1. Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(club_id, name)
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club members can view tags"
  ON tags FOR SELECT
  USING (is_club_member(club_id));

CREATE POLICY "Coaches and admins can manage tags"
  ON tags FOR ALL
  USING (
    is_club_member(club_id)
    AND EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.user_id = auth.uid()
        AND club_members.club_id = tags.club_id
        AND club_members.role IN ('club_admin', 'team_admin', 'coach')
    )
  );

-- 2. Create junction table
CREATE TABLE IF NOT EXISTS exercise_tag_relations (
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (exercise_id, tag_id)
);

ALTER TABLE exercise_tag_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club members can view exercise-tag relations"
  ON exercise_tag_relations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM exercises
      WHERE exercises.id = exercise_id
        AND is_club_member(exercises.club_id)
    )
  );

CREATE POLICY "Coaches and admins can manage exercise-tag relations"
  ON exercise_tag_relations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM exercises
      WHERE exercises.id = exercise_id
        AND is_club_member(exercises.club_id)
        AND EXISTS (
          SELECT 1 FROM club_members
          WHERE club_members.user_id = auth.uid()
            AND club_members.club_id = exercises.club_id
            AND club_members.role IN ('club_admin', 'team_admin', 'coach')
        )
    )
  );

-- 3. Migrate data from TEXT[] column
DO $$
DECLARE
  ex RECORD;
  tag_name TEXT;
  tag_id_var UUID;
BEGIN
  FOR ex IN SELECT id, club_id, tags FROM exercises WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
  LOOP
    FOREACH tag_name IN ARRAY ex.tags
    LOOP
      -- Upsert tag
      INSERT INTO tags (club_id, name)
      VALUES (ex.club_id, trim(tag_name))
      ON CONFLICT (club_id, name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id INTO tag_id_var;

      -- Link exercise to tag
      INSERT INTO exercise_tag_relations (exercise_id, tag_id)
      VALUES (ex.id, tag_id_var)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- 4. Add index for common queries
CREATE INDEX idx_tags_club_id ON tags(club_id);
CREATE INDEX idx_etr_exercise_id ON exercise_tag_relations(exercise_id);
CREATE INDEX idx_etr_tag_id ON exercise_tag_relations(tag_id);

-- Note: Do NOT drop exercises.tags yet to maintain backward compatibility.
-- The old TEXT[] column can be removed in a future migration once all code
-- has been migrated to use the tags + exercise_tag_relations tables.
