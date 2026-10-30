-- Milestone 12c, part 2 — final MCQ exam marked on the server (docs/plans/MILESTONE-12C-SESSION-EXAM-PLAN.md §3).
-- ADDITIVE: three private tables and new functions. The question bank (with answers) is loaded by the owner from a
-- git-ignored file (M12C-D6); correct answers never reach a student's phone before faculty close the exam (M12C-D8).
-- Paper: per_unit random questions from each unit, options shuffled per student; server-clock deadline; answers saved
-- one by one (resume after reload); one attempt (M12C-D7, D9); faculty open and close by hand (D10); leaving the page
-- is counted, never blocked (D11). X1–X6 for every function.

-- ---------------------------------------------------------------------------------------------------------------
-- Tables (no API access)
-- ---------------------------------------------------------------------------------------------------------------
create table private.exam_questions (
  id integer generated always as identity primary key,
  unit integer not null check (unit between 1 and 5),
  question text not null check (char_length(question) between 1 and 1000),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4),
  correct integer not null check (correct between 0 and 3),
  explanation text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table private.exams (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  per_unit integer not null default 5 check (per_unit between 1 and 10),
  duration_minutes integer not null default 30 check (duration_minutes between 5 and 180),
  pass_percent integer not null default 40 check (pass_percent between 0 and 100),
  status text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  created_by bigint not null,
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  closed_at timestamptz
);

create table private.exam_attempts (
  exam_id uuid not null references private.exams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  paper jsonb not null,                       -- [{"q": question id, "o": [original option index in display order]}]
  answers jsonb not null default '{}',        -- {"<question id>": display index chosen}
  started_at timestamptz not null default now(),
  deadline timestamptz not null,
  submitted_at timestamptz,
  score integer,
  total integer,
  passed boolean,
  leave_count integer not null default 0,
  primary key (exam_id, user_id)
);

alter table private.exam_questions enable row level security;
alter table private.exams enable row level security;
alter table private.exam_attempts enable row level security;
revoke all on private.exam_questions, private.exams, private.exam_attempts from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- Helpers (SECURITY INVOKER, called only from the definer functions below; no API role — X3, X4)
-- ---------------------------------------------------------------------------------------------------------------
-- Marks an attempt with the answers saved so far (idempotent: an already submitted attempt is unchanged).
create function private.grade_attempt(p_exam uuid, p_user uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  ok integer;
  n integer;
  pass integer;
begin
  select count(*) filter (where a.answers ? (p.e ->> 'q')
                            and ((p.e -> 'o') ->> ((a.answers ->> (p.e ->> 'q'))::integer))::integer = q.correct),
         count(*)
    into ok, n
  from private.exam_attempts a
  cross join lateral jsonb_array_elements(a.paper) p(e)
  join private.exam_questions q on q.id = (p.e ->> 'q')::integer
  where a.exam_id = p_exam and a.user_id = p_user and a.submitted_at is null;
  if n is null or n = 0 then
    return;  -- nothing to mark (already submitted or no attempt)
  end if;
  select pass_percent into pass from private.exams where id = p_exam;
  update private.exam_attempts
     set submitted_at = least(now(), deadline), score = ok, total = n, passed = ok * 100 >= pass * n
   where exam_id = p_exam and user_id = p_user and submitted_at is null;
end;
$$;

-- The student's paper: questions in display order with options in display order — never the correct answer.
create function private.exam_paper(p_exam uuid, p_user uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'q', q.id, 'unit', q.unit, 'text', q.question,
      'options', (select jsonb_agg(q.options -> (o.v)::integer order by o.i)
                  from jsonb_array_elements_text(p.e -> 'o') with ordinality o(v, i)))
    order by p.i), '[]')
  from private.exam_attempts a
  cross join lateral jsonb_array_elements(a.paper) with ordinality p(e, i)
  join private.exam_questions q on q.id = (p.e ->> 'q')::integer
  where a.exam_id = p_exam and a.user_id = p_user
$$;

create function private.attempt_json(p_exam uuid, p_user uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'started_at', a.started_at, 'deadline', a.deadline, 'submitted_at', a.submitted_at,
    'answered', (select count(*) from jsonb_object_keys(a.answers)), 'answers', case when a.submitted_at is null then a.answers end,
    'score', a.score, 'total', a.total, 'passed', a.passed,
    'percent', case when a.total > 0 then round(a.score * 100.0 / a.total) end)
  from private.exam_attempts a where a.exam_id = p_exam and a.user_id = p_user
