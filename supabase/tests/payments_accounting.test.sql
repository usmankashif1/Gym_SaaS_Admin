begin;

create extension if not exists pgtap with schema extensions;

select plan(52);

create temporary table payment_audit_fixture as
select
  (select id from auth.users order by created_at, id limit 1) as user_id,
  gen_random_uuid() as gym_id,
  gen_random_uuid() as other_gym_id,
  gen_random_uuid() as empty_gym_id,
  gen_random_uuid() as plan_id,
  gen_random_uuid() as other_plan_id,
  gen_random_uuid() as due_today_member_id,
  gen_random_uuid() as overdue_member_id,
  gen_random_uuid() as future_member_id,
  gen_random_uuid() as signup_member_id,
  gen_random_uuid() as duplicate_member_id,
  gen_random_uuid() as inactive_member_id,
  gen_random_uuid() as other_gym_member_id,
  gen_random_uuid() as rollover_member_id,
  gen_random_uuid() as rollover_payment_id,
  gen_random_uuid() as paid_today_id,
  gen_random_uuid() as paid_previous_month_id,
  gen_random_uuid() as paid_next_month_id,
  gen_random_uuid() as signup_membership_payment_id,
  gen_random_uuid() as signup_admission_payment_id,
  gen_random_uuid() as duplicate_membership_payment_id,
  gen_random_uuid() as duplicate_membership_payment_2_id,
  gen_random_uuid() as duplicate_admission_payment_id;

grant select on payment_audit_fixture to authenticated;

select ok((select user_id is not null from payment_audit_fixture), 'local auth user is available for the isolated fixture');

insert into public.gyms (id, name)
select gym_id, 'Payment Audit Primary' from payment_audit_fixture
union all
select other_gym_id, 'Payment Audit Secondary' from payment_audit_fixture
union all
select empty_gym_id, 'Payment Audit Empty' from payment_audit_fixture;

insert into public.gym_memberships (gym_id, user_id, role, created_at)
select gym_id, user_id, 'owner', '1900-01-01 00:00:00+00'::timestamptz from payment_audit_fixture
union all
select other_gym_id, user_id, 'staff', '1900-01-02 00:00:00+00'::timestamptz from payment_audit_fixture
union all
select empty_gym_id, user_id, 'staff', '1900-01-03 00:00:00+00'::timestamptz from payment_audit_fixture;

insert into public.membership_plans (id, gym_id, name, price)
select plan_id, gym_id, 'Audit plan', 19.95 from payment_audit_fixture
union all
select other_plan_id, other_gym_id, 'Other gym plan', 500.00 from payment_audit_fixture;

insert into public.members (id, gym_id, first_name, last_name, plan_name, membership_plan_id, next_due, status)
select due_today_member_id, gym_id, 'Due', 'Today', 'Audit plan', plan_id, current_date, 'active' from payment_audit_fixture
union all
select overdue_member_id, gym_id, 'Overdue', 'Member', 'Audit plan', plan_id, current_date - 1, 'active' from payment_audit_fixture
union all
select future_member_id, gym_id, 'Future', 'Member', 'Audit plan', plan_id, current_date + 1, 'active' from payment_audit_fixture
union all
select signup_member_id, gym_id, 'Signup', 'Member', 'Audit plan', plan_id, current_date + 1, 'active' from payment_audit_fixture
union all
select duplicate_member_id, gym_id, 'Multiple', 'Payments', 'Audit plan', plan_id, current_date + 1, 'active' from payment_audit_fixture
union all
select inactive_member_id, gym_id, 'Inactive', 'Member', 'Audit plan', plan_id, current_date - 3, 'inactive' from payment_audit_fixture
union all
select rollover_member_id, gym_id, 'Rollover', 'Member', 'Audit plan', plan_id, date '2024-01-31', 'inactive' from payment_audit_fixture
union all
select other_gym_member_id, other_gym_id, 'Other', 'Gym', 'Other gym plan', other_plan_id, current_date, 'active' from payment_audit_fixture;

