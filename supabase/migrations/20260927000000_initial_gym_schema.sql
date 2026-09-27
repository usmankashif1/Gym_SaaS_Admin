create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 100),
  created_at timestamptz not null default now()
);

create table public.gym_memberships (
  gym_id uuid not null references public.gyms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'staff')),
  created_at timestamptz not null default now(),
  primary key (gym_id, user_id)
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  first_name text not null check (char_length(trim(first_name)) > 0),
  last_name text not null default '',
  email text,
  phone text,
  plan_name text not null default 'Open gym',
  status text not null default 'active' check (status in ('active', 'inactive')),
  joined_at date not null default current_date,
  next_due date not null default current_date,
  created_at timestamptz not null default now(),
  unique (gym_id, id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null,
  amount numeric(10, 2) not null check (amount > 0),
  due_date date not null,
  paid_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  created_at timestamptz not null default now(),
  foreign key (gym_id, member_id) references public.members(gym_id, id) on delete cascade,
  check ((status = 'pending' and paid_at is null) or (status = 'paid' and paid_at is not null))
);

create table public.gym_subscriptions (
  gym_id uuid primary key references public.gyms(id) on delete cascade,
  plan_key text not null default 'starter',
  status text not null default 'trialing' check (status in ('trialing', 'active', 'past_due', 'cancelled')),
  member_limit integer not null default 100 check (member_limit > 0),
  current_period_end date not null default (current_date + 30),
  created_at timestamptz not null default now()
);

create index members_gym_status_idx on public.members(gym_id, status);
create index members_gym_name_idx on public.members(gym_id, last_name, first_name);
create index payments_gym_due_status_idx on public.payments(gym_id, due_date, status);
create index payments_gym_paid_at_idx on public.payments(gym_id, paid_at) where status = 'paid';

create function public.is_gym_member(target_gym_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.gym_memberships as membership
    where membership.gym_id = target_gym_id
      and membership.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_gym_member(uuid) from public, anon;
grant execute on function public.is_gym_member(uuid) to authenticated;

create function public.create_gym_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_gym_id uuid;
  gym_name text;
begin
  gym_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'gym_name'), ''), 'My Gym');
  insert into public.gyms (name) values (left(gym_name, 100)) returning id into new_gym_id;
  insert into public.gym_memberships (gym_id, user_id, role) values (new_gym_id, new.id, 'owner');
  insert into public.gym_subscriptions (gym_id) values (new_gym_id);
  return new;
end;
$$;

revoke all on function public.create_gym_for_new_user() from public, anon, authenticated;

create trigger on_auth_user_created_create_gym
  after insert on auth.users
  for each row execute function public.create_gym_for_new_user();

alter table public.gyms enable row level security;
alter table public.gym_memberships enable row level security;
alter table public.members enable row level security;
alter table public.payments enable row level security;
alter table public.gym_subscriptions enable row level security;

grant select on public.gyms, public.gym_memberships, public.members, public.payments, public.gym_subscriptions to authenticated;
grant insert, update, delete on public.members, public.payments to authenticated;

create policy "Gym members can read their gym"
  on public.gyms for select to authenticated
  using (public.is_gym_member(id));

create policy "Gym members can read memberships in their gym"
  on public.gym_memberships for select to authenticated
  using (public.is_gym_member(gym_id));

create policy "Gym members can read members"
  on public.members for select to authenticated
  using (public.is_gym_member(gym_id));
create policy "Gym members can add members"
  on public.members for insert to authenticated
  with check (public.is_gym_member(gym_id));
create policy "Gym members can update members"
  on public.members for update to authenticated
  using (public.is_gym_member(gym_id))
  with check (public.is_gym_member(gym_id));
create policy "Gym members can remove members"
  on public.members for delete to authenticated
  using (public.is_gym_member(gym_id));

create policy "Gym members can read payments"
  on public.payments for select to authenticated
  using (public.is_gym_member(gym_id));
create policy "Gym members can add payments"
  on public.payments for insert to authenticated
  with check (public.is_gym_member(gym_id));
create policy "Gym members can update payments"
  on public.payments for update to authenticated
  using (public.is_gym_member(gym_id))
  with check (public.is_gym_member(gym_id));
create policy "Gym members can remove payments"
  on public.payments for delete to authenticated
  using (public.is_gym_member(gym_id));

create policy "Gym members can read their subscription"
  on public.gym_subscriptions for select to authenticated
  using (public.is_gym_member(gym_id));