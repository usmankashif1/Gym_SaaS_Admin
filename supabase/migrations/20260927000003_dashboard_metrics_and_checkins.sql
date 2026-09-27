create table public.member_check_ins (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null,
  check_in_date date not null default current_date,
  checked_in_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users(id),
  foreign key (gym_id, member_id) references public.members(gym_id, id) on delete cascade,
  unique (gym_id, member_id, check_in_date)
);

create index member_check_ins_gym_date_idx
  on public.member_check_ins(gym_id, check_in_date);

alter table public.member_check_ins enable row level security;
grant select on public.member_check_ins to authenticated;

create policy "Gym members can read check-ins"
  on public.member_check_ins for select to authenticated
  using (public.is_gym_member(gym_id));

create function public.record_member_check_in(p_member_id uuid)
returns public.member_check_ins
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_member public.members%rowtype;
  check_in public.member_check_ins%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to check in a member.';
  end if;

  select * into selected_member
  from public.members as member
  where member.id = p_member_id;

  if not found or not public.is_gym_member(selected_member.gym_id) then
    raise exception 'Member not found in your gym.';
  end if;

  insert into public.member_check_ins (gym_id, member_id, created_by)
  values (selected_member.gym_id, selected_member.id, (select auth.uid()))
  on conflict (gym_id, member_id, check_in_date) do update
    set checked_in_at = excluded.checked_in_at,
        created_by = excluded.created_by
  returning * into check_in;

  return check_in;
end;
$$;

revoke all on function public.record_member_check_in(uuid) from public, anon;
grant execute on function public.record_member_check_in(uuid) to authenticated;

create function public.get_dashboard_metrics()
returns table (
  active_members bigint,
  check_ins_today bigint,
  revenue_this_month numeric,
  overdue_amount numeric,
  due_today_amount numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_gym_id uuid;
begin
  select membership.gym_id into current_gym_id
  from public.gym_memberships as membership
  where membership.user_id = (select auth.uid())
  order by membership.created_at
  limit 1;

  if current_gym_id is null then
    raise exception 'No gym workspace is associated with this account.';
  end if;

  return query
  select
    (select count(*) from public.members as member
      where member.gym_id = current_gym_id and member.status = 'active'),
    (select count(*) from public.member_check_ins as check_in
      where check_in.gym_id = current_gym_id and check_in.check_in_date = current_date),
    coalesce((select sum(payment.amount) from public.payments as payment
      where payment.gym_id = current_gym_id
        and payment.status = 'paid'
        and payment.paid_at >= date_trunc('month', now())
        and payment.paid_at < date_trunc('month', now()) + interval '1 month'), 0),
    coalesce((select sum(payment.amount) from public.payments as payment
      where payment.gym_id = current_gym_id
        and payment.status = 'pending'
        and payment.due_date < current_date), 0),
    coalesce((select sum(payment.amount) from public.payments as payment
      where payment.gym_id = current_gym_id
        and payment.status = 'pending'
        and payment.due_date = current_date), 0);
end;
$$;

revoke all on function public.get_dashboard_metrics() from public, anon;
grant execute on function public.get_dashboard_metrics() to authenticated;