insert into public.payments (id, gym_id, member_id, amount, due_date, status, payment_type, paid_at)
select signup_membership_payment_id, gym_id, signup_member_id, 35.75, current_date, 'paid', 'membership', date_trunc('month', now()) from payment_audit_fixture
union all
select signup_admission_payment_id, gym_id, signup_member_id, 5.25, current_date, 'paid', 'admission', date_trunc('month', now()) from payment_audit_fixture
union all
select paid_today_id, gym_id, due_today_member_id, 3.33, current_date, 'paid', 'membership', now() from payment_audit_fixture
union all
select paid_previous_month_id, gym_id, signup_member_id, 100.00, current_date - 1, 'paid', 'membership', date_trunc('month', now()) - interval '1 second' from payment_audit_fixture
union all
select paid_next_month_id, gym_id, signup_member_id, 200.00, current_date + 1, 'paid', 'membership', date_trunc('month', now()) + interval '1 month' from payment_audit_fixture
union all
select duplicate_membership_payment_id, gym_id, duplicate_member_id, 2.00, current_date + 2, 'paid', 'membership', now() from payment_audit_fixture
union all
select duplicate_membership_payment_2_id, gym_id, duplicate_member_id, 3.00, current_date + 2, 'paid', 'membership', now() from payment_audit_fixture
union all
select duplicate_admission_payment_id, gym_id, duplicate_member_id, 4.00, current_date + 2, 'paid', 'admission', now() from payment_audit_fixture;

insert into public.payments (gym_id, member_id, amount, due_date, status, payment_type, paid_at)
select fixture.gym_id, fixture.duplicate_member_id, 1.00, current_date + 3, 'paid', 'membership', now()
from payment_audit_fixture as fixture
cross join generate_series(1, 12);

select set_config('request.jwt.claim.sub', (select user_id::text from payment_audit_fixture), true);
set local role authenticated;

select is(
  (select gym_id from public.gym_memberships where user_id = (select user_id from payment_audit_fixture) order by created_at, gym_id limit 1),
  (select gym_id from payment_audit_fixture),
  'selected gym is stable and matches dashboard metric selection'
);

select public.generate_due_membership_payments();

update public.membership_plans
set price = 99.99
where id = (select plan_id from payment_audit_fixture);

select is(
  (select count(*)::integer from public.payments where gym_id = (select gym_id from payment_audit_fixture) and status = 'pending' and due_date = current_date),
  1,
  'only active payments due today are generated'
);
select is(
  (select sum(amount) from public.payments where gym_id = (select gym_id from payment_audit_fixture) and status = 'pending' and due_date = current_date),
  19.95::numeric,
  'due-today amount preserves cents and the generated amount'
);
select is(
  (select count(*)::integer from public.payments where gym_id = (select gym_id from payment_audit_fixture) and status = 'pending' and due_date < current_date),
  1,
  'only active payments before today are overdue'
);
select is(
  (select sum(amount) from public.payments where gym_id = (select gym_id from payment_audit_fixture) and status = 'pending' and due_date < current_date),
  19.95::numeric,
  'overdue amount preserves cents and the generated amount'
);
select is(
  (select count(*)::integer from public.payments where gym_id = (select gym_id from payment_audit_fixture) and status = 'pending' and due_date > current_date),
  0,
  'future payments are not generated early'
);
select is(
  (select count(*)::integer from public.payments where gym_id = (select gym_id from payment_audit_fixture) and member_id = (select inactive_member_id from payment_audit_fixture)),
  0,
  'inactive members do not receive generated dues'
);
select is(
  (select count(*)::integer from public.payments where gym_id = (select other_gym_id from payment_audit_fixture) and status = 'pending' and due_date = current_date),
  1,
  'due generation is scoped to gyms where the user is a member'
);

select is((select active_members from public.get_dashboard_metrics()), 5::bigint, 'dashboard metrics use the deterministically selected gym');
select is((select due_today_amount from public.get_dashboard_metrics()), 19.95::numeric, 'dashboard due-today metric matches due payment rows');
select is((select overdue_amount from public.get_dashboard_metrics()), 19.95::numeric, 'dashboard overdue metric matches overdue payment rows');
select is((select revenue_this_month from public.get_dashboard_metrics()), 65.33::numeric, 'revenue includes current-month paid membership/admission rows and excludes month-boundary rows');

