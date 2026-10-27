-- Security and behaviour tests for Milestones 10 + 11 — run on gg-test ONLY (Milestone 10 plan §6.2–§6.4,
-- Milestone 11 plan §6). Paste the whole file into the Supabase SQL Editor and press Run.
-- The last result lists every test: each row should say PASS (failures are listed first).
-- It creates two fake test users with fixed ids (no real people, no GitHub accounts) and removes them at the end,
-- together with everything they created. Re-running is safe. Test ids match the plans (R, X, P, LC, NV, V, SY).
-- Not covered here (needs two real sessions or a browser): concurrent saves, OAuth, the service worker — Stage 5.

-- Stop at once if this is not the test project.
do $$
begin
  if not exists (select 1 from private.environment where name = 'test') then
    raise exception 'Stop: this project is not marked as the test environment (run seed_gg_test.sql on gg-test only).';
  end if;
end
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Test harness (temporary objects, gone when the SQL Editor session ends)
-- ---------------------------------------------------------------------------------------------------------------
drop table if exists pg_temp.t_results;
create temp table t_results (n serial primary key, id text not null, ok boolean not null, detail text);

create or replace function pg_temp.check(p_id text, p_ok boolean, p_detail text)
returns void
language sql
as $$
  insert into t_results (id, ok, detail) values (p_id, coalesce(p_ok, false), left(p_detail, 300))
$$;

-- Runs one SQL statement as a signed-out visitor (p_uid null) or as the signed-in user p_uid, exactly as the Data
-- API would (role + JWT claims). Returns the single text value, or 'ERROR <sqlstate>: <message>'.
create or replace function pg_temp.as_user(p_uid uuid, p_sql text)
returns text
language plpgsql
as $$
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
returns jsonb
language plpgsql
as $$
begin
  return t::jsonb;
exception when others then
  return null;
end;
$$;

create or replace function pg_temp.save_sql(p_doc text, p_base bigint)
returns text
language sql
as $$
  select format('select public.save_progress(%L::jsonb, %s)::text', p_doc, coalesce(p_base::text, 'null'))
$$;

create or replace function pg_temp.consent_sql(p_version text, p_name text, p_programme text)
returns text
language sql
as $$
  select format('select public.accept_consent(%L, %L, %L)::text', p_version, p_name, p_programme)
$$;

-- Remove leftovers from an earlier, interrupted run.
delete from auth.users where id in ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002');
delete from private.consent_versions where version like 'zz-%-test';

