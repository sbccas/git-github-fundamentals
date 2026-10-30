-- Tests for Milestone 12c part 2 (final exam, marked on the server) — LOCAL ONLY: run by `npm run sql-check`.
-- Never run on the live project (it stops itself there). Uses its own TEST questions, removed at the end.

do $$
begin
  if not exists (select 1 from private.environment where name = 'test') then
    raise exception 'Stop: this project is not marked as the test environment.';
  end if;
end
$$;

drop table if exists pg_temp.t_results;
create temp table t_results (n serial primary key, id text not null, ok boolean not null, detail text);
create or replace function pg_temp.check(p_id text, p_ok boolean, p_detail text)
returns void language sql as $$
  insert into t_results (id, ok, detail) values (p_id, coalesce(p_ok, false), left(p_detail, 300))
$$;
create or replace function pg_temp.as_user(p_uid uuid, p_sql text)
returns text language plpgsql as $$
declare
  v text;
begin
  begin
    if p_uid is null then
      perform set_config('request.jwt.claims', '{"role": "anon"}', true);
      set local role anon;
    else
      perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
      set local role authenticated;
    end if;
    execute p_sql into v;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    return coalesce(v, 'null');
  exception when others then
    reset role;
    perform set_config('request.jwt.claims', '', true);
    return 'ERROR ' || sqlstate || ': ' || sqlerrm;
  end;
end;
$$;
create or replace function pg_temp.js(t text)
returns jsonb language plpgsql as $$
begin
  return t::jsonb;
exception when others then
  return null;
end;
$$;

drop table if exists pg_temp.t_users;
create temp table t_users (label text primary key, id uuid, gh bigint, username text);
insert into t_users values
  ('S1', 'c7000000-0000-4000-8000-000000000061', 990000061, 'gg-test-exam-1'),
  ('S2', 'c7000000-0000-4000-8000-000000000062', 990000062, 'gg-test-exam-2'),
  ('S3', 'c7000000-0000-4000-8000-000000000063', 990000063, 'gg-test-exam-3'),
  ('S4', 'c7000000-0000-4000-8000-000000000064', 990000064, 'gg-test-exam-4'),
  ('S5', 'c7000000-0000-4000-8000-000000000065', 990000065, 'gg-test-exam-5'),
  ('S6', 'c7000000-0000-4000-8000-000000000066', 990000066, 'gg-test-exam-6'),
  ('X',  'c7000000-0000-4000-8000-000000000071', 990000071, 'gg-test-faculty-x4'),
  ('Y',  'c7000000-0000-4000-8000-000000000072', 990000072, 'gg-test-faculty-y4');
create or replace function pg_temp.uid(p_label text) returns uuid language sql as $$ select id from t_users where label = p_label $$;

delete from public.batches where created_by in (select gh from t_users);
delete from private.faculty_allowlist where github_id in (select gh from t_users);
delete from auth.users where id in (select id from t_users);
delete from private.exam_questions where question like 'TEST %';
insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', lower(label) || '-exam@example.invalid',
       '{"provider": "github", "providers": ["github"]}', '{}', now(), now() from t_users;
insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
select gh::text, id, jsonb_build_object('sub', gh::text, 'provider_id', gh::text, 'user_name', username), 'github', now(), now()
from t_users;
insert into private.faculty_allowlist (github_id, note) values (990000071, 'test faculty X4'), (990000072, 'test faculty Y4');

-- TEST bank: 6 active questions per unit (correct answer at index (i % 4)), plus one inactive question.
insert into private.exam_questions (unit, question, options, correct, explanation)
select u, format('TEST unit %s question %s', u, i), jsonb_build_array('A' || i, 'B' || i, 'C' || i, 'D' || i), i % 4, 'test'
from generate_series(1, 5) u, generate_series(1, 6) i;
insert into private.exam_questions (unit, question, options, correct, active)
values (1, 'TEST inactive question', '["a", "b", "c", "d"]', 0, false);