select is(
  (select count(*)::integer from public.payment_history where gym_id = (select gym_id from payment_audit_fixture) and member_id = (select signup_member_id from payment_audit_fixture) and due_date = current_date),
  1,
  'the exact signup membership/admission pair is shown as one history row'
);
select is(
  (select payment_type from public.payment_history where gym_id = (select gym_id from payment_audit_fixture) and member_id = (select signup_member_id from payment_audit_fixture) and due_date = current_date),
  'combined'::text,
  'signup history row is labeled combined'
);
select is(
  (select amount from public.payment_history where gym_id = (select gym_id from payment_audit_fixture) and member_id = (select signup_member_id from payment_audit_fixture) and due_date = current_date),
  41.00::numeric,
  'combined history amount equals the two persisted signup charges'
);
select is(
  (select admission_fee_amount from public.payment_history where gym_id = (select gym_id from payment_audit_fixture) and member_id = (select signup_member_id from payment_audit_fixture) and due_date = current_date),
  5.25::numeric,
  'combined history retains the admission-fee breakdown'
);
select is(
  (select count(*)::integer from public.payment_history where gym_id = (select gym_id from payment_audit_fixture) and member_id = (select duplicate_member_id from payment_audit_fixture) and due_date = current_date + 2),
  3,
  'extra same-day payment rows are not incorrectly grouped'
);
select is(
  (select count(*)::integer from public.payment_history where gym_id = (select gym_id from payment_audit_fixture) and member_id = (select duplicate_member_id from payment_audit_fixture) and due_date = current_date + 2 and payment_type = 'combined'),
  0,
  'non-exact signup groups remain individual history rows'
);
select is(
  (select count(*)::integer from (select id from public.payment_history where gym_id = (select gym_id from payment_audit_fixture) and member_id = (select duplicate_member_id from payment_audit_fixture) and due_date = current_date + 3 order by id limit 10) as page_one),
  10,
  'first history page returns the expected page size'
);
select is(
  (select count(*)::integer from (select id from public.payment_history where gym_id = (select gym_id from payment_audit_fixture) and member_id = (select duplicate_member_id from payment_audit_fixture) and due_date = current_date + 3 order by id limit 10 offset 10) as page_two),
  2,
  'second history page returns the remaining rows without loss'
);

select public.record_membership_payment((select id from public.payments where gym_id = (select gym_id from payment_audit_fixture) and member_id = (select due_today_member_id from payment_audit_fixture) and status = 'pending' and due_date = current_date));
select is(
  (select status from public.payments where gym_id = (select gym_id from payment_audit_fixture) and member_id = (select due_today_member_id from payment_audit_fixture) and due_date = current_date and status = 'paid' order by paid_at desc limit 1),
  'paid'::text,
  'recording a payment moves the due row to paid'
);
select is((select due_today_amount from public.get_dashboard_metrics()), 0::numeric, 'recorded payment no longer contributes to due-today amount');
select is((select revenue_this_month from public.get_dashboard_metrics()), 85.28::numeric, 'recorded payment is included in current-month revenue once');
select public.record_membership_payment((select id from public.payments where gym_id = (select gym_id from payment_audit_fixture) and member_id = (select due_today_member_id from payment_audit_fixture) and amount = 19.95 and status = 'paid' order by paid_at desc limit 1));
select is((select next_due from public.members where id = (select due_today_member_id from payment_audit_fixture)), (current_date + interval '1 month')::date, 'recording an already-paid row again does not advance the due date');
select is((select revenue_this_month from public.get_dashboard_metrics()), 85.28::numeric, 'recording an already-paid row again does not duplicate revenue');

select public.record_membership_payment((select id from public.payments where gym_id = (select gym_id from payment_audit_fixture) and member_id = (select overdue_member_id from payment_audit_fixture) and status = 'pending' and due_date = current_date - 1));
select is(
  (select status from public.payments where gym_id = (select gym_id from payment_audit_fixture) and member_id = (select overdue_member_id from payment_audit_fixture) and due_date = current_date - 1),
  'paid'::text,
  'recording an overdue payment moves it to paid'
);
select is((select overdue_amount from public.get_dashboard_metrics()), 0::numeric, 'recorded overdue amount is removed from recovery amount');
select is((select revenue_this_month from public.get_dashboard_metrics()), 105.23::numeric, 'recorded overdue payment is counted in revenue for its paid month');

reset role;
insert into public.payments (id, gym_id, member_id, amount, due_date, status)
select rollover_payment_id, gym_id, rollover_member_id, 19.95, date '2024-01-31', 'pending' from payment_audit_fixture;
update public.members set status = 'active' where id = (select rollover_member_id from payment_audit_fixture);
select set_config('request.jwt.claim.sub', (select user_id::text from payment_audit_fixture), true);
set local role authenticated;
select public.record_membership_payment((select rollover_payment_id from payment_audit_fixture));
select is((select status from public.payments where id = (select rollover_payment_id from payment_audit_fixture)), 'paid'::text, 'a month-end due can be recorded');
select is((select next_due from public.members where id = (select rollover_member_id from payment_audit_fixture)), date '2024-02-29', 'January 31 advances to leap-day February 29');

reset role;
update public.gym_memberships set created_at = '1899-01-01 00:00:00+00'::timestamptz where gym_id = (select empty_gym_id from payment_audit_fixture);
select set_config('request.jwt.claim.sub', (select user_id::text from payment_audit_fixture), true);
set local role authenticated;
select is((select active_members from public.get_dashboard_metrics()), 0::bigint, 'empty gym has zero active members');
select is((select revenue_this_month from public.get_dashboard_metrics()), 0::numeric, 'empty gym has zero revenue');
select is((select due_today_amount from public.get_dashboard_metrics()), 0::numeric, 'empty gym has zero due-today amount');
select is((select overdue_amount from public.get_dashboard_metrics()), 0::numeric, 'empty gym has zero overdue amount');

