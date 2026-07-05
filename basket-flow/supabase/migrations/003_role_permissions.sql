-- BasketFlow Migration 003
-- Role-based permission system for configurable member access levels

create table if not exists public.role_permissions (
  role text not null check (role = any (array['club_admin', 'team_admin', 'coach'])),
  permission text not null,
  granted boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (role, permission)
);

alter table public.role_permissions enable row level security;

create policy if not exists "Everyone can read role_permissions"
  on public.role_permissions for select
  using (true);

create policy if not exists "Superadmins can manage role_permissions"
  on public.role_permissions for all
  using (exists (select 1 from profiles where id = auth.uid() and is_superadmin = true))
  with check (exists (select 1 from profiles where id = auth.uid() and is_superadmin = true));

insert into public.role_permissions (role, permission, granted) values
  ('club_admin', 'club.members.manage', true),
  ('club_admin', 'team.staff.manage', true),
  ('club_admin', 'team.manage', true),
  ('club_admin', 'player.manage', true),
  ('club_admin', 'session.manage', true),
  ('club_admin', 'exercise.manage', true),
  ('club_admin', 'evaluation.manage', true),
  ('club_admin', 'match.manage', true),
  ('club_admin', 'planning.manage', true),
  ('club_admin', 'configuration.manage', true),
  ('club_admin', 'tactics.manage', true),
  ('club_admin', 'attendance.manage', true),
  ('club_admin', 'documents.manage', true),
  ('club_admin', 'announcements.manage', true),
  ('club_admin', 'finance.manage', true),
  ('club_admin', 'advanced_stats.manage', true),
  ('team_admin', 'team.staff.manage', true),
  ('team_admin', 'team.manage', true),
  ('team_admin', 'player.manage', true),
  ('team_admin', 'session.manage', true),
  ('team_admin', 'exercise.manage', true),
  ('team_admin', 'evaluation.manage', true),
  ('team_admin', 'match.manage', true),
  ('team_admin', 'planning.manage', true),
  ('team_admin', 'tactics.manage', true),
  ('team_admin', 'attendance.manage', true),
  ('coach', 'player.manage', true),
  ('coach', 'session.manage', true),
  ('coach', 'exercise.manage', true),
  ('coach', 'evaluation.manage', true),
  ('coach', 'match.manage', true),
  ('coach', 'tactics.manage', true),
  ('coach', 'attendance.manage', true)
on conflict (role, permission) do nothing;

comment on table public.role_permissions is 'Configurable permissions per club membership role. Managed by superadmin.';
