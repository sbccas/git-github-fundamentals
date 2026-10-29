-- Tests for Milestone 12c part 1 (remote session: activity log, session links, session report) — LOCAL ONLY:
-- run by `npm run sql-check`. Never run on the live project (it stops itself there).

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
  ('S1', 'd1000000-0000-4000-8000-000000000041', 990000041, 'gg-test-session-1'),
  ('S2', 'd1000000-0000-4000-8000-000000000042', 990000042, 'gg-test-session-2'),
  ('S3', 'd1000000-0000-4000-8000-000000000043', 990000043, 'gg-test-session-3'),
  ('X',  'd1000000-0000-4000-8000-000000000051', 990000051, 'gg-test-faculty-x3'),
  ('Y',  'd1000000-0000-4000-8000-000000000052', 990000052, 'gg-test-faculty-y3');
create or replace function pg_temp.uid(p_label text) returns uuid language sql as $$ select id from t_users where label = p_label $$;

delete from public.batches where created_by in (select gh from t_users);
delete from private.faculty_allowlist where github_id in (select gh from t_users);
delete from auth.users where id in (select id from t_users);
insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', lower(label) || '-m12c@example.invalid',
       '{"provider": "github", "providers": ["github"]}', '{}', now(), now() from t_users;
insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
select gh::text, id, jsonb_build_object('sub', gh::text, 'provider_id', gh::text, 'user_name', username), 'github', now(), now()
from t_users;
insert into private.faculty_allowlist (github_id, note) values (990000051, 'test faculty X3'), (990000052, 'test faculty Y3');

