-- BasketFlow Migration 017
-- Family role + player_guardians table + RLS

-- Extend role_permissions check constraint to include 'family'
alter table public.role_permissions
  drop constraint if exists role_permissions_role_check;
alter table public.role_permissions
  add constraint role_permissions_role_check
  check (role = any (array['club_admin', 'team_admin', 'coach', 'family']));

-- player_guardians — vincula un usuario (family) a un jugador
create table if not exists public.player_guardians (
  id uuid not null default gen_random_uuid() primary key,
  player_id uuid not null references public.players(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  relationship text,
  can_view_payments boolean not null default false,
  can_view_documents boolean not null default false,
  created_at timestamptz not null default now(),
  unique (player_id, user_id)
);

alter table public.player_guardians enable row level security;

-- Función helper: ¿el usuario autenticado es tutor del jugador?
create or replace function public.is_guardian_of_player(p_player_id uuid)
returns boolean
language sql
security definer
as $$
  select exists(
    select 1 from public.player_guardians
    where player_id = p_player_id
    and user_id = auth.uid()
  );
$$;

-- RLS: club members (staff) pueden gestionar guardians
create policy "Staff can manage guardians"
  on public.player_guardians for all
  using (exists (
    select 1 from public.club_members cm
    join public.players p on p.club_id = cm.club_id
    where cm.user_id = auth.uid() and p.id = player_guardians.player_id
  ))
  with check (exists (
    select 1 from public.club_members cm
    join public.players p on p.club_id = cm.club_id
    where cm.user_id = auth.uid() and p.id = player_guardians.player_id
  ));

-- RLS: family solo ve sus propias filas
create policy "Family view own"
  on public.player_guardians for select
  using (user_id = auth.uid());

-- RLS adicional en players: family puede leer a sus jugadores vinculados
create policy "Family can read linked players"
  on public.players for select
  using (is_guardian_of_player(id));

-- RLS en training_sessions: family puede leer sesiones del equipo de su jugador
create policy "Family can read linked player sessions"
  on public.training_sessions for select
  using (exists (
    select 1 from public.player_guardians pg
    join public.player_teams pt on pt.player_id = pg.player_id
    where pg.user_id = auth.uid() and pt.team_id = training_sessions.team_id
  ));

-- Seed permisos para role 'family' en role_permissions
insert into public.role_permissions (role, permission, granted) values
  ('family', 'player.manage', false),
  ('family', 'documents.manage', false),
  ('family', 'finance.manage', false)
on conflict (role, permission) do nothing;

comment on table public.player_guardians is 'Vincula tutores/familia a jugadores. El rol family solo ve a sus jugadores vinculados.';