$$;

-- The exam a student sees: an open exam of their batch, otherwise the most recent closed one (for result and review).
create function private.student_exam(p_uid uuid)
returns private.exams
language sql
stable
set search_path = ''
as $$
  select e.* from private.exams e
  join public.profiles p on p.batch_id = e.batch_id and p.id = p_uid
  where e.status in ('open', 'closed')
  order by (e.status = 'open') desc, coalesce(e.opened_at, e.created_at) desc
  limit 1
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Student functions — SECURITY DEFINER: read the private exam tables, which no API role can read (X1); the caller is
-- auth.uid() only, never an id passed in (X5)
-- ---------------------------------------------------------------------------------------------------------------
create function public.exam_status()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  ex private.exams;
begin
  if uid is null then
    raise exception 'Please sign in first.' using errcode = '42501';
  end if;
  ex := private.student_exam(uid);
  if ex.id is null then
    return jsonb_build_object('server_now', now(), 'exam', null, 'attempt', null);
  end if;
  -- A paper whose time is up is marked now, so the result is ready even if the phone went offline.
  if exists (select 1 from private.exam_attempts a where a.exam_id = ex.id and a.user_id = uid
             and a.submitted_at is null and now() > a.deadline + interval '30 seconds') then
    perform private.grade_attempt(ex.id, uid);
  end if;
  return jsonb_build_object(
    'server_now', now(),
    'exam', jsonb_build_object('id', ex.id, 'title', ex.title, 'status', ex.status, 'duration_minutes', ex.duration_minutes,
                               'questions', ex.per_unit * 5, 'pass_percent', ex.pass_percent),
    'attempt', private.attempt_json(ex.id, uid));
end;
$$;

