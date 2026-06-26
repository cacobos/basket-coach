INSERT INTO public.players (team_id, first_name, last_name, jersey_number, position, is_active)
SELECT '44572254-9c8b-4f19-b67a-48c9dbe8fe52', first, last, num, pos, true
FROM (VALUES
  ('Carlos', 'García', 5, 'Base'),
  ('Pablo', 'López', 7, 'Escolta'),
  ('Javier', 'Martínez', 10, 'Alero'),
  ('Miguel', 'Rodríguez', 12, 'Ala-Pívot'),
  ('David', 'Fernández', 14, 'Pívot'),
  ('Alejandro', 'Sánchez', 4, 'Base'),
  ('Sergio', 'Díaz', 6, 'Escolta'),
  ('Daniel', 'Pérez', 8, 'Alero'),
  ('Manuel', 'González', 9, 'Ala-Pívot'),
  ('Adrián', 'Ruiz', 11, 'Pívot'),
  ('Álvaro', 'Hernández', 13, 'Base'),
  ('Iván', 'Jiménez', 15, 'Escolta'),
  ('Marcos', 'Álvarez', 16, 'Alero'),
  ('Raúl', 'Moreno', 18, 'Ala-Pívot'),
  ('Hugo', 'Muñoz', 20, 'Pívot')
) AS t(first, last, num, pos)
WHERE NOT EXISTS (
  SELECT 1 FROM public.players p
  WHERE p.team_id = '44572254-9c8b-4f19-b67a-48c9dbe8fe52' AND p.first_name = t.first AND p.last_name = t.last
);
