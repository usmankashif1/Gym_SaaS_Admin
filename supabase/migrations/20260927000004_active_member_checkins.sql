create or replace function public.record_member_check_in(p_member_id uuid)
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

  if selected_member.status <> 'active' then
    raise exception 'Only active members can check in.';
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