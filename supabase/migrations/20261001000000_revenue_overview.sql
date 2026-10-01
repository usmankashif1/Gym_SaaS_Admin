create function public.get_revenue_overview()
returns table (
  month_start date,
  monthly_revenue numeric,
  collected_today numeric,
  due_today numeric,
  overdue numeric
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
  with month_ranges as (
    select generate_series(
      coalesce(
        (select date_trunc('month', min(payment.paid_at))::date
         from public.payments as payment
         where payment.gym_id = current_gym_id and payment.status = 'paid'),
        date_trunc('month', now())::date
      ),
      date_trunc('month', now())::date,
      interval '1 month'
    )::date as month_start
  )
  select
    month_ranges.month_start,
    coalesce(sum(monthly_payment.amount), 0)::numeric,
    coalesce((
      select sum(today_payment.amount)
      from public.payments as today_payment
      where today_payment.gym_id = current_gym_id
        and today_payment.status = 'paid'
        and today_payment.paid_at >= date_trunc('day', now())
        and today_payment.paid_at < date_trunc('day', now()) + interval '1 day'
    ), 0)::numeric,
    coalesce((
      select sum(due_payment.amount)
      from public.payments as due_payment
      where due_payment.gym_id = current_gym_id
        and due_payment.status = 'pending'
        and due_payment.payment_type = 'membership'
        and due_payment.due_date = current_date
    ), 0)::numeric,
    coalesce((
      select sum(overdue_payment.amount)
      from public.payments as overdue_payment
      where overdue_payment.gym_id = current_gym_id
        and overdue_payment.status = 'pending'
        and overdue_payment.payment_type = 'membership'
        and overdue_payment.due_date < current_date
    ), 0)::numeric
  from month_ranges
  left join public.payments as monthly_payment
    on monthly_payment.gym_id = current_gym_id
    and monthly_payment.status = 'paid'
    and monthly_payment.paid_at >= month_ranges.month_start::timestamptz
    and monthly_payment.paid_at < (month_ranges.month_start + interval '1 month')::timestamptz
  group by month_ranges.month_start
  order by month_ranges.month_start desc;
end;
$$;

revoke all on function public.get_revenue_overview() from public, anon;
grant execute on function public.get_revenue_overview() to authenticated;