-- Two fake test users with GitHub identities (ids and names are not real GitHub accounts).
insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('a0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'gg-test-student-a@example.invalid', '{"provider": "github", "providers": ["github"]}', '{}', now(), now()),
  ('b0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'gg-test-student-b@example.invalid', '{"provider": "github", "providers": ["github"]}', '{}', now(), now());
insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
values
  ('990000001', 'a0000000-0000-4000-8000-000000000001',
   '{"sub": "990000001", "provider_id": "990000001", "user_name": "gg-test-student-a"}', 'github', now(), now()),
  ('990000002', 'b0000000-0000-4000-8000-000000000002',
   '{"sub": "990000002", "provider_id": "990000002", "user_name": "gg-test-student-b"}', 'github', now(), now());

-- ---------------------------------------------------------------------------------------------------------------
-- Static checks: RLS, table and column grants, schema exposure, function settings and grants
-- ---------------------------------------------------------------------------------------------------------------
select pg_temp.check('T0', private.current_consent_version() is not null,
  'test environment with a current consent version: ' || coalesce(private.current_consent_version(), 'none'));

select pg_temp.check('R1a', bool_and(c.relrowsecurity), 'RLS enabled on every table in public: '
  || string_agg(c.relname || '=' || c.relrowsecurity, ', '))
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p');

select pg_temp.check('R1b', not bool_or(has_table_privilege('anon', t.tbl, p.priv)),
  'signed-out visitors have no privilege on profiles or progress')
from (values ('public.profiles'), ('public.progress')) t(tbl),
     unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) p(priv);

select pg_temp.check('R1c',
  has_table_privilege('authenticated', 'public.profiles', 'SELECT')
  and not has_table_privilege('authenticated', 'public.profiles', 'INSERT')
  and not has_table_privilege('authenticated', 'public.profiles', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.profiles', 'DELETE')
  and not has_table_privilege('authenticated', 'public.profiles', 'TRUNCATE')
  and has_column_privilege('authenticated', 'public.profiles', 'display_name', 'UPDATE')
  and has_column_privilege('authenticated', 'public.profiles', 'programme', 'UPDATE'),
  'students: read profiles (own row by RLS); update only display_name and programme');

select pg_temp.check('R1d', not bool_or(has_column_privilege('authenticated', 'public.profiles', col, 'UPDATE')),
  'protected profile columns not updatable: ' || string_agg(col, ', '))
from unnest(array['id', 'github_id', 'github_username', 'leaderboard_opt_in', 'leaderboard_hidden',
                  'consent_version', 'consent_at', 'created_at', 'updated_at']) col;

select pg_temp.check('R1e',
  has_table_privilege('authenticated', 'public.progress', 'SELECT')
  and not has_table_privilege('authenticated', 'public.progress', 'INSERT')
  and not has_table_privilege('authenticated', 'public.progress', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.progress', 'DELETE')
  and not has_table_privilege('authenticated', 'public.progress', 'TRUNCATE'),
  'students: read progress (own row by RLS); no direct writes');

select pg_temp.check('X4',
  not has_schema_privilege('anon', 'private', 'USAGE') and not has_schema_privilege('authenticated', 'private', 'USAGE'),
  'private schema not usable by API roles');

select pg_temp.check('X1-X2', bool_and(p.prosecdef and p.proconfig @> array['search_path=""']),
  'public functions: SECURITY DEFINER with search_path = '''': ' || string_agg(p.proname, ', '))
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('accept_consent', 'export_my_data', 'delete_my_account', 'account_status', 'save_progress');

select pg_temp.check('X2', bool_and(p.proconfig @> array['search_path=""']),
  'private helpers: search_path = '''' (' || count(*) || ' functions)')
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'private';

select pg_temp.check('X3a', not bool_or(has_function_privilege('anon', p.oid, 'EXECUTE')),
  'signed-out visitors cannot execute any public or private function')
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private');

select pg_temp.check('X3b', bool_and(has_function_privilege('authenticated', p.oid, 'EXECUTE')),
  'students can execute the five public functions')
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('accept_consent', 'export_my_data', 'delete_my_account', 'account_status', 'save_progress');

select pg_temp.check('X3c', not bool_or(has_function_privilege('authenticated', p.oid, 'EXECUTE')),
  'students cannot execute private helpers')
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'private';

select pg_temp.check('X5', not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and 'uuid'::regtype = any (p.proargtypes::regtype[])),
  'no public function accepts a user id (P1, X5)');

-- ---------------------------------------------------------------------------------------------------------------
-- Behaviour as signed-out visitor, student A and student B
-- ---------------------------------------------------------------------------------------------------------------
do $$
declare
  a constant uuid := 'a0000000-0000-4000-8000-000000000001';
  b constant uuid := 'b0000000-0000-4000-8000-000000000002';
  cv constant text := private.current_consent_version();
  r text;
  j jsonb;
  n integer;
  rev bigint;
  t1 text;
  t2 text;
begin
  -- Signed in, before consent (LC2)
  r := pg_temp.as_user(a, 'select count(*)::text from public.profiles');
  perform pg_temp.check('LC2a', r = '0', 'before consent: no profile visible: ' || r);
  r := pg_temp.as_user(a, pg_temp.save_sql('{"version": 1}', null));
  perform pg_temp.check('LC2b', r like 'ERROR 42501%', 'before consent: saving progress denied: ' || r);
  r := pg_temp.as_user(a, $q$select (public.export_my_data() -> 'profile')::text$q$);
  perform pg_temp.check('LC2c', r = 'null', 'before consent: Download my data works, no profile: ' || r);

  -- Consent and profile validation (NV1–NV4, LC4)
  r := pg_temp.as_user(null, pg_temp.consent_sql(cv, 'Visitor', 'BCA'));
  perform pg_temp.check('NV1', r like 'ERROR 42501%', 'signed out: accept_consent denied: ' || r);
  r := pg_temp.as_user(a, pg_temp.consent_sql('nope', 'Student A', 'BCA'));
  perform pg_temp.check('NV2a', r like 'ERROR 22023%', 'unknown consent version rejected: ' || r);
  insert into private.consent_versions (version, status, environment) values
    ('zz-retired-test', 'retired', 'test'), ('zz-prod-test', 'current', 'production');
  r := pg_temp.as_user(a, pg_temp.consent_sql('zz-retired-test', 'Student A', 'BCA'));
  perform pg_temp.check('NV2b', r like 'ERROR 22023%', 'retired consent version rejected: ' || r);
  r := pg_temp.as_user(a, pg_temp.consent_sql('zz-prod-test', 'Student A', 'BCA'));
  perform pg_temp.check('NV2c', r like 'ERROR 22023%', 'production consent version rejected on gg-test: ' || r);
  delete from private.consent_versions where version in ('zz-retired-test', 'zz-prod-test');
  r := pg_temp.as_user(a, pg_temp.consent_sql(cv, '   ', 'BCA'));
  perform pg_temp.check('NV3a', r like 'ERROR 22023%', 'empty display name rejected: ' || r);
  r := pg_temp.as_user(a, pg_temp.consent_sql(cv, repeat('x', 61), 'BCA'));
  perform pg_temp.check('NV3b', r like 'ERROR 22023%', '61-character display name rejected: ' || r);
  r := pg_temp.as_user(a, pg_temp.consent_sql(cv, '<script>alert(1)</script>', 'BCA'));
  perform pg_temp.check('NV3c', r like 'ERROR 22023%', 'HTML in display name rejected: ' || r);
  r := pg_temp.as_user(a, pg_temp.consent_sql(cv, 'Student A', 'PHD'));
  perform pg_temp.check('NV4', r like 'ERROR 22023%', 'unknown programme rejected: ' || r);
  select count(*) into n from public.profiles where id = a;
  perform pg_temp.check('LC4a', n = 0, 'failed calls left no profile and no consent: ' || n || ' rows');

  r := pg_temp.as_user(a, pg_temp.consent_sql(cv, '  Student   A ', 'BCA'));
  j := pg_temp.js(r);
  perform pg_temp.check('LC4b', j ->> 'display_name' = 'Student A' and j ->> 'consent_version' = cv
    and j ->> 'github_id' = '990000001' and j ->> 'github_username' = 'gg-test-student-a' and j ->> 'consent_at' is not null,
    'consent recorded and profile created; GitHub id from the sign-in record: ' || r);
  select consent_at::text into t1 from public.profiles where id = a;
  r := pg_temp.as_user(a, pg_temp.consent_sql(cv, 'Another Name', 'MSC-IT'));
  select count(*), max(consent_at::text) into n, t2 from public.profiles where id = a;
  perform pg_temp.check('LC7', n = 1 and t1 = t2 and pg_temp.js(r) ->> 'display_name' = 'Student A',
    'repeat call: still one profile, consent date unchanged: ' || r);
  r := pg_temp.as_user(b, pg_temp.consent_sql(cv, 'Student B', 'BSC-DS'));
  perform pg_temp.check('LC4c', pg_temp.js(r) ->> 'id' = b::text, 'student B profile created: ' || r);

  -- Profiles isolation (R2)
  r := pg_temp.as_user(a, 'select count(*)::text from public.profiles');
  perform pg_temp.check('R2a', r = '1', 'A sees exactly one profile (own): ' || r);
  r := pg_temp.as_user(a, format('select count(*)::text from public.profiles where id = %L', b));
  perform pg_temp.check('R2b', r = '0', 'A cannot read B''s profile: ' || r);
  r := pg_temp.as_user(a, format(
    'with u as (update public.profiles set display_name = %L where id = %L returning 1) select count(*)::text from u',
    'Hacked', b));
  perform pg_temp.check('R2c', r = '0', 'A cannot update B''s profile: ' || r);
  r := pg_temp.as_user(a, format(
    'with u as (update public.profiles set display_name = %L, programme = %L where id = %L returning 1) select count(*)::text from u',
    'Student A2', 'BCA-AI', a));
  perform pg_temp.check('R2d', r = '1', 'A can update own display name and programme: ' || r);
  r := pg_temp.as_user(a, format(
    'with u as (update public.profiles set consent_version = %L returning 1) select count(*)::text from u', 'x'));
  perform pg_temp.check('R2e', r like 'ERROR 42501%', 'A cannot change consent fields: ' || r);
  r := pg_temp.as_user(a, 'with u as (update public.profiles set github_id = 1 returning 1) select count(*)::text from u');
  perform pg_temp.check('R2f', r like 'ERROR 42501%', 'A cannot change the GitHub id: ' || r);
  r := pg_temp.as_user(a,
    'with u as (update public.profiles set leaderboard_opt_in = true returning 1) select count(*)::text from u');
  perform pg_temp.check('R2g', r like 'ERROR 42501%', 'leaderboard opt-in not updatable before Milestone 12 (K-6): ' || r);
  r := pg_temp.as_user(a, 'with u as (delete from public.profiles returning 1) select count(*)::text from u');
  perform pg_temp.check('R2h', r like 'ERROR 42501%', 'A cannot delete profiles directly: ' || r);
  r := pg_temp.as_user(a, format(
    'with u as (insert into public.profiles (id, github_id, github_username, display_name, programme, consent_version, consent_at) '
    'values (%L, 5, %L, %L, %L, %L, now()) returning 1) select count(*)::text from u', b, 'x', 'x', 'BCA', cv));
  perform pg_temp.check('R2i', r like 'ERROR 42501%', 'A cannot insert profiles directly: ' || r);

  -- Progress: ownership, server XP, merge, idempotency, validation (P1–P3, SY)
  r := pg_temp.as_user(a, pg_temp.save_sql(
    '{"version": 1, "units": {"1": {"sections": ["why"], "total": 9, "quiz": {"best": 80, "last": 80, "passed": true}, '
    '"complete": false}}, "missions": {"M-01": {"done": true, "at": "2026-10-20T10:00:00.000Z"}}, "badges": {}, '
    '"games": {}, "xp": 999999, "lastVisited": null}', null));
  j := pg_temp.js(r);
  perform pg_temp.check('P3a', (j ->> 'xp')::int = 175 and (j ->> 'revision')::int = 1 and (j -> 'doc' ->> 'xp')::int = 175,
    'first save: client XP 999999 ignored; XP from facts = 75 + 100: ' || r);
  r := pg_temp.as_user(a, 'select count(*)::text from public.progress');
  perform pg_temp.check('P1a', r = '1', 'A reads own progress: ' || r);
  r := pg_temp.as_user(b, format('select count(*)::text from public.progress where user_id = %L', a));
  perform pg_temp.check('P1b', r = '0', 'B cannot read A''s progress: ' || r);
  r := pg_temp.as_user(a, format(
    'with u as (update public.progress set xp = 99999 where user_id = %L returning 1) select count(*)::text from u', a));
  perform pg_temp.check('P1c', r like 'ERROR 42501%', 'A cannot write own XP directly: ' || r);
  r := pg_temp.as_user(b, format(
    'with u as (insert into public.progress (user_id, doc) values (%L, %L::jsonb) returning 1) select count(*)::text from u',
    a, '{"version": 1}'));
  perform pg_temp.check('P1d', r like 'ERROR 42501%', 'B cannot insert a progress row: ' || r);
  r := pg_temp.as_user(a, 'with u as (delete from public.progress returning 1) select count(*)::text from u');
  perform pg_temp.check('P1e', r like 'ERROR 42501%', 'A cannot delete progress directly: ' || r);
  r := pg_temp.as_user(null, pg_temp.save_sql('{"version": 1}', null));
  perform pg_temp.check('P1f', r like 'ERROR 42501%', 'signed out: save_progress denied: ' || r);

  r := pg_temp.as_user(a, pg_temp.save_sql(
    '{"version": 1, "units": {"1": {"sections": [], "total": 9, "quiz": {"best": 10, "last": 10, "passed": false}, '
    '"complete": false}}, "missions": {}, "xp": 0}', 1));
  j := pg_temp.js(r);
  perform pg_temp.check('P3b', j -> 'doc' -> 'units' -> '1' -> 'quiz' ->> 'best' = '80'
    and j -> 'doc' -> 'units' -> '1' -> 'quiz' ->> 'passed' = 'true'
    and j -> 'doc' -> 'units' -> '1' -> 'quiz' ->> 'last' = '10'
    and j -> 'doc' -> 'units' -> '1' -> 'sections' = '["why"]'
    and j -> 'doc' -> 'missions' ? 'M-01' and (j ->> 'xp')::int = 175,
    'older/lower copy cannot lower or remove progress: ' || r);
  rev := (j ->> 'revision')::bigint;
  r := pg_temp.as_user(a, pg_temp.save_sql(
    '{"version": 1, "units": {"1": {"sections": [], "total": 9, "quiz": {"best": 10, "last": 10, "passed": false}, '
    '"complete": false}}, "missions": {}, "xp": 0}', rev));
  j := pg_temp.js(r);
  perform pg_temp.check('SY-idem', j ->> 'changed' = 'false' and (j ->> 'revision')::bigint = rev,
    'same document again: no change, no new revision: ' || r);

  r := pg_temp.as_user(a, pg_temp.save_sql(
    '{"version": 1, "missions": {"M-02": {"done": true, "at": "2026-10-21T10:00:00.000Z"}}}', 0));
  j := pg_temp.js(r);
  perform pg_temp.check('SY-stale', j -> 'doc' -> 'missions' ? 'M-01' and j -> 'doc' -> 'missions' ? 'M-02'
    and (j ->> 'xp')::int = 250 and j ->> 'merged_newer' = 'true',
    'stale device (base revision 0): both missions kept, XP 250, told the stored copy was newer: ' || r);
  r := pg_temp.as_user(a, pg_temp.save_sql(
    '{"version": 1, "units": {"1": {"sections": [], "total": 9, "quiz": {"best": 90, "last": 90, "passed": true}, '
    '"complete": false}}}', null));
  j := pg_temp.js(r);
  perform pg_temp.check('SY-retry', (j ->> 'xp')::int = 250 and j -> 'doc' -> 'units' -> '1' -> 'quiz' ->> 'best' = '90',
    'quiz passed again with a higher score: best 90, no extra XP: ' || r);

  select revision into rev from public.progress where user_id = a;
  r := pg_temp.as_user(a, pg_temp.save_sql('{"version": 2}', null));
  perform pg_temp.check('P2a', r like 'ERROR 22023%', 'wrong version rejected: ' || r);
  r := pg_temp.as_user(a, pg_temp.save_sql(
    '{"version": 1, "units": {"1": {"quiz": {"best": 150, "passed": true}}}}', null));
  perform pg_temp.check('P2b', r like 'ERROR 22023%', 'quiz score above 100 rejected: ' || r);
  r := pg_temp.as_user(a, pg_temp.save_sql(
    json_build_object('version', 1, 'profile', json_build_object('name', repeat('x', 70000)))::text, null));
  perform pg_temp.check('P2c', r like 'ERROR 22023%', 'document over 64 KB rejected: ' || left(r, 80));
  r := pg_temp.as_user(a, pg_temp.save_sql('{"version": 1, "units": []}', null));
  perform pg_temp.check('P2d', r like 'ERROR 22023%', 'wrong shape rejected: ' || r);
  perform pg_temp.check('P2e', (select revision from public.progress where user_id = a) = rev,
    'rejected documents changed nothing');

  r := pg_temp.as_user(a, pg_temp.save_sql(
    '{"version": 1, "units": {"1": {"quiz": {"best": 90, "passed": true}}}, "missions": {"M-01": {"done": true}, '
    '"M-02": {"done": true}, "M-99": {"done": true}}, "badges": {"unit-1": "2026-10-20T10:00:00.000Z", '
    '"unit-2": "2026-10-20T10:00:00.000Z", "time-traveller": "2026-10-20T10:00:00.000Z", '
    '"made-up": "2026-10-20T10:00:00.000Z"}, "games": {"conflict": "2026-10-21T10:00:00.000Z"}, '
    '"lastVisited": {"href": "https://evil.example/", "title": "x"}}', null));
  j := pg_temp.js(r);
  perform pg_temp.check('P2f', not (j -> 'doc' -> 'missions' ? 'M-99')
    and j -> 'doc' -> 'badges' ? 'unit-1' and j -> 'doc' -> 'badges' ? 'time-traveller'
    and not (j -> 'doc' -> 'badges' ? 'unit-2') and not (j -> 'doc' -> 'badges' ? 'made-up')
    and (j ->> 'xp')::int = 300 and j -> 'doc' -> 'lastVisited' = 'null',
    'unknown mission and badge dropped; unjustified badge removed; game +50 XP; unsafe link dropped: ' || r);

  -- Re-consent after a wording change (LC6)
  update private.consent_versions set status = 'retired' where version = cv;
  insert into private.consent_versions (version, status, environment) values ('zz-next-test', 'current', 'test');
  r := pg_temp.as_user(a, pg_temp.save_sql('{"version": 1}', null));
  perform pg_temp.check('LC6a', r like 'ERROR 42501%', 'old consent: saving progress denied: ' || r);
  r := pg_temp.as_user(a, format(
    'with u as (update public.profiles set display_name = %L returning 1) select count(*)::text from u', 'New Name'));
  perform pg_temp.check('LC6b', r like 'ERROR 42501%', 'old consent: profile update denied: ' || r);
  r := pg_temp.as_user(a, $q$select public.export_my_data() -> 'profile' ->> 'id'$q$);
  perform pg_temp.check('LC6c', r = a::text, 'old consent: Download my data still works: ' || r);
  r := pg_temp.as_user(a, pg_temp.consent_sql('zz-next-test', 'Student A', 'BCA'));
  perform pg_temp.check('LC6d', pg_temp.js(r) ->> 'consent_version' = 'zz-next-test', 're-consent recorded: ' || r);
  r := pg_temp.as_user(a, pg_temp.save_sql('{"version": 1}', null));
  perform pg_temp.check('LC6e', r not like 'ERROR%', 'after re-consent saving works again: ' || left(r, 80));
  delete from private.consent_versions where version = 'zz-next-test';
  update private.consent_versions set status = 'current' where version = cv;
  update public.profiles set consent_version = cv where id = a;  -- back to the real draft for the next tests

  -- Download my data (S12-E)
  r := pg_temp.as_user(a, 'select public.export_my_data()::text');
  j := pg_temp.js(r);
  perform pg_temp.check('S12-E', j -> 'profile' ->> 'id' = a::text and (j -> 'progress' -> 'doc') is not null
    and j -> 'sign_in_record' ->> 'email' = 'gg-test-student-a@example.invalid'
    and position(b::text in r) = 0 and position('Student B' in r) = 0,
    'export holds A''s profile, progress and sign-in record, nothing of B');

  -- Account deletion, option (c) (V2, V5, V6, V10)
  r := pg_temp.as_user(b, pg_temp.save_sql('{"version": 1, "missions": {"M-01": {"done": true}}}', null));
  select p.updated_at::text || '|' || g.revision || '|' || g.updated_at::text into t1
  from public.profiles p join public.progress g on g.user_id = p.id where p.id = b;
  r := pg_temp.as_user(a, 'select public.delete_my_account()::text');
  perform pg_temp.check('Vc1', pg_temp.js(r) ->> 'status' = 'pending_completion', 'deletion requested: ' || r);
  perform pg_temp.check('Vc2', not exists (select 1 from public.profiles where id = a)
    and not exists (select 1 from public.progress where user_id = a)
    and exists (select 1 from private.deletion_requests where user_id = a),
    'A''s profile and progress removed at once; removal request recorded for the owner');
  select p.updated_at::text || '|' || g.revision || '|' || g.updated_at::text into t2
  from public.profiles p join public.progress g on g.user_id = p.id where p.id = b;
  perform pg_temp.check('V2', t1 = t2, 'B''s profile and progress untouched by A''s deletion');
  r := pg_temp.as_user(a, 'select public.delete_my_account()::text');
  select count(*) into n from private.deletion_requests where user_id = a;
  perform pg_temp.check('V5', pg_temp.js(r) ->> 'status' = 'pending_completion' and n = 1,
    'retry after deletion: same result, one request: ' || r);
  r := pg_temp.as_user(a, 'select public.account_status()::text');
  j := pg_temp.js(r);
  perform pg_temp.check('V10', j ->> 'has_profile' = 'false' and j ->> 'deletion_requested' = 'true',
    'status check reports pending completion: ' || r);
  r := pg_temp.as_user(a, pg_temp.save_sql('{"version": 1}', null));
  perform pg_temp.check('V6', r like 'ERROR 42501%', 'after deletion the old session cannot save data: ' || r);
  r := pg_temp.as_user(a, pg_temp.consent_sql(cv, 'Student A', 'BCA'));
  perform pg_temp.check('Vc3', pg_temp.js(r) ->> 'id' = a::text
    and not exists (select 1 from private.deletion_requests where user_id = a),
    'consenting again before the owner completes cancels the request (scenario 2): ' || left(r, 80));

  perform pg_temp.check('DONE', true, 'all behaviour tests ran to the end');
end
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Clean up: removing the two fake Auth users removes their profiles, progress and requests (cascade)
-- ---------------------------------------------------------------------------------------------------------------
delete from auth.users where id in ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002');
delete from private.consent_versions where version like 'zz-%-test';

select pg_temp.check('CLEAN', not exists (select 1 from public.profiles where github_id in (990000001, 990000002))
  and not exists (select 1 from private.deletion_requests where user_id in
    ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002'))
  and private.current_consent_version() is not null,
  'test users and their data removed; consent version restored');

select id as test,
       case when ok then 'PASS' else 'FAIL' end as result,
       detail
from t_results
order by ok, n;
