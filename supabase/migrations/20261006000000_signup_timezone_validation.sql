drop function public.create_member_with_initial_payment(uuid, text, text, text, text, numeric, date);

create function public.create_member_with_initial_payment(
  p_membership_plan_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text default null,
  p_phone text default null,
  p_admission_fee numeric default null,
  p_signup_date date default current_date,
  p_time_zone text default 'UTC'
)
returns public.members
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_plan public.membership_plans%rowtype;
  selected_gym public.gyms%rowtype;
  selected_admission_fee numeric(10, 2);
  created_member public.members%rowtype;
  signup_paid_at timestamptz;
  client_today date;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to add a member.';
  end if;

  client_today := (now() at time zone coalesce(nullif(p_time_zone, ''), 'UTC'))::date;
  if p_signup_date is null or p_signup_date > client_today then
    raise exception 'Signup date must be today or earlier.';
  end if;

  select * into selected_plan
  from public.membership_plans as membership_plan
  where membership_plan.id = p_membership_plan_id;

  if not found then
    raise exception 'Select an existing membership plan.';
  end if;

  if not public.is_gym_member(selected_plan.gym_id) then
    raise exception 'You do not have access to this gym.';
  end if;

  select * into selected_gym
  from public.gyms as gym
  where gym.id = selected_plan.gym_id;

  selected_admission_fee := coalesce(p_admission_fee, selected_gym.admission_fee);
  if selected_admission_fee < 0 then
    raise exception 'Admission fee must be zero or greater.';
  end if;

  signup_paid_at := (p_signup_date + time '12:00') at time zone 'UTC';

  insert into public.members (
    gym_id,
    first_name,
    last_name,
    email,
    phone,
    plan_name,
    membership_plan_id,
    joined_at,
    next_due
  ) values (
    selected_plan.gym_id,
    trim(p_first_name),
    trim(coalesce(p_last_name, '')),
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    selected_plan.name,
    selected_plan.id,
    p_signup_date,
    (p_signup_date + make_interval(months => selected_plan.duration_months))::date
  ) returning * into created_member;

  insert into public.payments (
    gym_id,
    member_id,
    amount,
    due_date,
    paid_at,
    status,
    payment_type
  ) values (
    selected_plan.gym_id,
    created_member.id,
    selected_plan.price,
    p_signup_date,
    signup_paid_at,
    'paid',
    'membership'
  );

  if selected_admission_fee > 0 then
    insert into public.payments (
      gym_id,
      member_id,
      amount,
      due_date,
      paid_at,
      status,
      payment_type
    ) values (
      selected_plan.gym_id,
      created_member.id,
      selected_admission_fee,
      p_signup_date,
      signup_paid_at,
      'paid',
      'admission'
    );
  end if;

  return created_member;
end;
$$;

revoke all on function public.create_member_with_initial_payment(uuid, text, text, text, text, numeric, date, text) from public, anon;
grant execute on function public.create_member_with_initial_payment(uuid, text, text, text, text, numeric, date, text) to authenticated;