reset role;
update public.gym_memberships
set created_at = '1900-01-03 00:00:00+00'::timestamptz
where gym_id = (select empty_gym_id from payment_audit_fixture);
select set_config('request.jwt.claim.sub', (select user_id::text from payment_audit_fixture), true);
set local role authenticated;
select lives_ok(
  $$select public.create_member_with_initial_payment((select plan_id from payment_audit_fixture), 'DateAuditBackdate', 'Member', null, null, 5.25, current_date - 2)$$,
  'a signup dated two days ago is accepted'
);
select is(
  (select joined_at from public.members where first_name = 'DateAuditBackdate' and gym_id = (select gym_id from payment_audit_fixture)),
  current_date - 2,
  'member join date uses the selected signup date'
);
select is(
  (select next_due from public.members where first_name = 'DateAuditBackdate' and gym_id = (select gym_id from payment_audit_fixture)),
  (current_date - 2 + interval '1 month')::date,
  'first recurring due date is calculated from the selected signup date'
);
select is(
  (select count(*)::integer from public.payments where member_id = (select id from public.members where first_name = 'DateAuditBackdate' and gym_id = (select gym_id from payment_audit_fixture))),
  2,
  'backdated signup records membership and admission charges'
);
select is(
  (select count(*)::integer from public.payments where member_id = (select id from public.members where first_name = 'DateAuditBackdate' and gym_id = (select gym_id from payment_audit_fixture)) and due_date = current_date - 2),
  2,
  'both initial payment rows use the selected signup date'
);
select is(
  (select min((paid_at at time zone 'UTC')::date) from public.payments where member_id = (select id from public.members where first_name = 'DateAuditBackdate' and gym_id = (select gym_id from payment_audit_fixture))),
  current_date - 2,
  'initial paid timestamps preserve the selected calendar date in UTC'
);
select is(
  (select sum(amount) from public.payments where member_id = (select id from public.members where first_name = 'DateAuditBackdate' and gym_id = (select gym_id from payment_audit_fixture))),
  105.24::numeric,
  'backdated signup preserves the plan and admission amounts'
);
select is((select revenue_this_month from public.get_dashboard_metrics()), 230.42::numeric, 'backdated signup in the current month contributes to current-month revenue');
select lives_ok(
  $$select public.create_member_with_initial_payment((select plan_id from payment_audit_fixture), 'DateAuditToday', 'Member', null, null, 0, current_date)$$,
  'today is accepted and zero admission fee is valid'
);
select is(
  (select count(*)::integer from public.payments where member_id = (select id from public.members where first_name = 'DateAuditToday' and gym_id = (select gym_id from payment_audit_fixture)) and payment_type = 'admission'),
  0,
  'zero admission fee does not create an admission payment row'
);
select is((select revenue_this_month from public.get_dashboard_metrics()), 330.41::numeric, 'today signup without admission fee adds only the membership amount to revenue');
select throws_ok(
  $$select public.create_member_with_initial_payment((select plan_id from payment_audit_fixture), 'DateAuditFuture', 'Member', null, null, 0, current_date + 1)$$,
  'P0001',
  'Signup date must be today or earlier.',
  'future signup dates are rejected'
);
select throws_ok(
  $$select public.create_member_with_initial_payment((select plan_id from payment_audit_fixture), 'DateAuditNull', 'Member', null, null, 0, null::date)$$,
  'P0001',
  'Signup date must be today or earlier.',
  'null signup dates are rejected'
);
select lives_ok(
  $$select public.create_member_with_initial_payment((select plan_id from payment_audit_fixture), 'DateAuditMonthEnd', 'Member', null, null, 0, date '2024-01-31')$$,
  'historical month-end signup is accepted'
);
select is(
  (select next_due from public.members where first_name = 'DateAuditMonthEnd' and gym_id = (select gym_id from payment_audit_fixture)),
  date '2024-02-29',
  'a January 31 signup advances to leap-day February 29'
);
select is(
  (select min((paid_at at time zone 'UTC')::date) from public.payments where member_id = (select id from public.members where first_name = 'DateAuditMonthEnd' and gym_id = (select gym_id from payment_audit_fixture))),
  date '2024-01-31',
  'month-end signup payment timestamp preserves January 31'
);
select is((select revenue_this_month from public.get_dashboard_metrics()), 330.41::numeric, 'historical signup revenue is not counted in the current month');

select * from finish();
rollback;