create function public.start_exam(p_exam uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  ex private.exams;
  paper jsonb;
begin
  if uid is null then
    raise exception 'Please sign in first.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles p where p.id = uid and p.consent_version = private.current_consent_version()) then
    raise exception 'Please accept the current consent first.' using errcode = '42501';
  end if;
  select e.* into ex from private.exams e join public.profiles p on p.batch_id = e.batch_id and p.id = uid
  where e.id = p_exam;
  if ex.id is null then
    raise exception 'This exam is not for your batch.' using errcode = '42501';
  end if;
  if not exists (select 1 from private.exam_attempts a where a.exam_id = ex.id and a.user_id = uid) then
    if ex.status <> 'open' then
      raise exception 'The exam is not open.' using errcode = '22023';
    end if;
    if exists (select 1 from generate_series(1, 5) u
               where (select count(*) from private.exam_questions q where q.active and q.unit = u) < ex.per_unit) then
      raise exception 'The question bank is not ready. Please tell your teacher.' using errcode = '22023';
    end if;
    -- per_unit random questions from each unit; options shuffled per question; question order shuffled.
    select jsonb_agg(jsonb_build_object('q', s.id,
             'o', (select jsonb_agg(x order by random()) from generate_series(0, 3) x where s.id is not null))
             order by random())
      into paper
    from (select q.id, row_number() over (partition by q.unit order by random()) as rn
          from private.exam_questions q where q.active) s
    where s.rn <= ex.per_unit;
    insert into private.exam_attempts (exam_id, user_id, paper, deadline)
    values (ex.id, uid, paper, now() + make_interval(mins => ex.duration_minutes))
    on conflict (exam_id, user_id) do nothing;  -- two taps at once: one paper
  end if;
  return jsonb_build_object('server_now', now(), 'exam', jsonb_build_object('id', ex.id, 'title', ex.title),
    'attempt', private.attempt_json(ex.id, uid),
    'questions', case when (select submitted_at from private.exam_attempts where exam_id = ex.id and user_id = uid) is null
                      then private.exam_paper(ex.id, uid) else '[]'::jsonb end);
end;
$$;

create function public.save_exam_answer(p_exam uuid, p_question integer, p_choice integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  att private.exam_attempts;
begin
  if uid is null then
    raise exception 'Please sign in first.' using errcode = '42501';
  end if;
  select * into att from private.exam_attempts where exam_id = p_exam and user_id = uid for update;
  if att.exam_id is null then
    raise exception 'Start the exam first.' using errcode = '22023';
  end if;
  if att.submitted_at is not null then
    return jsonb_build_object('ok', false, 'submitted', true);
  end if;
  if now() > att.deadline + interval '30 seconds' then  -- a short grace for slow networks
    perform private.grade_attempt(p_exam, uid);
    return jsonb_build_object('ok', false, 'time_up', true);
  end if;
  if p_choice is null or p_choice not between 0 and 3
     or not exists (select 1 from jsonb_array_elements(att.paper) p(e) where (p.e ->> 'q')::integer = p_question) then
    raise exception 'That answer is not valid.' using errcode = '22023';
  end if;
  update private.exam_attempts set answers = answers || jsonb_build_object(p_question::text, p_choice)
   where exam_id = p_exam and user_id = uid;
  return jsonb_build_object('ok', true, 'answered', (select count(*) from jsonb_object_keys(att.answers || jsonb_build_object(p_question::text, p_choice))));
end;
$$;

create function public.submit_exam(p_exam uuid)
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
  if not exists (select 1 from private.exam_attempts where exam_id = p_exam and user_id = uid) then
    raise exception 'Start the exam first.' using errcode = '22023';
  end if;
  perform private.grade_attempt(p_exam, uid);  -- idempotent
  return private.attempt_json(p_exam, uid);
end;
$$;

create function public.note_exam_leave(p_exam uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update private.exam_attempts set leave_count = leave_count + 1
  where exam_id = p_exam and user_id = auth.uid() and submitted_at is null and now() <= deadline
$$;

-- Review with correct answers: only after faculty close the exam (M12C-D8).
create function public.exam_review(p_exam uuid)
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
  if not exists (select 1 from private.exams e where e.id = p_exam and e.status = 'closed') then
    raise exception 'Answers are shown after your teacher closes the exam.' using errcode = '22023';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
        'text', q.question,
        'options', (select jsonb_agg(q.options -> (o.v)::integer order by o.i) from jsonb_array_elements_text(p.e -> 'o') with ordinality o(v, i)),
        'chosen', (a.answers ->> (p.e ->> 'q'))::integer,
        'correct', (select o.i - 1 from jsonb_array_elements_text(p.e -> 'o') with ordinality o(v, i) where o.v::integer = q.correct),
        'explanation', q.explanation)
      order by p.i)
    from private.exam_attempts a
    cross join lateral jsonb_array_elements(a.paper) with ordinality p(e, i)
    join private.exam_questions q on q.id = (p.e ->> 'q')::integer
    where a.exam_id = p_exam and a.user_id = uid and a.submitted_at is not null), '[]');
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Faculty functions — SECURITY DEFINER (X1); allowlisted faculty linked to the exam's batch only (R3, X5)
-- ---------------------------------------------------------------------------------------------------------------
create function public.faculty_exam_bank()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_faculty() then
    raise exception 'This is for course faculty only.' using errcode = '42501';
  end if;
  return (select jsonb_object_agg(u::text, (select count(*) from private.exam_questions q where q.active and q.unit = u))
          from generate_series(1, 5) u);
end;
$$;

create function public.faculty_exam_create(p_batch uuid, p_title text, p_per_unit integer, p_minutes integer, p_pass integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if not private.can_see_batch(p_batch) then
    raise exception 'Batch not found.' using errcode = '42501';
  end if;
  insert into private.exams (batch_id, title, per_unit, duration_minutes, pass_percent, created_by)
  values (p_batch, btrim(coalesce(p_title, '')), coalesce(p_per_unit, 5), coalesce(p_minutes, 30), coalesce(p_pass, 40),
          private.current_github_id())
  returning id into new_id;
  return jsonb_build_object('id', new_id);
end;
$$;

create function public.faculty_exams(p_batch uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_see_batch(p_batch) then
    raise exception 'Batch not found.' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', e.id, 'title', e.title, 'status', e.status, 'questions', e.per_unit * 5, 'duration_minutes', e.duration_minutes,
      'pass_percent', e.pass_percent, 'created_at', e.created_at, 'opened_at', e.opened_at, 'closed_at', e.closed_at,
      'students', (select count(*) from public.profiles p where p.batch_id = e.batch_id),
      'started', (select count(*) from private.exam_attempts a where a.exam_id = e.id),
      'submitted', (select count(*) from private.exam_attempts a where a.exam_id = e.id and a.submitted_at is not null),
      'passed', (select count(*) from private.exam_attempts a where a.exam_id = e.id and a.passed),
      'average_percent', (select round(avg(a.score * 100.0 / nullif(a.total, 0))) from private.exam_attempts a
                          where a.exam_id = e.id and a.submitted_at is not null))
      order by e.created_at desc)
    from private.exams e where e.batch_id = p_batch), '[]');
