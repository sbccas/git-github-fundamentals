-- Tests for Milestone 12b (participant counter, request to join) — LOCAL ONLY: run by `npm run sql-check`.
-- Never run on the live project (it stops itself there: the environment is "production").

do $$
begin
  if not exists (select 1 from private.environment where name = 'test') then
    raise exception 'Stop: this project is not marked as the test environment.';
  end if;
end
$$;

-- Harness (same as the other suites)
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
  ('S1', 'e0000000-0000-4000-8000-000000000021', 990000021, 'gg-test-requester'),
  ('S2', 'e0000000-0000-4000-8000-000000000022', 990000022, 'gg-test-in-batch'),
  ('S3', 'e0000000-0000-4000-8000-000000000023', 990000023, 'gg-test-decliner'),
  ('X',  'e0000000-0000-4000-8000-000000000031', 990000031, 'gg-test-faculty-x2'),
  ('Y',  'e0000000-0000-4000-8000-000000000032', 990000032, 'gg-test-faculty-y2');
insert into t_users
select 'F' || i, ('e0000000-0000-4000-8000-' || lpad((100 + i)::text, 12, '0'))::uuid, 990000100 + i, 'gg-test-filler-' || i
from generate_series(1, 20) i;
create or replace function pg_temp.uid(p_label text) returns uuid language sql as $$ select id from t_users where label = p_label $$;

delete from public.batches where created_by in (select gh from t_users);
delete from private.faculty_allowlist where github_id in (select gh from t_users);
delete from auth.users where id in (select id from t_users);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', lower(label) || '-m12b@example.invalid',
       '{"provider": "github", "providers": ["github"]}', '{}', now(), now() from t_users;
insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
select gh::text, id, jsonb_build_object('sub', gh::text, 'provider_id', gh::text, 'user_name', username), 'github', now(), now()
from t_users;
insert into private.faculty_allowlist (github_id, note) values (990000031, 'test faculty X2'), (990000032, 'test faculty Y2');