-- Static checks
select pg_temp.check('X1-X2', bool_and(p.prosecdef and p.proconfig @> array['search_path=""']),
  'new functions: SECURITY DEFINER, search_path = '''': ' || string_agg(p.proname, ', '))
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where (n.nspname = 'public' and p.proname in ('submit_session_links', 'faculty_session_report'))
   or (n.nspname = 'private' and p.proname = 'log_progress_activity');
select pg_temp.check('X3', not has_function_privilege('anon', 'public.submit_session_links(text,jsonb,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.faculty_session_report(uuid,timestamptz,timestamptz)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.my_session_links(uuid)', 'EXECUTE')
  and not has_table_privilege('authenticated', 'private.activity_log', 'SELECT')
  and not has_table_privilege('authenticated', 'private.session_links', 'SELECT'),
  'signed-out visitors cannot call the new functions; the log and links are not reachable from the site');

do $$
declare
  cv constant text := private.current_consent_version();
  r text;
  j jsonb;
  bx uuid;
  by_ uuid;
  lbl text;
  n integer;
  recent text := to_char((now() - interval '10 minutes') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  foreach lbl in array array['S1', 'S2', 'S3', 'X', 'Y'] loop
    perform pg_temp.as_user(pg_temp.uid(lbl), format('select public.accept_consent(%L, %L, %L)::text', cv, 'Test ' || lbl, 'BCA-AI'));
    perform pg_temp.as_user(pg_temp.uid(lbl), format('with u as (update public.profiles set roll_no = %L returning 1) select count(*)::text from u', '6' || right(lbl, 1) || '0'));
  end loop;
  bx := (pg_temp.js(pg_temp.as_user(pg_temp.uid('X'), $q$select public.faculty_create_batch('Session batch', 'BCA-AI', 2026)::text$q$)) ->> 'id')::uuid;
  by_ := (pg_temp.js(pg_temp.as_user(pg_temp.uid('Y'), $q$select public.faculty_create_batch('Other session batch', 'BCA', 2026)::text$q$)) ->> 'id')::uuid;
  perform pg_temp.as_user(pg_temp.uid('S1'), format('select public.join_batch(%L)::text', (select code from private.batch_join_codes where batch_id = bx)));
  perform pg_temp.as_user(pg_temp.uid('S2'), format('select public.join_batch(%L)::text', (select code from private.batch_join_codes where batch_id = bx)));
  perform pg_temp.as_user(pg_temp.uid('S3'), format('select public.join_batch(%L)::text', (select code from private.batch_join_codes where batch_id = by_)));

  -- Activity log (M12C-D2)
  perform pg_temp.as_user(pg_temp.uid('S1'), format('select public.save_progress(%L::jsonb, null)::text',
    '{"version": 1, "missions": {"M-01": {"done": true, "at": "2026-01-05T10:00:00.000Z"}}}'));
  perform pg_temp.as_user(pg_temp.uid('S1'), format('select public.save_progress(%L::jsonb, null)::text',
    format('{"version": 1, "missions": {"M-12": {"done": true, "at": "%s"}}, "selfCheck": {"best": 72, "last": 72, "byUnit": {}, "at": "%s"}}', recent, recent)));
  select count(*) into n from private.activity_log where user_id = pg_temp.uid('S1');
  perform pg_temp.check('AL1', n = 2, 'each progress save that changes something is logged once: ' || n);
  perform pg_temp.as_user(pg_temp.uid('S1'), format('select public.save_progress(%L::jsonb, null)::text',
    '{"version": 1, "missions": {"M-01": {"done": true, "at": "2026-01-05T10:00:00.000Z"}}}'));
  perform pg_temp.check('AL2', (select count(*) from private.activity_log where user_id = pg_temp.uid('S1')) = 2,
    'a save that changes nothing adds no activity');
  r := pg_temp.as_user(pg_temp.uid('S1'), 'select count(*)::text from private.activity_log');
  perform pg_temp.check('AL3', r like 'ERROR 42501%', 'students cannot read the activity log: ' || r);

  -- Session links
  r := pg_temp.as_user(null, $q$select public.submit_session_links('https://github.com/a/b', null, null)::text$q$);
  perform pg_temp.check('SL1', r like 'ERROR 42501%', 'signed out: cannot submit: ' || r);
  r := pg_temp.as_user(pg_temp.uid('S1'), $q$select public.submit_session_links(' https://github.com/gg-test/ai-app.git/ ', '{"readme": true, "commits": 7}', null)::text$q$);
  j := pg_temp.js(r);
  perform pg_temp.check('SL2', j ->> 'project_url' = 'https://github.com/gg-test/ai-app' and (j -> 'project_check' ->> 'commits')::int = 7
    and j ->> 'project_submitted_at' is not null, 'project link stored without .git and slashes, with the check result: ' || r);
  r := pg_temp.as_user(pg_temp.uid('S1'), $q$select public.submit_session_links('https://gitlab.com/x/y', null, null)::text$q$);
  perform pg_temp.check('SL3', r like 'ERROR 22023%', 'only github.com repository links are accepted: ' || r);
  r := pg_temp.as_user(pg_temp.uid('S1'), $q$select public.submit_session_links(null, null, 'https://github.com/someone/else/pull/3')::text$q$);
  perform pg_temp.check('SL4', r like 'ERROR 22023%', 'class wall link must be a pull request on sbccas/sy-ai-2026-wall: ' || r);
  r := pg_temp.as_user(pg_temp.uid('S1'), $q$select public.submit_session_links(null, null, 'https://github.com/sbccas/sy-ai-2026-wall/pull/12/')::text$q$);
  j := pg_temp.js(r);
  perform pg_temp.check('SL5', j ->> 'wall_pr_url' = 'https://github.com/sbccas/sy-ai-2026-wall/pull/12' and j ->> 'project_url' = 'https://github.com/gg-test/ai-app',
    'adding the class wall link keeps the project link: ' || r);
  r := pg_temp.as_user(pg_temp.uid('S1'), format('select public.submit_session_links(%L, %L::jsonb, null)::text',
    'https://github.com/gg-test/ai-app', json_build_object('x', repeat('y', 5000))::text));
  perform pg_temp.check('SL6', r like 'ERROR 22023%', 'an oversized check result is refused: ' || left(r, 60));
  r := pg_temp.as_user(pg_temp.uid('S1'), 'select (public.account_status() -> ''session'' ->> ''wall_pr_url'')');
  perform pg_temp.check('SL7', r = 'https://github.com/sbccas/sy-ai-2026-wall/pull/12', 'account_status shows the student''s links: ' || r);

  -- Session report (faculty of the batch only)
  r := pg_temp.as_user(pg_temp.uid('X'), format('select public.faculty_session_report(%L, %L, %L)::text', bx, now() - interval '1 hour', now() + interval '1 hour'));
  j := pg_temp.js(r);
  perform pg_temp.check('SR1', jsonb_array_length(j) = 2 and position('Test S3' in r) = 0,
    'faculty X''s report lists the two students of the batch, not the other batch: ' || left(r, 120));
  perform pg_temp.check('SR2', (select (e ->> 'active_periods')::int from jsonb_array_elements(j) e where e ->> 'display_name' = 'Test S1') >= 1
    and (select e -> 'missions_in_window' from jsonb_array_elements(j) e where e ->> 'display_name' = 'Test S1') = '["M-12"]'
    and (select (e ->> 'self_check_in_window')::boolean from jsonb_array_elements(j) e where e ->> 'display_name' = 'Test S1')
    and (select e ->> 'project_url' from jsonb_array_elements(j) e where e ->> 'display_name' = 'Test S1') = 'https://github.com/gg-test/ai-app',
    'student S1: active time, only the mission done in the window (M-12, not M-01), self-check, project link');
  perform pg_temp.check('SR3', (select (e ->> 'active_periods')::int from jsonb_array_elements(j) e where e ->> 'display_name' = 'Test S2') = 0,
    'a student with no activity shows 0 active periods');
  perform pg_temp.check('SR4', position('example.invalid' in r) = 0 and position(pg_temp.uid('S1')::text in r) = 0,
    'the report holds no email and no account ids');
  r := pg_temp.as_user(pg_temp.uid('Y'), format('select public.faculty_session_report(%L, %L, %L)::text', bx, now() - interval '1 hour', now() + interval '1 hour'));
  perform pg_temp.check('SR5', r like 'ERROR 42501%', 'faculty of another batch cannot see this report: ' || r);
  r := pg_temp.as_user(pg_temp.uid('S1'), format('select public.faculty_session_report(%L, %L, %L)::text', bx, now() - interval '1 hour', now() + interval '1 hour'));
  perform pg_temp.check('SR6', r like 'ERROR 42501%', 'students cannot see the report: ' || r);
  r := pg_temp.as_user(pg_temp.uid('X'), format('select public.faculty_session_report(%L, %L, %L)::text', bx, now() - interval '2 days', now()));
  perform pg_temp.check('SR7', r like 'ERROR 22023%', 'windows over 24 hours are refused: ' || r);

  -- Export and deletion
  r := pg_temp.as_user(pg_temp.uid('S1'), 'select public.export_my_data()::text');
  perform pg_temp.check('EX1', pg_temp.js(r) -> 'session_links' ->> 'project_url' = 'https://github.com/gg-test/ai-app'
    and jsonb_array_length(pg_temp.js(r) -> 'activity_times') = 2, 'Download my data includes the links and activity times');
  perform pg_temp.as_user(pg_temp.uid('S1'), 'select public.delete_my_account()::text');
  perform pg_temp.check('DEL', not exists (select 1 from private.activity_log where user_id = pg_temp.uid('S1'))
    and not exists (select 1 from private.session_links where user_id = pg_temp.uid('S1')),
    'deleting the account removes the activity log and links');

  perform pg_temp.check('DONE', true, 'all behaviour tests ran to the end');
end
$$;

delete from public.batches where created_by in (select gh from t_users);
delete from private.faculty_allowlist where github_id in (select gh from t_users);
delete from auth.users where id in (select id from t_users);
select pg_temp.check('CLEAN', not exists (select 1 from public.profiles where github_id in (select gh from t_users)),
  'test users, batches, links and activity removed');

select id as test, case when ok then 'PASS' else 'FAIL' end as result, detail
from t_results
order by ok, n;
