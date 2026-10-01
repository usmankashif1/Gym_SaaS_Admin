create view public.payment_history with (security_invoker = true) as
with paid_rows as (
  select
    payment.*,
    count(*) over (partition by payment.member_id, payment.due_date) as payments_on_date,
    count(*) filter (where payment.payment_type = 'membership') over (partition by payment.member_id, payment.due_date) as membership_count,
    count(*) filter (where payment.payment_type = 'admission') over (partition by payment.member_id, payment.due_date) as admission_count
  from public.payments as payment
  where payment.status = 'paid'
), identified_rows as (
  select
    paid_rows.*,
    case
      when payments_on_date = 2 and membership_count = 1 and admission_count = 1
        then 'signup:' || member_id::text || ':' || due_date::text
      else 'payment:' || id::text
    end as group_id
  from paid_rows
), grouped_payments as (
  select
    group_id as id,
    gym_id,
    member_id,
    sum(amount)::numeric(10, 2) as amount,
    min(due_date) as due_date,
    max(paid_at) as paid_at,
    case when count(*) > 1 then 'combined' else max(payment_type) end as payment_type,
    sum(amount) filter (where payment_type = 'membership') as membership_amount,
    sum(amount) filter (where payment_type = 'admission') as admission_fee_amount
  from identified_rows
  group by group_id, gym_id, member_id
)
select
  grouped_payments.*,
  member.first_name,
  member.last_name,
  member.plan_name,
  membership_plan.name as membership_plan_name
from grouped_payments
join public.members as member
  on member.id = grouped_payments.member_id
  and member.gym_id = grouped_payments.gym_id
left join public.membership_plans as membership_plan
  on membership_plan.id = member.membership_plan_id
  and membership_plan.gym_id = grouped_payments.gym_id;

grant select on public.payment_history to authenticated;