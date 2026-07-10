-- BasketFlow Migration 021
-- Módulo financiero: cuotas, pagos (registro manual, sin pasarela externa)

-- Planes de cuota configurados por club/equipo
create table if not exists public.fee_plans (
  id uuid not null default gen_random_uuid() primary key,
  club_id uuid not null references public.clubs(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  name text not null,
  amount numeric(10,2) not null check (amount >= 0),
  frequency text not null check (frequency in ('monthly', 'seasonal', 'one_time')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fee_plans enable row level security;

create policy "Club admins can manage fee plans"
  on public.fee_plans for all
  using (is_club_member_match(club_id))
  with check (is_club_member_match(club_id));

-- Cuota generada para un jugador según un plan
create table if not exists public.player_fees (
  id uuid not null default gen_random_uuid() primary key,
  player_id uuid not null references public.players(id) on delete cascade,
  fee_plan_id uuid not null references public.fee_plans(id) on delete cascade,
  due_date date not null,
  amount numeric(10,2) not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'overdue', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.player_fees enable row level security;

create policy "Club admins can manage player fees"
  on public.player_fees for all
  using (exists (
    select 1 from public.players p
    join public.club_members cm on cm.club_id = p.club_id
    where p.id = player_fees.player_id and cm.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.players p
    join public.club_members cm on cm.club_id = p.club_id
    where p.id = player_fees.player_id and cm.user_id = auth.uid()
  ));

create policy "Family can view own player fees"
  on public.player_fees for select
  using (is_guardian_of_player(player_id));

-- Pago registrado manualmente (sin pasarela)
create table if not exists public.payments (
  id uuid not null default gen_random_uuid() primary key,
  player_fee_id uuid not null references public.player_fees(id) on delete cascade,
  amount numeric(10,2) not null check (amount >= 0),
  method text not null check (method in ('transfer', 'cash', 'bizum', 'other')),
  registered_by uuid not null references auth.users(id),
  paid_at timestamptz not null default now(),
  receipt_url text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "Club admins can manage payments"
  on public.payments for all
  using (exists (
    select 1 from public.player_fees pf
    join public.players p on p.id = pf.player_id
    join public.club_members cm on cm.club_id = p.club_id
    where pf.id = payments.player_fee_id and cm.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.player_fees pf
    join public.players p on p.id = pf.player_id
    join public.club_members cm on cm.club_id = p.club_id
    where pf.id = payments.player_fee_id and cm.user_id = auth.uid()
  ));

create policy "Family can view own payments"
  on public.payments for select
  using (exists (
    select 1 from public.player_fees pf
    where pf.id = payments.player_fee_id
    and is_guardian_of_player(pf.player_id)
  ));

-- Vista: cuotas vencidas agrupadas
create or replace view public.v_overdue_fees as
select
  pf.id as player_fee_id,
  pf.player_id,
  pf.amount,
  pf.due_date,
  p.first_name,
  p.last_name,
  t.name as team_name,
  c.name as club_name,
  c.id as club_id,
  fp.name as plan_name
from public.player_fees pf
join public.players p on p.id = pf.player_id
left join public.teams t on t.id = p.team_id
join public.clubs c on c.id = t.club_id
join public.fee_plans fp on fp.id = pf.fee_plan_id
where pf.status = 'overdue';

-- Función: generar cuotas recurrentes desde fee_plans activos
create or replace function public.generate_recurring_fees()
returns int
language plpgsql
security definer
as $$
declare
  generated int := 0;
  p record;
begin
  for p in
    select distinct fp.id as plan_id, fp.amount, fp.frequency, pt.player_id
    from public.fee_plans fp
    join public.player_teams pt on pt.team_id = fp.team_id or fp.team_id is null
    where fp.is_active = true
  loop
    insert into public.player_fees (player_id, fee_plan_id, due_date, amount, status)
    values (
      p.player_id, p.plan_id,
      case p.frequency
        when 'monthly' then date_trunc('month', now())::date + interval '1 month'
        when 'seasonal' then date_trunc('year', now())::date + interval '9 months'
        else now()::date
      end,
      p.amount, 'pending'
    )
    on conflict do nothing;
    generated := generated + 1;
  end loop;
  return generated;
end;
$$;

comment on table public.fee_plans is 'Planes de cuota configurables por club/equipo (sin pasarela de pago — registro manual).';
comment on table public.player_fees is 'Cuota generada para un jugador. Pendiente/pagada/vencida/cancelada.';
comment on table public.payments is 'Registro manual de un pago. Sin integración con proveedores externos.';
