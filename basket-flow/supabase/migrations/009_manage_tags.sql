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
