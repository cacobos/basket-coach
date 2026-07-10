-- BasketFlow Migration 019
-- Comunicación centralizada (anuncios) + registro de lectura

create table if not exists public.announcements (
  id uuid not null default gen_random_uuid() primary key,
  club_id uuid not null references public.clubs(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  title text not null,
  body text not null,
  created_by uuid not null references auth.users(id),
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

-- Staff puede gestionar anuncios de su club
create policy "Staff can manage announcements"
  on public.announcements for all
  using (is_club_member_match(club_id))
  with check (is_club_member_match(club_id));

-- Family puede leer anuncios del club/equipo de su jugador
create policy "Family can read announcements"
  on public.announcements for select
  using (
    exists (
      select 1 from public.player_guardians pg
      join public.player_teams pt on pt.player_id = pg.player_id
      join public.announcements a on (
        a.club_id = pt.player_id::text::uuid  -- placeholder, corregir abajo
      )
      where pg.user_id = auth.uid()
    )
    or is_club_member_match(club_id)
  );

drop policy if exists "Family can read announcements" on public.announcements;

create policy "Family can read announcements"
  on public.announcements for select
  using (
    team_id is null
    and is_club_member_match(club_id)
    or exists (
      select 1 from public.player_guardians pg
      join public.player_teams pt on pt.player_id = pg.player_id
      where pg.user_id = auth.uid()
      and (announcements.team_id is null or announcements.team_id = pt.team_id)
    )
  );

create table if not exists public.announcement_reads (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

alter table public.announcement_reads enable row level security;

create policy "Users can manage own reads"
  on public.announcement_reads for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

comment on table public.announcements is 'Avisos y comunicaciones del club/equipo. Sustituye WhatsApp.';
comment on table public.announcement_reads is 'Registro de quién ha leído cada anuncio.';
