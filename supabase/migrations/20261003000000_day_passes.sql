alter table public.gyms
  add column day_pass_fee numeric(10, 2)
  check (day_pass_fee is null or day_pass_fee > 0);

create table public.day_passes (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  visitor_name text not null check (char_length(trim(visitor_name)) > 0),
  email text,
  phone text,
  visit_date date not null default current_date,
  amount numeric(10, 2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('cash', 'bank', 'other')),
  payment_method_details text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index day_passes_gym_created_idx on public.day_passes(gym_id, created_at desc);

alter table public.day_passes enable row level security;

grant select, insert on public.day_passes to authenticated;

create policy "Gym members can read day passes"
  on public.day_passes for select to authenticated
  using (public.is_gym_member(gym_id));

create policy "Gym members can add day passes"
  on public.day_passes for insert to authenticated
  with check (public.is_gym_member(gym_id));