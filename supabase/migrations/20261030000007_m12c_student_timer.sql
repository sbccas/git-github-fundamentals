-- Milestone 12c addition (owner approval 30 Oct 2026): the student's own active time for the remote-session timer.
-- ADDITIVE ONLY: one new function. Same definition as the faculty report (distinct 5-minute periods with a progress
-- change inside the window), so the student sees exactly the number faculty see.

-- SECURITY DEFINER: reads private.activity_log, which no API role can read (X1). Caller's own rows only (X5).
create function public.my_session_activity(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Please sign in first.' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > interval '24 hours' then
    raise exception 'Choose a time window of up to 24 hours.' using errcode = '22023';
  end if;
  return (
    select jsonb_build_object(
      'active_periods', count(distinct floor(extract(epoch from a.at) / 300)),
      'saves', count(*),
      'first_activity', min(a.at),
      'last_activity', max(a.at))
    from private.activity_log a
    where a.user_id = uid and a.at >= p_from and a.at < p_to);
end;
$$;

revoke all on function public.my_session_activity(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.my_session_activity(timestamptz, timestamptz) to authenticated;
