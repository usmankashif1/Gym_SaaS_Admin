create or replace function public.get_dashboard_metrics()
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
  order by membership.created_at, membership.gym_id
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