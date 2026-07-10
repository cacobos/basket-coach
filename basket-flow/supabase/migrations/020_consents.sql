-- BasketFlow Migration 020
-- Consentimientos RGPD para menores + trigger de validación

create table if not exists public.consents (
  id uuid not null default gen_random_uuid() primary key,
  player_id uuid not null references public.players(id) on delete cascade,
  guardian_id uuid references auth.users(id) on delete set null,
  consent_type text not null check (consent_type in ('imagen', 'datos_medicos', 'tratamiento_datos')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (player_id, consent_type, coalesce(revoked_at, 'infinity'::timestamptz))
);

alter table public.consents enable row level security;

create policy "Staff can manage consents"
  on public.consents for all
  using (exists (
    select 1 from public.players p
    join public.club_members cm on cm.club_id = p.club_id
    where p.id = consents.player_id and cm.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.players p
    join public.club_members cm on cm.club_id = p.club_id
    where p.id = consents.player_id and cm.user_id = auth.uid()
  ));

create policy "Family can read own consents"
  on public.consents for select
  using (is_guardian_of_player(player_id));

-- Trigger: evitar que un jugador se active sin los consentimientos obligatorios
create or replace function public.check_player_consents()
returns trigger
language plpgsql
security definer
as $$
begin
  if NEW.is_active = true then
    if not exists (
      select 1 from public.consents
      where player_id = NEW.id
      and revoked_at is null
      and consent_type in ('imagen', 'datos_medicos', 'tratamiento_datos')
      having count(distinct consent_type) = 3
    ) then
      raise exception 'Cannot activate player without all required consents (imagen, datos_medicos, tratamiento_datos)';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_check_player_consents on public.players;
create trigger trg_check_player_consents
  before update of is_active on public.players
  for each row
  when (NEW.is_active = true and OLD.is_active = false)
  execute function public.check_player_consents();

comment on table public.consents is 'Consentimientos RGPD obligatorios (imagen, datos médicos, tratamiento datos) antes de activar un jugador.';
