-- Milestone 12b — participant counter and "Request to join" (docs/plans/MILESTONE-12B-COUNTER-REQUESTS-PLAN.md).
-- ADDITIVE ONLY (plan §5.1): a new table and new functions, one extra field in account_status() and export_my_data();
-- nothing the live site already uses changes behaviour. X1–X6 for every new function.

-- ---------------------------------------------------------------------------------------------------------------
-- Participant counter (§3.1): totals only, never names; faculty not counted; hidden below 20 students (M12B-D2)
-- ---------------------------------------------------------------------------------------------------------------
-- SECURITY DEFINER: counts every profile and progress row, which no API role can read (X1). The only function a
-- signed-out visitor may call (M12B-D3); it returns four numbers or {"visible": false}.
create function public.course_stats()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with students as (
    select p.id, p.batch_id from public.profiles p
    where not exists (select 1 from private.faculty_allowlist f where f.github_id = p.github_id)
  ), total as (select count(*) as n from students)
  select case
    when (select n from total) < 20 then jsonb_build_object('visible', false)  -- M12B-D2 minimum
    else jsonb_build_object(
      'visible', true,
      'students', (select n from total),
      'classes', (select count(distinct s.batch_id) from students s where s.batch_id is not null),
      'quizzes_passed', (select count(*) from public.progress g join students s on s.id = g.user_id,
                           jsonb_each(coalesce(g.doc -> 'units', '{}')) u
                         where (u.value -> 'quiz' ->> 'passed')::boolean is true),
      'missions_completed', (select count(*) from public.progress g join students s on s.id = g.user_id,
                               jsonb_each(coalesce(g.doc -> 'missions', '{}')) m
                             where (m.value ->> 'done')::boolean is true))
  end
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Join requests (§3.2)
-- ---------------------------------------------------------------------------------------------------------------
create table private.join_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  programme text not null,
  year integer not null check (year between 1 and 3),
  division text check (division is null or division ~ '^[A-Z0-9 -]{1,10}$'),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at timestamptz not null default now(),
  handled_by bigint,
  handled_at timestamptz,
  batch_id uuid references public.batches (id) on delete set null
);
create unique index join_requests_one_pending on private.join_requests (user_id) where status = 'pending';
alter table private.join_requests enable row level security;
revoke all on private.join_requests from public, anon, authenticated;

-- The caller's latest request, for the account page.
create function private.my_latest_request(p_uid uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object('status', r.status, 'programme', r.programme, 'year', r.year, 'division', r.division,
                            'created_at', r.created_at,
                            'batch_name', (select b.name from public.batches b where b.id = r.batch_id))
  from private.join_requests r
  where r.user_id = p_uid
  order by r.created_at desc, r.id desc
  limit 1
$$;

-- SECURITY DEFINER: writes private.join_requests (X1). Student with current consent and a roll number, not in a batch.
create function public.request_to_join(p_year integer, p_division text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  prof public.profiles;
  div text := nullif(upper(btrim(regexp_replace(coalesce(p_division, ''), '\s+', ' ', 'g'))), '');
begin
  if uid is null then
    raise exception 'Please sign in first.' using errcode = '42501';
  end if;
  select * into prof from public.profiles p
  where p.id = uid and p.consent_version = private.current_consent_version();
  if prof.id is null then
    raise exception 'Please accept the current consent first.' using errcode = '42501';
  end if;
  if prof.roll_no is null then
    raise exception 'Please add your roll number / SID to your profile first.' using errcode = '22023';
  end if;
  if prof.batch_id is not null then
    raise exception 'You are already in a batch.' using errcode = '22023';
  end if;
  if p_year is null or p_year not between 1 and 3 then
    raise exception 'Please choose your year.' using errcode = '22023';
  end if;
  if div is not null and div !~ '^[A-Z0-9 -]{1,10}$' then
    raise exception 'Division: up to 10 letters, digits, spaces or -.' using errcode = '22023';
  end if;
  insert into private.join_requests (user_id, programme, year, division)
  values (uid, prof.programme, p_year, div)
  on conflict (user_id) where status = 'pending' do nothing;  -- one pending request: a repeat returns it unchanged
  return private.my_latest_request(uid);
end;
$$;

-- SECURITY DEFINER: updates private.join_requests (X1). Caller's own pending request only.
create function public.withdraw_request()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Please sign in first.' using errcode = '42501';
  end if;
  update private.join_requests set status = 'withdrawn' where user_id = uid and status = 'pending';
  return private.my_latest_request(uid);
end;
$$;

-- SECURITY DEFINER: reads requests and the requesting students' profiles (X1). All faculty see all pending requests
-- (M12B-D6); no email or account ids.
create function public.faculty_join_requests()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_faculty() then
    raise exception 'This is for course faculty only.' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'display_name', p.display_name, 'roll_no', p.roll_no, 'github_username', p.github_username,
      'programme', r.programme, 'year', r.year, 'division', r.division, 'created_at', r.created_at
    ) order by r.created_at)
    from private.join_requests r join public.profiles p on p.id = r.user_id
    where r.status = 'pending'), '[]');