-- Static checks
select pg_temp.check('X1-X2', bool_and(p.prosecdef and p.proconfig @> array['search_path=""']),
  'exam functions: SECURITY DEFINER, search_path = '''': ' || count(*) || ' functions')
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and (p.proname like '%exam%');
select pg_temp.check('X3', not bool_or(has_function_privilege('anon', p.oid, 'EXECUTE')),
  'signed-out visitors cannot call any exam function')
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname like '%exam%';
select pg_temp.check('X3-private', not bool_or(has_function_privilege('authenticated', p.oid, 'EXECUTE')),
  'exam helpers (grade, paper, attempt, student exam) not callable from the site')
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'private' and p.proname in ('grade_attempt', 'exam_paper', 'attempt_json', 'student_exam');
select pg_temp.check('X4', not bool_or(has_table_privilege('authenticated', t, 'SELECT')),
  'question bank, exams and attempts not readable from the site')
from unnest(array['private.exam_questions', 'private.exams', 'private.exam_attempts']) t;

do $$
declare
  cv constant text := private.current_consent_version();
  r text;
  j jsonb;
  bx uuid;
  by_ uuid;
  ex uuid;
  ex_big uuid;
  lbl text;
  item jsonb;
  ids1 text;
  n integer;
begin
  foreach lbl in array array['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'X', 'Y'] loop
    perform pg_temp.as_user(pg_temp.uid(lbl), format('select public.accept_consent(%L, %L, %L)::text', cv, 'Test ' || lbl, 'BCA-AI'));
    perform pg_temp.as_user(pg_temp.uid(lbl), format('with u as (update public.profiles set roll_no = %L returning 1) select count(*)::text from u', '7' || right(lbl, 1) || '0'));
  end loop;
  bx := (pg_temp.js(pg_temp.as_user(pg_temp.uid('X'), $q$select public.faculty_create_batch('Exam batch', 'BCA-AI', 2026)::text$q$)) ->> 'id')::uuid;
  by_ := (pg_temp.js(pg_temp.as_user(pg_temp.uid('Y'), $q$select public.faculty_create_batch('Other exam batch', 'BCA', 2026)::text$q$)) ->> 'id')::uuid;
  foreach lbl in array array['S1', 'S2', 'S4', 'S5', 'S6'] loop
    perform pg_temp.as_user(pg_temp.uid(lbl), format('select public.join_batch(%L)::text', (select code from private.batch_join_codes where batch_id = bx)));
  end loop;
  perform pg_temp.as_user(pg_temp.uid('S3'), format('select public.join_batch(%L)::text', (select code from private.batch_join_codes where batch_id = by_)));

  -- Draft exam is invisible; only open exams can be started
  r := pg_temp.as_user(pg_temp.uid('X'), 'select public.faculty_exam_bank()::text');
  perform pg_temp.check('EB1', pg_temp.js(r) = '{"1": 6, "2": 6, "3": 6, "4": 6, "5": 6}', 'faculty see question counts per unit (no content): ' || r);
  r := pg_temp.as_user(pg_temp.uid('S1'), 'select public.faculty_exam_bank()::text');
  perform pg_temp.check('EB2', r like 'ERROR 42501%', 'students cannot see the bank counts: ' || r);
  ex := (pg_temp.js(pg_temp.as_user(pg_temp.uid('X'), format('select public.faculty_exam_create(%L, %L, 5, 30, 40)::text', bx, 'Final exam'))) ->> 'id')::uuid;
  r := pg_temp.as_user(pg_temp.uid('S1'), 'select (public.exam_status() -> ''exam'')::text');
  perform pg_temp.check('EX1', r = 'null', 'a draft exam is not shown to students: ' || r);
  r := pg_temp.as_user(pg_temp.uid('S1'), format('select public.start_exam(%L)::text', ex));
  perform pg_temp.check('EX2', r like 'ERROR 22023%not open%', 'a draft exam cannot be started: ' || r);
  r := pg_temp.as_user(pg_temp.uid('Y'), format('select public.faculty_exam_set_status(%L, %L)::text', ex, 'open'));
  perform pg_temp.check('EX3', r like 'ERROR 42501%', 'faculty of another batch cannot open the exam: ' || r);
  r := pg_temp.as_user(pg_temp.uid('S1'), format('select public.faculty_exam_set_status(%L, %L)::text', ex, 'open'));
  perform pg_temp.check('EX3b', r like 'ERROR 42501%', 'students cannot open the exam: ' || r);
  ex_big := (pg_temp.js(pg_temp.as_user(pg_temp.uid('X'), format('select public.faculty_exam_create(%L, %L, 10, 30, 40)::text', bx, 'Too big'))) ->> 'id')::uuid;
  r := pg_temp.as_user(pg_temp.uid('X'), format('select public.faculty_exam_set_status(%L, %L)::text', ex_big, 'open'));
  perform pg_temp.check('EX4', r like 'ERROR 22023%question bank%', 'an exam needing more questions than the bank has cannot open: ' || r);
  r := pg_temp.as_user(pg_temp.uid('X'), format('select public.faculty_exam_set_status(%L, %L)::text', ex, 'open'));
  perform pg_temp.check('EX5', pg_temp.js(r) ->> 'status' = 'open', 'faculty X opens the exam: ' || r);

  -- Starting: other batch refused; 25 questions, 5 per unit, no answers sent
  r := pg_temp.as_user(pg_temp.uid('S3'), format('select public.start_exam(%L)::text', ex));
  perform pg_temp.check('EX6', r like 'ERROR 42501%', 'a student of another batch cannot start it: ' || r);
  r := pg_temp.as_user(pg_temp.uid('S1'), format('select public.start_exam(%L)::text', ex));
  j := pg_temp.js(r);
  perform pg_temp.check('EX7', jsonb_array_length(j -> 'questions') = 25
    and (select bool_and(c = 5) from (select count(*) c from jsonb_array_elements(j -> 'questions') e group by e ->> 'unit') x)
    and (select bool_and(jsonb_array_length(e -> 'options') = 4) from jsonb_array_elements(j -> 'questions') e)
    and position('correct' in r) = 0 and position('inactive' in r) = 0 and position('"test"' in r) = 0,
    '25 questions, 5 per unit, 4 options each; no correct answers, explanations or inactive questions sent');
  perform pg_temp.check('EX8', (j -> 'attempt' ->> 'deadline')::timestamptz between now() + interval '29 minutes' and now() + interval '31 minutes',
    'deadline is 30 minutes from the start, on the server clock');
  ids1 := (select string_agg(e ->> 'q', ',' order by ord) from jsonb_array_elements(j -> 'questions') with ordinality x(e, ord));
  r := pg_temp.as_user(pg_temp.uid('S1'), format('select public.start_exam(%L)::text', ex));
  perform pg_temp.check('EX9', (select string_agg(e ->> 'q', ',' order by ord) from jsonb_array_elements(pg_temp.js(r) -> 'questions') with ordinality x(e, ord)) = ids1
    and (select count(*) from private.exam_attempts where exam_id = ex and user_id = pg_temp.uid('S1')) = 1,
    'starting again (reload) resumes the same paper; still one attempt');
  perform pg_temp.check('EX10', exists (select 1 from private.exam_attempts a, jsonb_array_elements(a.paper) p(e)
      where a.exam_id = ex and a.user_id = pg_temp.uid('S1') and p.e -> 'o' <> '[0, 1, 2, 3]'),
    'options are shuffled for the student');

  -- Answering: S1 all correct; S2 exactly 10 of 25 correct (40 % = pass)
  for item in select e from private.exam_attempts a, jsonb_array_elements(a.paper) e where a.exam_id = ex and a.user_id = pg_temp.uid('S1') loop
    perform pg_temp.as_user(pg_temp.uid('S1'), format('select public.save_exam_answer(%L, %s, %s)::text', ex, item ->> 'q',
      (select o.i - 1 from jsonb_array_elements_text(item -> 'o') with ordinality o(v, i)
       where o.v::integer = (select correct from private.exam_questions where id = (item ->> 'q')::integer))));
  end loop;
  r := pg_temp.as_user(pg_temp.uid('S1'), format('select public.save_exam_answer(%L, %s, 7)::text', ex, (select (e ->> 'q') from private.exam_attempts a, jsonb_array_elements(a.paper) e where a.exam_id = ex and a.user_id = pg_temp.uid('S1') limit 1)));
  perform pg_temp.check('EX11', r like 'ERROR 22023%', 'an answer outside A–D is refused: ' || r);
  r := pg_temp.as_user(pg_temp.uid('S1'), format('select public.save_exam_answer(%L, %s, 0)::text', ex, (select id from private.exam_questions where question = 'TEST inactive question')));
  perform pg_temp.check('EX12', r like 'ERROR 22023%', 'an answer to a question not on the paper is refused: ' || r);
  r := pg_temp.as_user(pg_temp.uid('S1'), format('select public.submit_exam(%L)::text', ex));
  j := pg_temp.js(r);
  perform pg_temp.check('EX13', (j ->> 'score')::int = 25 and (j ->> 'total')::int = 25 and (j ->> 'passed')::boolean and (j ->> 'percent')::int = 100,
    'all correct (options shuffled) is marked 25 / 25, passed: ' || r);
  r := pg_temp.as_user(pg_temp.uid('S1'), format('select public.submit_exam(%L)::text', ex));
  perform pg_temp.check('EX14', (pg_temp.js(r) ->> 'score')::int = 25, 'submitting again changes nothing');
  r := pg_temp.as_user(pg_temp.uid('S1'), format('select public.save_exam_answer(%L, %s, 0)::text', ex, split_part(ids1, ',', 1)));
  perform pg_temp.check('EX15', pg_temp.js(r) ->> 'submitted' = 'true', 'answers after submitting are not accepted: ' || r);

  perform pg_temp.as_user(pg_temp.uid('S2'), format('select public.start_exam(%L)::text', ex));
  n := 0;
  for item in select e from private.exam_attempts a, jsonb_array_elements(a.paper) e where a.exam_id = ex and a.user_id = pg_temp.uid('S2') loop
    n := n + 1;
    perform pg_temp.as_user(pg_temp.uid('S2'), format('select public.save_exam_answer(%L, %s, %s)::text', ex, item ->> 'q',
      (select case when n <= 10 then o.i - 1 else (o.i) % 4 end from jsonb_array_elements_text(item -> 'o') with ordinality o(v, i)
       where o.v::integer = (select correct from private.exam_questions where id = (item ->> 'q')::integer))));
  end loop;
  j := pg_temp.js(pg_temp.as_user(pg_temp.uid('S2'), format('select public.submit_exam(%L)::text', ex)));
  perform pg_temp.check('EX16', (j ->> 'score')::int = 10 and (j ->> 'passed')::boolean, 'exactly 40 % (10 / 25) passes: ' || j::text);

  -- Time limit and leaving the page
  perform pg_temp.as_user(pg_temp.uid('S4'), format('select public.start_exam(%L)::text', ex));
  perform pg_temp.as_user(pg_temp.uid('S4'), format('select public.note_exam_leave(%L)::text', ex));
  perform pg_temp.as_user(pg_temp.uid('S4'), format('select public.note_exam_leave(%L)::text', ex));
  perform pg_temp.check('EX17', (select leave_count from private.exam_attempts where exam_id = ex and user_id = pg_temp.uid('S4')) = 2,
    'leaving the exam page is counted');
  update private.exam_attempts set deadline = now() - interval '2 minutes' where exam_id = ex and user_id = pg_temp.uid('S4');
  r := pg_temp.as_user(pg_temp.uid('S4'), format('select public.save_exam_answer(%L, %s, 0)::text', ex,
    (select e ->> 'q' from private.exam_attempts a, jsonb_array_elements(a.paper) e where a.exam_id = ex and a.user_id = pg_temp.uid('S4') limit 1)));
  perform pg_temp.check('EX18', pg_temp.js(r) ->> 'time_up' = 'true'
    and (select submitted_at is not null and score = 0 from private.exam_attempts where exam_id = ex and user_id = pg_temp.uid('S4')),
    'after the time limit answers are refused and the paper is marked: ' || r);

  -- Review only after closing; closing marks unfinished papers
  r := pg_temp.as_user(pg_temp.uid('S1'), format('select public.exam_review(%L)::text', ex));
  perform pg_temp.check('EX19', r like 'ERROR 22023%', 'answers are not shown while the exam is open: ' || r);
  perform pg_temp.as_user(pg_temp.uid('S5'), format('select public.start_exam(%L)::text', ex));
  r := pg_temp.as_user(pg_temp.uid('X'), format('select public.faculty_exam_results(%L)::text', ex));
  j := pg_temp.js(r);
  perform pg_temp.check('EX20', jsonb_array_length(j) = 5 and j @> '[{"display_name": "Test S6", "state": "not_started"}]'
    and j @> '[{"display_name": "Test S5", "state": "in_progress"}]' and j @> '[{"display_name": "Test S1", "score": 25, "passed": true}]'
    and position('Test S3' in r) = 0 and position('Test X' in r) = 0 and position('example.invalid' in r) = 0,
    'faculty results: every student of the batch (not started, in progress, submitted); no faculty, no email');
  r := pg_temp.as_user(pg_temp.uid('X'), format('select public.faculty_exam_set_status(%L, %L)::text', ex, 'closed'));
  perform pg_temp.check('EX21', (select submitted_at is not null from private.exam_attempts where exam_id = ex and user_id = pg_temp.uid('S5')),
    'closing the exam marks unfinished papers');
  r := pg_temp.as_user(pg_temp.uid('S1'), format('select public.exam_review(%L)::text', ex));
  j := pg_temp.js(r);
  perform pg_temp.check('EX22', jsonb_array_length(j) = 25 and (select bool_and((e ->> 'chosen')::int = (e ->> 'correct')::int) from jsonb_array_elements(j) e),
    'after closing, the student''s review shows their answers and the correct ones');
  r := pg_temp.as_user(pg_temp.uid('S1'), 'select public.exam_status()::text');
  perform pg_temp.check('EX23', pg_temp.js(r) -> 'exam' ->> 'status' = 'closed' and (pg_temp.js(r) -> 'attempt' ->> 'score')::int = 25
    and pg_temp.js(r) -> 'attempt' -> 'answers' = 'null', 'status after closing shows the result (answers no longer echoed)');
  r := pg_temp.as_user(pg_temp.uid('S6'), format('select public.start_exam(%L)::text', ex));
  perform pg_temp.check('EX24', r like 'ERROR 22023%not open%', 'a closed exam cannot be started: ' || r);
  r := pg_temp.as_user(pg_temp.uid('X'), format('select public.faculty_exams(%L)::text', bx));
  j := pg_temp.js(r) -> 0;
  perform pg_temp.check('EX25', exists (select 1 from jsonb_array_elements(pg_temp.js(r)) e where e ->> 'title' = 'Final exam'
      and (e ->> 'started')::int = 4 and (e ->> 'submitted')::int = 4 and (e ->> 'passed')::int >= 2),
    'faculty exam list shows started / submitted / passed counts: ' || left(r, 150));
  r := pg_temp.as_user(pg_temp.uid('S1'), 'select count(*)::text from private.exam_questions');
  perform pg_temp.check('EX26', r like 'ERROR 42501%', 'students cannot read the question bank: ' || r);
  perform pg_temp.as_user(pg_temp.uid('S1'), 'select public.delete_my_account()::text');
  perform pg_temp.check('EX27', not exists (select 1 from private.exam_attempts where user_id = pg_temp.uid('S1')),
    'deleting the account removes the student''s attempt');

  perform pg_temp.check('DONE', true, 'all behaviour tests ran to the end');
end
$$;

delete from public.batches where created_by in (select gh from t_users);
delete from private.faculty_allowlist where github_id in (select gh from t_users);
delete from auth.users where id in (select id from t_users);
delete from private.exam_questions where question like 'TEST %';
select pg_temp.check('CLEAN', not exists (select 1 from private.exams e join public.batches b on b.id = e.batch_id where b.name like '%xam batch')
  and not exists (select 1 from private.exam_questions where question like 'TEST %'),
  'test users, batches, exams, attempts and TEST questions removed');

select id as test, case when ok then 'PASS' else 'FAIL' end as result, detail
from t_results
order by ok, n;