-- Static checks
select pg_temp.check('X1-X2', bool_and(p.prosecdef and p.proconfig @> array['search_path=""']),
  'new public functions: SECURITY DEFINER, search_path = '''': ' || string_agg(p.proname, ', '))
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('course_stats', 'request_to_join', 'withdraw_request', 'faculty_join_requests', 'faculty_handle_request');

select pg_temp.check('X3-anon', string_agg(p.proname, ',') = 'course_stats',
  'signed-out visitors can execute exactly one function: ' || coalesce(string_agg(p.proname, ','), 'none'))
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private') and has_function_privilege('anon', p.oid, 'EXECUTE');

select pg_temp.check('X3-private', not has_function_privilege('authenticated', 'private.my_latest_request(uuid)', 'EXECUTE')
  and not has_table_privilege('authenticated', 'private.join_requests', 'SELECT'),
  'requests table and helper not reachable from the site');

do $$
declare
  cv constant text := private.current_consent_version();
  r text;
  j jsonb;
  bx uuid;
  by_ uuid;
  code_x text;
  req bigint;
  lbl text;
begin
  foreach lbl in array array['S1', 'S2', 'S3', 'X', 'Y'] loop
    perform pg_temp.as_user(pg_temp.uid(lbl), format('select public.accept_consent(%L, %L, %L)::text', cv, 'Test ' || lbl, 'BSC-DS'));
  end loop;
  bx := (pg_temp.js(pg_temp.as_user(pg_temp.uid('X'), $q$select public.faculty_create_batch('TY BSc DS 2026', 'BSC-DS', 2026)::text$q$)) ->> 'id')::uuid;
  by_ := (pg_temp.js(pg_temp.as_user(pg_temp.uid('Y'), $q$select public.faculty_create_batch('Other 2026', 'BCA', 2026)::text$q$)) ->> 'id')::uuid;
  code_x := (select code from private.batch_join_codes where batch_id = bx);
  perform pg_temp.as_user(pg_temp.uid('S2'), $q$with u as (update public.profiles set roll_no = 'S2-01' returning 1) select count(*)::text from u$q$);
  perform pg_temp.as_user(pg_temp.uid('S2'), format('select public.join_batch(%L)::text', code_x));

  -- Counter (M12B-D1, D2, D3)
  r := pg_temp.as_user(null, 'select public.course_stats()::text');
  perform pg_temp.check('CS1', pg_temp.js(r) = '{"visible": false}', 'below 20 students the counter is hidden (signed-out call works): ' || r);
  insert into public.profiles (id, github_id, github_username, display_name, programme, consent_version, consent_at)
  select id, gh, username, 'Filler ' || label, 'BCA', cv, now() from t_users where label like 'F%';
  insert into public.progress (user_id, doc, xp, revision)
  select id, jsonb_build_object('version', 1,
           'units', case when gh <= 990000110 then '{"1": {"sections": [], "total": 9, "quiz": {"best": 80, "last": 80, "passed": true}, "complete": false}}'::jsonb else '{}'::jsonb end,
           'missions', '{"M-01": {"done": true, "at": "2026-10-27T10:00:00.000Z"}, "M-02": {"done": true, "at": "2026-10-27T10:00:00.000Z"}}'::jsonb),
         0, 1
  from t_users where label like 'F%';
  r := pg_temp.as_user(null, 'select public.course_stats()::text');
  j := pg_temp.js(r);
  perform pg_temp.check('CS2', (j ->> 'visible')::boolean and (j ->> 'students')::int >= 23 and (j ->> 'classes')::int >= 1
    and (j ->> 'quizzes_passed')::int >= 10 and (j ->> 'missions_completed')::int >= 40,
    'with 23 students: counter shows students, classes, quizzes passed, missions: ' || r);
  perform pg_temp.check('CS3', (select array_agg(k order by k) from jsonb_object_keys(j) k)
    = array['classes', 'missions_completed', 'quizzes_passed', 'students', 'visible'] and position('Test' in r) = 0 and position('Filler' in r) = 0,
    'the counter returns four totals only — no names');
  perform pg_temp.check('CS4', (j ->> 'students')::int = (select count(*) from public.profiles p
      where not exists (select 1 from private.faculty_allowlist f where f.github_id = p.github_id)),
    'faculty are not counted as students');

  -- Request to join (M12B-D4 – D7)
  r := pg_temp.as_user(pg_temp.uid('S1'), 'select public.request_to_join(2, ''a'')::text');
  perform pg_temp.check('RQ1', r like 'ERROR 22023%roll number%', 'request without a roll number refused: ' || r);
  perform pg_temp.as_user(pg_temp.uid('S1'), $q$with u as (update public.profiles set roll_no = 'S1-01' returning 1) select count(*)::text from u$q$);
  r := pg_temp.as_user(pg_temp.uid('S1'), 'select public.request_to_join(2, '' a '')::text');
  j := pg_temp.js(r);
  perform pg_temp.check('RQ2', j ->> 'status' = 'pending' and j ->> 'division' = 'A' and j ->> 'programme' = 'BSC-DS' and (j ->> 'year')::int = 2,
    'request created: programme from the profile, division in capitals: ' || r);
  perform pg_temp.as_user(pg_temp.uid('S1'), 'select public.request_to_join(3, ''B'')::text');
  perform pg_temp.check('RQ3', (select count(*) from private.join_requests where user_id = pg_temp.uid('S1')) = 1,
    'a repeat request does not create a second one');
  r := pg_temp.as_user(pg_temp.uid('S2'), 'select public.request_to_join(1, null)::text');
  perform pg_temp.check('RQ4', r like 'ERROR 22023%already in a batch%', 'a student already in a batch cannot request: ' || r);
  r := pg_temp.as_user(pg_temp.uid('S2'), 'select (public.account_status() -> ''request'')::text');
  perform pg_temp.check('RQ5', r = 'null', 'another student sees nothing of the request: ' || r);
  r := pg_temp.as_user(pg_temp.uid('S2'), 'select public.faculty_join_requests()::text');
  perform pg_temp.check('RQ6', r like 'ERROR 42501%', 'students cannot list requests: ' || r);
  r := pg_temp.as_user(pg_temp.uid('X'), 'select public.faculty_join_requests()::text');
  j := pg_temp.js(r);
  req := (j -> 0 ->> 'id')::bigint;
  perform pg_temp.check('RQ7', jsonb_array_length(j) = 1 and j -> 0 ->> 'roll_no' = 'S1-01' and position('example.invalid' in r) = 0,
    'faculty see the pending request with roll number, no email: ' || r);
  r := pg_temp.as_user(pg_temp.uid('Y'), format('select public.faculty_handle_request(%s, %L, %L)::text', req, 'accept', bx));
  perform pg_temp.check('RQ8', r like 'ERROR 42501%' and (select status from private.join_requests where id = req) = 'pending',
    'faculty Y cannot accept into faculty X''s batch: ' || r);
  r := pg_temp.as_user(pg_temp.uid('X'), format('select public.faculty_handle_request(%s, %L, %L)::text', req, 'accept', bx));
  perform pg_temp.check('RQ9', pg_temp.js(r) ->> 'ok' = 'true' and (select batch_id from public.profiles where id = pg_temp.uid('S1')) = bx,
    'faculty X accepts: the student is in X''s batch at once: ' || r);
  r := pg_temp.as_user(pg_temp.uid('S1'), 'select public.account_status()::text');
  j := pg_temp.js(r);
  perform pg_temp.check('RQ10', j ->> 'batch_name' = 'TY BSc DS 2026' and j -> 'request' ->> 'status' = 'accepted',
    'the student''s account shows the batch and the accepted request');
  r := pg_temp.as_user(pg_temp.uid('X'), format('select public.faculty_handle_request(%s, %L, %L)::text', req, 'decline', null));
  perform pg_temp.check('RQ11', r like 'ERROR 22023%no longer pending%', 'a handled request cannot be handled again: ' || r);

  perform pg_temp.as_user(pg_temp.uid('S3'), $q$with u as (update public.profiles set roll_no = 'S3-01' returning 1) select count(*)::text from u$q$);
  perform pg_temp.as_user(pg_temp.uid('S3'), 'select public.request_to_join(1, null)::text');
  req := (select id from private.join_requests where user_id = pg_temp.uid('S3') and status = 'pending');
  r := pg_temp.as_user(pg_temp.uid('Y'), format('select public.faculty_handle_request(%s, %L, %L)::text', req, 'decline', null));
  perform pg_temp.check('RQ12', pg_temp.js(r) ->> 'ok' = 'true' and (select batch_id from public.profiles where id = pg_temp.uid('S3')) is null
    and pg_temp.js(pg_temp.as_user(pg_temp.uid('S3'), 'select public.account_status()::text')) -> 'request' ->> 'status' = 'declined',
    'any faculty member can decline; the student sees "declined" and stays without a batch');
  perform pg_temp.as_user(pg_temp.uid('S3'), 'select public.request_to_join(1, ''C'')::text');
  r := pg_temp.as_user(pg_temp.uid('S3'), 'select public.withdraw_request()::text');
  perform pg_temp.check('RQ13', pg_temp.js(r) ->> 'status' = 'withdrawn'
    and pg_temp.js(pg_temp.as_user(pg_temp.uid('X'), 'select public.faculty_join_requests()::text')) = '[]',
    'the student can request again after a decline and withdraw; faculty then see no pending request');

  r := pg_temp.as_user(pg_temp.uid('S1'), 'select public.export_my_data()::text');
  perform pg_temp.check('RQ14', jsonb_array_length(pg_temp.js(r) -> 'join_requests') = 1 and pg_temp.js(r) -> 'join_requests' -> 0 ->> 'status' = 'accepted',
    'Download my data includes the request');
  perform pg_temp.as_user(pg_temp.uid('S1'), 'select public.delete_my_account()::text');
  perform pg_temp.check('RQ15', not exists (select 1 from private.join_requests where user_id = pg_temp.uid('S1')),
    'deleting the account removes the student''s requests');

  perform pg_temp.check('DONE', true, 'all behaviour tests ran to the end');
end
$$;

-- Clean up
delete from public.batches where created_by in (select gh from t_users);
delete from private.faculty_allowlist where github_id in (select gh from t_users);
delete from auth.users where id in (select id from t_users);
select pg_temp.check('CLEAN', not exists (select 1 from public.profiles where github_id in (select gh from t_users))
  and not exists (select 1 from private.join_requests r join t_users t on t.id = r.user_id),
  'test users, requests, batches and allowlist entries removed');

select id as test, case when ok then 'PASS' else 'FAIL' end as result, detail
from t_results
order by ok, n;