end;
$$;

-- SECURITY DEFINER: moves a student into one of the caller's batches or declines (X1). Uses the request id, never a
-- user id (X5); "accept" only into a batch the caller is linked to (M12B-D7, R3).
create function public.faculty_handle_request(p_request bigint, p_action text, p_batch uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  req private.join_requests;
begin
  if not private.is_faculty() then
    raise exception 'This is for course faculty only.' using errcode = '42501';
  end if;
  select * into req from private.join_requests where id = p_request and status = 'pending' for update;
  if req.id is null then
    raise exception 'This request is no longer pending.' using errcode = '22023';
  end if;
  if p_action = 'accept' then
    if p_batch is null or not private.can_see_batch(p_batch) then
      raise exception 'Batch not found.' using errcode = '42501';
    end if;
    update public.profiles set batch_id = p_batch where id = req.user_id;
    update private.join_requests
       set status = 'accepted', handled_by = private.current_github_id(), handled_at = now(), batch_id = p_batch
     where id = req.id;
  elsif p_action = 'decline' then
    update private.join_requests
       set status = 'declined', handled_by = private.current_github_id(), handled_at = now()
     where id = req.id;
  else
    raise exception 'Unknown action.' using errcode = '22023';
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Existing functions, extended by one field each (additive)
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.account_status()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Please sign in first.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'has_profile', exists (select 1 from public.profiles where id = uid),
    'consent_current', exists (select 1 from public.profiles
                               where id = uid and consent_version = private.current_consent_version()),
    'current_consent_version', private.current_consent_version(),
    'deletion_requested', exists (select 1 from private.deletion_requests where user_id = uid),
    'is_faculty', private.is_faculty(),
    'batch_name', (select b.name from public.profiles p join public.batches b on b.id = p.batch_id where p.id = uid),
    'request', private.my_latest_request(uid));
end;
$$;

create or replace function public.export_my_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Please sign in first.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'exported_at', now(),
    'sign_in_record', (
      select jsonb_build_object(
        'email', u.email,
        'provider', u.raw_app_meta_data ->> 'provider',
        'created_at', u.created_at,
        'last_sign_in_at', u.last_sign_in_at)
      from auth.users u where u.id = uid),
    'profile', (select to_jsonb(p) - 'batch_id' from public.profiles p where p.id = uid),
    'batch', (select b.name from public.profiles p join public.batches b on b.id = p.batch_id where p.id = uid),
    'join_requests', coalesce((select jsonb_agg(jsonb_build_object('programme', r.programme, 'year', r.year,
                                 'division', r.division, 'status', r.status, 'created_at', r.created_at,
                                 'handled_at', r.handled_at) order by r.created_at)
                               from private.join_requests r where r.user_id = uid), '[]'),
    'progress', (select jsonb_build_object('doc', g.doc, 'xp', g.xp, 'revision', g.revision,
                                           'updated_at', g.updated_at)
                 from public.progress g where g.user_id = uid),
    'not_included', 'Other students'' data and class results; Supabase security and sign-in logs (ask the college); '
      || 'your GitHub authorisation of this app (GitHub → Settings → Applications); progress on your devices that '
      || 'was never saved online.'
  );
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Function privileges (X3): course_stats is the one function open to signed-out visitors
-- ---------------------------------------------------------------------------------------------------------------
revoke all on function public.course_stats() from public, anon, authenticated;
revoke all on function private.my_latest_request(uuid) from public, anon, authenticated;
revoke all on function public.request_to_join(integer, text) from public, anon, authenticated;
revoke all on function public.withdraw_request() from public, anon, authenticated;
revoke all on function public.faculty_join_requests() from public, anon, authenticated;
revoke all on function public.faculty_handle_request(bigint, text, uuid) from public, anon, authenticated;
revoke all on function public.account_status() from public, anon, authenticated;
revoke all on function public.export_my_data() from public, anon, authenticated;
grant execute on function public.course_stats() to anon, authenticated;
grant execute on function public.request_to_join(integer, text) to authenticated;
grant execute on function public.withdraw_request() to authenticated;
grant execute on function public.faculty_join_requests() to authenticated;
grant execute on function public.faculty_handle_request(bigint, text, uuid) to authenticated;
grant execute on function public.account_status() to authenticated;
grant execute on function public.export_my_data() to authenticated;
