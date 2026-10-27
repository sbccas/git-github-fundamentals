-- Security and behaviour tests for Milestone 12 (faculty dashboard, batches, join codes) — gg-test ONLY, and only
-- before go-live (M12-D8). Paste the whole file into the Supabase SQL Editor and press Run; every row should say
-- PASS (failures are listed first). Creates fake users (students A, B, C; faculty X and Y; a look-alike L) with fixed
-- ids and fake GitHub ids, and removes them, their batches and allowlist entries at the end. Re-running is safe.

do $$
begin
  if not exists (select 1 from private.environment where name = 'test') then
    raise exception 'Stop: this project is not marked as the test environment.';
  end if;
end
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Harness (same as m10_m11_security_test.sql)
-- ---------------------------------------------------------------------------------------------------------------
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

-- Fake users: a…1 student A, b…2 student B, c…3 student C, f…11 faculty X, f…12 faculty Y, f…13 look-alike L.
drop table if exists pg_temp.t_users;
create temp table t_users (label text primary key, id uuid, gh bigint, username text);
insert into t_users values
  ('A', 'a0000000-0000-4000-8000-000000000001', 990000001, 'gg-test-student-a'),
  ('B', 'b0000000-0000-4000-8000-000000000002', 990000002, 'gg-test-student-b'),
  ('C', 'c0000000-0000-4000-8000-000000000003', 990000003, 'gg-test-student-c'),
  ('X', 'f0000000-0000-4000-8000-000000000011', 990000011, 'gg-test-faculty-x'),
  ('Y', 'f0000000-0000-4000-8000-000000000012', 990000012, 'gg-test-faculty-y'),
  ('L', 'f0000000-0000-4000-8000-000000000013', 990000013, 'gg-test-faculty-y');  -- same username as Y (F2)

create or replace function pg_temp.uid(p_label text) returns uuid language sql as $$ select id from t_users where label = p_label $$;

-- Remove leftovers from an interrupted run.
delete from public.batches where created_by in (select gh from t_users);
delete from private.faculty_allowlist where github_id in (select gh from t_users);
delete from auth.users where id in (select id from t_users);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       lower(label) || '-m12@example.invalid', '{"provider": "github", "providers": ["github"]}', '{}', now(), now()
from t_users;
insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
select gh::text, id, jsonb_build_object('sub', gh::text, 'provider_id', gh::text, 'user_name', username), 'github', now(), now()
from t_users;
insert into private.faculty_allowlist (github_id, note) values (990000011, 'test faculty X'), (990000012, 'test faculty Y');

-- ---------------------------------------------------------------------------------------------------------------
-- Static checks
-- ---------------------------------------------------------------------------------------------------------------
select pg_temp.check('F1', not bool_or(has_table_privilege(r, t, p)),
  'allowlist, batch links, codes and join attempts: no privilege for API roles')
from unnest(array['anon', 'authenticated']) r,
     unnest(array['private.faculty_allowlist', 'private.batch_faculty', 'private.batch_join_codes', 'private.join_attempts']) t,
     unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) p;

select pg_temp.check('R5a', not bool_or(has_table_privilege(r, 'public.batches', p)),
  'batches table: no direct privilege for API roles (read only through functions)')
from unnest(array['anon', 'authenticated']) r, unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) p;

select pg_temp.check('R1-batch', not has_column_privilege('authenticated', 'public.profiles', 'batch_id', 'UPDATE'),
  'students cannot set their batch directly');