end;
$$;

create function public.faculty_exam_set_status(p_exam uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  ex private.exams;
  r record;
begin
  select * into ex from private.exams where id = p_exam;
  if ex.id is null or not private.can_see_batch(ex.batch_id) then
    raise exception 'Exam not found.' using errcode = '42501';
  end if;
  if p_status = 'open' then
    if exists (select 1 from generate_series(1, 5) u
               where (select count(*) from private.exam_questions q where q.active and q.unit = u) < ex.per_unit) then
      raise exception 'Load the question bank first (at least % questions per unit).', ex.per_unit using errcode = '22023';
    end if;
    update private.exams set status = 'open', opened_at = coalesce(opened_at, now()), closed_at = null where id = p_exam;
  elsif p_status = 'closed' then
    update private.exams set status = 'closed', closed_at = now() where id = p_exam;
    for r in select user_id from private.exam_attempts where exam_id = p_exam and submitted_at is null loop
      perform private.grade_attempt(p_exam, r.user_id);  -- unfinished papers are marked with the saved answers
    end loop;
  else
    raise exception 'Status must be open or closed.' using errcode = '22023';
  end if;
  return jsonb_build_object('status', p_status);
end;
$$;

create function public.faculty_exam_results(p_exam uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  ex private.exams;
begin
  select * into ex from private.exams where id = p_exam;
  if ex.id is null or not private.can_see_batch(ex.batch_id) then
    raise exception 'Exam not found.' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'roll_no', p.roll_no, 'display_name', p.display_name, 'github_username', p.github_username,
      'state', case when a.user_id is null then 'not_started' when a.submitted_at is null then 'in_progress' else 'submitted' end,
      'started_at', a.started_at, 'submitted_at', a.submitted_at,
      'answered', (select count(*) from jsonb_object_keys(coalesce(a.answers, '{}'))),
      'score', a.score, 'total', a.total, 'passed', a.passed,
      'percent', case when a.total > 0 then round(a.score * 100.0 / a.total) end,
      'minutes', case when a.submitted_at is not null then round(extract(epoch from a.submitted_at - a.started_at) / 60.0, 1) end,
      'leave_count', a.leave_count)
      order by p.roll_no nulls last, lower(p.display_name))
    from public.profiles p
    left join private.exam_attempts a on a.exam_id = ex.id and a.user_id = p.id
    where p.batch_id = ex.batch_id
      and p.github_id not in (select github_id from private.faculty_allowlist)), '[]');
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Function privileges (X3)
-- ---------------------------------------------------------------------------------------------------------------
revoke all on function private.grade_attempt(uuid, uuid) from public, anon, authenticated;
revoke all on function private.exam_paper(uuid, uuid) from public, anon, authenticated;
revoke all on function private.attempt_json(uuid, uuid) from public, anon, authenticated;
revoke all on function private.student_exam(uuid) from public, anon, authenticated;
revoke all on function public.exam_status() from public, anon, authenticated;
revoke all on function public.start_exam(uuid) from public, anon, authenticated;
revoke all on function public.save_exam_answer(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.submit_exam(uuid) from public, anon, authenticated;
revoke all on function public.note_exam_leave(uuid) from public, anon, authenticated;
revoke all on function public.exam_review(uuid) from public, anon, authenticated;
revoke all on function public.faculty_exam_bank() from public, anon, authenticated;
revoke all on function public.faculty_exam_create(uuid, text, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.faculty_exams(uuid) from public, anon, authenticated;
revoke all on function public.faculty_exam_set_status(uuid, text) from public, anon, authenticated;
revoke all on function public.faculty_exam_results(uuid) from public, anon, authenticated;
grant execute on function public.exam_status() to authenticated;
grant execute on function public.start_exam(uuid) to authenticated;
grant execute on function public.save_exam_answer(uuid, integer, integer) to authenticated;
grant execute on function public.submit_exam(uuid) to authenticated;
grant execute on function public.note_exam_leave(uuid) to authenticated;
grant execute on function public.exam_review(uuid) to authenticated;
grant execute on function public.faculty_exam_bank() to authenticated;
grant execute on function public.faculty_exam_create(uuid, text, integer, integer, integer) to authenticated;
grant execute on function public.faculty_exams(uuid) to authenticated;
grant execute on function public.faculty_exam_set_status(uuid, text) to authenticated;
grant execute on function public.faculty_exam_results(uuid) to authenticated;
