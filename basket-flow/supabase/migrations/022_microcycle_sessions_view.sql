drop view if exists v_microcycle_sessions;
create view v_microcycle_sessions as
select
  mc.id as microcycle_id,
  s.id as session_id,
  s.title,
  s.date,
  s.start_time,
  s.end_time,
  s.status,
  s.team_id,
  mc.mesocycle_id,
  m.macrocycle_id
from microcycles mc
left join training_sessions s on s.microcycle_id = mc.id
join mesocycles m on m.id = mc.mesocycle_id
where s.deleted_at is null;
