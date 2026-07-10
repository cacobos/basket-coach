-- BasketFlow Migration 018
-- Documentos por jugador + licencias federativas

create table if not exists public.documents (
  id uuid not null default gen_random_uuid() primary key,
  club_id uuid not null references public.clubs(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  type text not null check (type in ('licencia', 'autorizacion', 'medico', 'otro')),
  file_url text not null,
  issued_at date,
  expires_at date,
  status text not null default 'pending' check (status in ('pending', 'valid', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documents enable row level security;

create policy "Staff can manage documents"
  on public.documents for all
  using (is_club_member_match(club_id))
  with check (is_club_member_match(club_id));

create policy "Family can read own player documents"
  on public.documents for select
  using (is_guardian_of_player(player_id));

create table if not exists public.player_licenses (
  id uuid not null default gen_random_uuid() primary key,
  player_id uuid not null references public.players(id) on delete cascade unique,
  federation text not null,
  license_number text,
  season text not null,
  status text not null default 'pending' check (status in ('pending', 'valid', 'expired')),
  expires_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.player_licenses enable row level security;

create policy "Staff can manage licenses"
  on public.player_licenses for all
  using (exists (
    select 1 from public.players p
    join public.club_members cm on cm.club_id = p.club_id
    where p.id = player_licenses.player_id and cm.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.players p
    join public.club_members cm on cm.club_id = p.club_id
    where p.id = player_licenses.player_id and cm.user_id = auth.uid()
  ));

create policy "Family can read own player licenses"
  on public.player_licenses for select
  using (is_guardian_of_player(player_id));

-- Vista: estado agregado de documentos por jugador
create or replace view public.v_player_documents_status as
select
  p.id as player_id,
  p.club_id,
  p.first_name,
  p.last_name,
  count(d.id) filter (where d.status = 'valid') as valid_docs,
  count(d.id) filter (where d.status = 'expired') as expired_docs,
  count(d.id) filter (where d.status = 'pending') as pending_docs,
  count(d.id) as total_docs,
  pl.status as license_status,
  pl.expires_at as license_expires_at
from public.players p
left join public.documents d on d.player_id = p.id
left join public.player_licenses pl on pl.player_id = p.id
where p.deleted_at is null
group by p.id, p.club_id, p.first_name, p.last_name, pl.status, pl.expires_at;

comment on table public.documents is 'Documentos por jugador: licencia, autorización de imagen, ficha médica, otros.';
comment on table public.player_licenses is 'Licencia federativa por jugador (1 por jugador).';
