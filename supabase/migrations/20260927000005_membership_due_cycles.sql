create unique index payments_pending_member_due_unique_idx
  on public.payments(gym_id, member_id, due_date)
  where status = 'pending';

create function public.generate_due_membership_payments()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to load membership payments.';
  end if;

  insert into public.payments (gym_id, member_id, amount, due_date, status)
  select member.gym_id, member.id, membership_plan.price, member.next_due, 'pending'
  from public.members as member
  join public.membership_plans as membership_plan
    on membership_plan.id = member.membership_plan_id
    and membership_plan.gym_id = member.gym_id
  where member.status = 'active'
    and member.next_due <= current_date
    and exists (
      select 1
      from public.gym_memberships as membership
      where membership.gym_id = member.gym_id
        and membership.user_id = (select auth.uid())
    )
  on conflict (gym_id, member_id, due_date) where status = 'pending' do nothing;
end;
$$;

revoke all on function public.generate_due_membership_payments() from public, anon;
grant execute on function public.generate_due_membership_payments() to authenticated;

create function public.record_membership_payment(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_payment public.payments%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to record a payment.';
  end if;

  select payment.* into selected_payment
  from public.payments as payment
  where payment.id = p_payment_id
  for update;

  if not found or not public.is_gym_member(selected_payment.gym_id) then
    raise exception 'Payment not found in your gym.';
  end if;

  if selected_payment.status = 'paid' then
    return;
  end if;

  update public.payments
  set status = 'paid', paid_at = now()
  where id = selected_payment.id;

  update public.members
  set next_due = greatest(next_due, selected_payment.due_date) + interval '1 month'
  where id = selected_payment.member_id
    and gym_id = selected_payment.gym_id;
end;
$$;

revoke all on function public.record_membership_payment(uuid) from public, anon;
grant execute on function public.record_membership_payment(uuid) to authenticated;

revoke insert, update, delete on public.payments from authenticated;