select pg_temp.check('X1-X2', bool_and(p.prosecdef and p.proconfig @> array['search_path=""']),
  'new public functions: SECURITY DEFINER, search_path = '''': ' || string_agg(p.proname, ', '))
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and (p.proname like 'faculty\_%' or p.proname = 'join_batch');

select pg_temp.check('X3', not bool_or(has_function_privilege('anon', p.oid, 'EXECUTE'))
  and bool_and(has_function_privilege('authenticated', p.oid, 'EXECUTE')),
  'new public functions: signed-out none, signed-in execute (each checks the role itself)')
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and (p.proname like 'faculty\_%' or p.proname = 'join_batch');

select pg_temp.check('X3-private', not bool_or(has_function_privilege('authenticated', p.oid, 'EXECUTE'))
  and bool_and(p.proconfig @> array['search_path=""']),
  'private helpers (is_faculty, current_github_id, can_see_batch, new_join_code): no API role, fixed search_path')
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'private' and p.proname in ('is_faculty', 'current_github_id', 'can_see_batch', 'new_join_code');

-- ---------------------------------------------------------------------------------------------------------------
-- Behaviour
-- ---------------------------------------------------------------------------------------------------------------
do $$
declare
  cv constant text := private.current_consent_version();
  r text;
  j jsonb;
  bx uuid;
  by_ uuid;
  code_x text;
  code_y text;
  n integer;
  lbl text;
begin
  -- Everyone consents and has a profile (faculty too — LC9).
  foreach lbl in array array['A', 'B', 'C', 'X', 'Y', 'L'] loop
    perform pg_temp.as_user(pg_temp.uid(lbl), format('select public.accept_consent(%L, %L, %L)::text', cv, 'Test ' || lbl, 'BCA-AI'));
  end loop;

  -- Role from the allowlist only (F2, F3)
  r := pg_temp.as_user(pg_temp.uid('L'), 'select public.faculty_batches()::text');
  perform pg_temp.check('F2', r like 'ERROR 42501%', 'same username as faculty Y but a different GitHub id: not faculty: ' || r);
  r := pg_temp.as_user(pg_temp.uid('A'), $q$select public.faculty_create_batch('Hack', 'BCA', 2026)::text$q$);
  perform pg_temp.check('F3', r like 'ERROR 42501%', 'a student cannot create batches: ' || r);
  r := pg_temp.as_user(pg_temp.uid('A'), 'select (public.account_status() ->> ''is_faculty'')');
  perform pg_temp.check('F3b', r = 'false', 'account_status: student is not faculty: ' || r);
  r := pg_temp.as_user(pg_temp.uid('X'), 'select (public.account_status() ->> ''is_faculty'')');
  perform pg_temp.check('F3c', r = 'true', 'account_status: allowlisted faculty X is faculty: ' || r);

  -- Batches and codes (J4, R3)
  r := pg_temp.as_user(pg_temp.uid('X'), $q$select public.faculty_create_batch('  BCA 2026 – SY   AI ', 'BCA-AI', 2026)::text$q$);
  bx := (pg_temp.js(r) ->> 'id')::uuid;
  perform pg_temp.check('B1', bx is not null and (select name from public.batches where id = bx) = 'BCA 2026 – SY AI',
    'faculty X created "BCA 2026 – SY AI": ' || r);
  r := pg_temp.as_user(pg_temp.uid('Y'), $q$select public.faculty_create_batch('Other batch', 'BCA', 2026)::text$q$);
  by_ := (pg_temp.js(r) ->> 'id')::uuid;
  r := pg_temp.as_user(pg_temp.uid('X'), 'select public.faculty_batches()::text');
  j := pg_temp.js(r);
  code_x := j -> 0 ->> 'code';
  perform pg_temp.check('J4a', jsonb_array_length(j) = 1 and (j -> 0 ->> 'id')::uuid = bx and code_x ~ '^[A-HJ-NP-Z2-9]{8}$',
    'faculty X lists only own batch, with an 8-character code');
  code_y := (select code from private.batch_join_codes where batch_id = by_);
  r := pg_temp.as_user(pg_temp.uid('Y'), format('select public.faculty_set_code(%L, false, null)::text', bx));
  perform pg_temp.check('J4b', r like 'ERROR 42501%', 'faculty Y cannot read or change X''s code: ' || r);
  r := pg_temp.as_user(pg_temp.uid('Y'), format('select public.faculty_batch_progress(%L)::text', bx));
  perform pg_temp.check('R3a', r like 'ERROR 42501%', 'faculty Y cannot see X''s students: ' || r);

  -- Roll number / SID (M12-D9): required to join, set and corrected by the student only
  r := pg_temp.as_user(pg_temp.uid('A'), format('select public.join_batch(%L)::text', code_x));
  perform pg_temp.check('RN1', pg_temp.js(r) ->> 'needs_roll_no' = 'true' and (select batch_id from public.profiles where id = pg_temp.uid('A')) is null,
    'joining without a roll number is refused with a clear message: ' || r);
  r := pg_temp.as_user(pg_temp.uid('A'), $q$with u as (update public.profiles set roll_no = '<b>x</b>' returning 1) select count(*)::text from u$q$);
  perform pg_temp.check('RN2', r like 'ERROR 23514%', 'an invalid roll number is rejected: ' || r);
  foreach lbl in array array['A', 'B', 'C'] loop
    perform pg_temp.as_user(pg_temp.uid(lbl), format(
      'with u as (update public.profiles set roll_no = %L returning 1) select count(*)::text from u', '23BCA-AI/0' || lbl));
  end loop;
  perform pg_temp.check('RN3', (select count(*) from public.profiles where roll_no like '23BCA-AI/0%') = 3, 'students set their own roll numbers');
  r := pg_temp.as_user(pg_temp.uid('B'), format(
    'with u as (update public.profiles set roll_no = %L where id = %L returning 1) select count(*)::text from u', 'HACK', pg_temp.uid('A')));
  perform pg_temp.check('RN4', r = '0' and (select roll_no from public.profiles where id = pg_temp.uid('A')) = '23BCA-AI/0A',
    'a student cannot change another student''s roll number: ' || r);

  -- Students join with the code (J2, R5)
  r := pg_temp.as_user(pg_temp.uid('A'), format('select public.join_batch(%L)::text', lower(substr(code_x, 1, 4)) || ' ' || lower(substr(code_x, 5))));
  perform pg_temp.check('JN1', pg_temp.js(r) ->> 'ok' = 'true' and pg_temp.js(r) ->> 'batch_name' = 'BCA 2026 – SY AI',
    'student A joins with the code typed in lower case with a space: ' || r);
  r := pg_temp.as_user(pg_temp.uid('B'), format('select public.join_batch(%L)::text', code_x));
  r := pg_temp.as_user(pg_temp.uid('C'), format('select public.join_batch(%L)::text', code_y));
  r := pg_temp.as_user(pg_temp.uid('A'), 'select public.account_status() ->> ''batch_name''');
  perform pg_temp.check('JN2', r = 'BCA 2026 – SY AI', 'account_status shows the student''s batch name: ' || r);
  r := pg_temp.as_user(pg_temp.uid('A'), 'select count(*)::text from public.batches');
  perform pg_temp.check('R5b', r like 'ERROR 42501%', 'students cannot list batches: ' || r);
  r := pg_temp.as_user(pg_temp.uid('B'), $q$select public.join_batch('ZZZZZZZZ')::text$q$);
  perform pg_temp.check('J2a', pg_temp.js(r) ->> 'message' = 'This code is not valid. Check it with your teacher.', 'wrong code: one generic message: ' || r);
  perform pg_temp.as_user(pg_temp.uid('X'), format('select public.faculty_set_code(%L, false, false)::text', bx));
  r := pg_temp.as_user(pg_temp.uid('C'), format('select public.join_batch(%L)::text', code_x));
  perform pg_temp.check('J2b', pg_temp.js(r) ->> 'message' = 'This code is not valid. Check it with your teacher.'
    and (select batch_id from public.profiles where id = pg_temp.uid('C')) = by_,
    'disabled code: the same message, student stays in their batch: ' || r);
  perform pg_temp.as_user(pg_temp.uid('X'), format('select public.faculty_set_code(%L, false, true)::text', bx));

  -- Attempt limit (J3): student C already failed once; 9 more failures, then even the right code is refused.
  for n in 1..9 loop
    perform pg_temp.as_user(pg_temp.uid('C'), $q$select public.join_batch('WRONG123')::text$q$);
  end loop;
  r := pg_temp.as_user(pg_temp.uid('C'), format('select public.join_batch(%L)::text', code_x));
  perform pg_temp.check('J3a', pg_temp.js(r) ->> 'ok' = 'false' and pg_temp.js(r) ->> 'message' like 'Too many attempts%',
    '11th try within an hour refused, even with a valid code: ' || r);
  r := pg_temp.as_user(pg_temp.uid('X'), format('select public.faculty_set_code(%L, true, null)::text', bx));
  perform pg_temp.check('J3b', pg_temp.js(r) ->> 'code' <> code_x and pg_temp.js(r) ->> 'code' ~ '^[A-HJ-NP-Z2-9]{8}$',
    'faculty can regenerate the code: ' || r);
  r := pg_temp.as_user(pg_temp.uid('B'), format('select public.join_batch(%L)::text', code_x));
  perform pg_temp.check('J3c', pg_temp.js(r) ->> 'ok' = 'false', 'the old code no longer works after regenerating: ' || r);
  code_x := pg_temp.js(pg_temp.as_user(pg_temp.uid('X'), format('select public.faculty_set_code(%L, false, null)::text', bx))) ->> 'code';

  -- Dashboard rows (R3, plan §1 fields only)
  perform pg_temp.as_user(pg_temp.uid('A'), format('select public.save_progress(%L::jsonb, null)::text',
    '{"version": 1, "units": {"1": {"sections": ["why"], "total": 9, "quiz": {"best": 80, "last": 80, "passed": true}, "complete": true}}, "missions": {"M-01": {"done": true}}}'));
  r := pg_temp.as_user(pg_temp.uid('X'), format('select public.faculty_batch_progress(%L)::text', bx));
  j := pg_temp.js(r);
  perform pg_temp.check('D1', jsonb_array_length(j) = 2 and j @> '[{"display_name": "Test A", "roll_no": "23BCA-AI/0A", "xp": 225}]'
    and j @> '[{"display_name": "Test B", "xp": 0}]' and position('Test C' in r) = 0,
    'faculty X sees students A (225 XP) and B of their batch, not C');
  perform pg_temp.check('D2', position('email' in r) = 0 and position('example.invalid' in r) = 0
    and position(pg_temp.uid('A')::text in r) = 0 and position('lastVisited' in r) = 0,
    'dashboard rows hold no email, no account ids, no other document fields');
  r := pg_temp.as_user(pg_temp.uid('X'), format(
    'with u as (update public.progress set xp = 0 where user_id = %L returning 1) select count(*)::text from u', pg_temp.uid('A')));
  perform pg_temp.check('R3b', r like 'ERROR 42501%', 'faculty cannot change progress: ' || r);
  r := pg_temp.as_user(pg_temp.uid('X'), format(
    'with u as (update public.profiles set display_name = %L where id = %L returning 1) select count(*)::text from u', 'X', pg_temp.uid('A')));
  perform pg_temp.check('R3c', r = '0', 'faculty cannot change a student''s profile: ' || r);
  r := pg_temp.as_user(pg_temp.uid('X'), format(
    'with u as (update public.profiles set roll_no = %L where id = %L returning 1) select count(*)::text from u', 'X1', pg_temp.uid('A')));
  perform pg_temp.check('RN5', r = '0', 'faculty cannot change a student''s roll number: ' || r);

  -- Colleague access (M12-D7) and removal (F4)
  r := pg_temp.as_user(pg_temp.uid('X'), format('select public.faculty_add_colleague(%L, %L)::text', bx, '@gg-test-faculty-y'));
  perform pg_temp.check('C1', pg_temp.js(r) ->> 'ok' = 'true', 'faculty X gives faculty Y access (username resolved through the allowlist, not to look-alike L): ' || r);
  r := pg_temp.as_user(pg_temp.uid('Y'), format('select jsonb_array_length(public.faculty_batch_progress(%L))::text', bx));
  perform pg_temp.check('C2', r = '2', 'faculty Y now sees the same students: ' || r);
  r := pg_temp.as_user(pg_temp.uid('X'), format('select public.faculty_add_colleague(%L, %L)::text', bx, 'gg-test-student-b'));
  perform pg_temp.check('C3', r like 'ERROR 22023%', 'a student cannot be added as faculty: ' || r);
  r := pg_temp.as_user(pg_temp.uid('L'), format('select public.faculty_batch_progress(%L)::text', bx));
  perform pg_temp.check('C4', r like 'ERROR 42501%', 'look-alike L still sees nothing: ' || r);
  delete from private.faculty_allowlist where github_id = 990000012;
  r := pg_temp.as_user(pg_temp.uid('Y'), format('select public.faculty_batch_progress(%L)::text', bx));
  perform pg_temp.check('F4', r like 'ERROR 42501%', 'faculty Y removed from the allowlist: access ends at once: ' || r);

  -- Export and deletion (§5.4)
  r := pg_temp.as_user(pg_temp.uid('A'), 'select public.export_my_data()::text');
  perform pg_temp.check('S12-E', pg_temp.js(r) ->> 'batch' = 'BCA 2026 – SY AI', 'export includes the batch name');
  perform pg_temp.as_user(pg_temp.uid('C'), 'select public.delete_my_account()::text');
  perform pg_temp.check('V-join', not exists (select 1 from private.join_attempts where user_id = pg_temp.uid('C')),
    'account deletion removes the student''s join attempts');
  r := pg_temp.as_user(pg_temp.uid('X'), format('select jsonb_array_length(public.faculty_batch_progress(%L))::text', bx));
  perform pg_temp.as_user(pg_temp.uid('A'), 'select public.delete_my_account()::text');
  r := pg_temp.as_user(pg_temp.uid('X'), format('select jsonb_array_length(public.faculty_batch_progress(%L))::text', bx));
  perform pg_temp.check('V-dash', r = '1', 'a deleted student disappears from the dashboard: ' || r);

  perform pg_temp.check('DONE', true, 'all behaviour tests ran to the end');
end
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Clean up
-- ---------------------------------------------------------------------------------------------------------------
delete from public.batches where created_by in (select gh from t_users);
delete from private.faculty_allowlist where github_id in (select gh from t_users);
delete from auth.users where id in (select id from t_users);

select pg_temp.check('CLEAN', not exists (select 1 from public.profiles where github_id in (select gh from t_users))
  and not exists (select 1 from public.batches where created_by in (select gh from t_users))
  and not exists (select 1 from private.faculty_allowlist where github_id in (select gh from t_users)),
  'test users, batches and allowlist entries removed');

select id as test, case when ok then 'PASS' else 'FAIL' end as result, detail
from t_results
order by ok, n;
