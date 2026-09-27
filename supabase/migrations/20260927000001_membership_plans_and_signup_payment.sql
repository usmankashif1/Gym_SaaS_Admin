create table public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  price numeric(10, 2) not null check (price > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (gym_id, id),
  unique (gym_id, name)
);

alter table public.members
  add column membership_plan_id uuid;

alter table public.members
  add constraint members_gym_membership_plan_fkey
  foreign key (gym_id, membership_plan_id)
  references public.membership_plans(gym_id, id)
  on delete restrict;

create index members_gym_membership_plan_idx
  on public.members(gym_id, membership_plan_id);

create function public.is_gym_owner(target_gym_id uuid)
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
      and membership.role = 'owner'
  );
$$;

revoke all on function public.is_gym_owner(uuid) from public, anon;
grant execute on function public.is_gym_owner(uuid) to authenticated;

alter table public.membership_plans enable row level security;
grant select, insert, update on public.membership_plans to authenticated;

create policy "Gym members can read their membership plans"
  on public.membership_plans for select to authenticated
  using (public.is_gym_member(gym_id));

create policy "Gym owners can create membership plans"
  on public.membership_plans for insert to authenticated
  with check (public.is_gym_owner(gym_id));

create policy "Gym owners can update membership plans"
  on public.membership_plans for update to authenticated
  using (public.is_gym_owner(gym_id))
  with check (public.is_gym_owner(gym_id));

create function public.create_member_with_initial_payment(
  p_membership_plan_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text default null,
  p_phone text default null
)
returns public.members
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_plan public.membership_plans%rowtype;
  created_member public.members%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to add a member.';
  end if;

  select * into selected_plan
  from public.membership_plans as membership_plan
  where membership_plan.id = p_membership_plan_id
    and membership_plan.is_active;

  if not found then
    raise exception 'Select an active membership plan.';
  end if;

  if not public.is_gym_member(selected_plan.gym_id) then
    raise exception 'You do not have access to this gym.';
  end if;

  insert into public.members (
    gym_id,
    first_name,
    last_name,
    email,
    phone,
    plan_name,
    membership_plan_id,
    next_due
  ) values (
    selected_plan.gym_id,
    trim(p_first_name),
    trim(coalesce(p_last_name, '')),
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    selected_plan.name,
    selected_plan.id,
    (current_date + interval '1 month')::date
  ) returning * into created_member;

  insert into public.payments (
    gym_id,
    member_id,
    amount,
    due_date,
    paid_at,
    status
  ) values (
    selected_plan.gym_id,
    created_member.id,
    selected_plan.price,
    current_date,
    now(),
    'paid'
  );

  return created_member;
end;
$$;

revoke all on function public.create_member_with_initial_payment(uuid, text, text, text, text) from public, anon;
grant execute on function public.create_member_with_initial_payment(uuid, text, text, text, text) to authenticated;