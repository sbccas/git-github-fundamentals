-- Milestone 11 — progress sync (docs/plans/MILESTONE-11-SYNC-PLAN.md §4; Phase 2 plan §4, §5.1 P1–P3, §5.2).
-- One progress row per student holding the existing version 1 document (src/scripts/lib/progress.js), written only
-- by save_progress, which validates like validateProgress(), merges (add or raise only) and recalculates XP with the
-- deriveXp() rules. Quizzes are marked in the browser: the server cannot check answers (plan §4.4 trust model).

-- ---------------------------------------------------------------------------------------------------------------
-- Course constants — must match src/scripts/data/site.js (UNITS, BASE) and src/scripts/lib/progress.js (BADGES,
-- MISSION_BADGES, GAMES). `npm test` compares them (SY4). Only "M-" missions count for unit badges, as in progress.js.
-- ---------------------------------------------------------------------------------------------------------------
create function private.course()
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select
-- course-constants:start
'{"base": "/git-github-fundamentals/", "unit_missions": {"1": ["M-01", "M-02"], "2": ["M-03", "M-04", "M-05", "M-06", "M-07"], "3": ["M-08", "M-09", "M-10", "M-11"], "4": ["M-12", "M-13", "M-14", "M-15"], "5": []}, "mission_ids": ["M-01", "M-02", "M-03", "M-04", "M-05", "M-06", "M-07", "M-08", "M-09", "M-10", "M-11", "M-12", "M-13", "M-14", "M-15"], "games": ["conflict"], "badge_ids": ["first-commit", "unit-1", "unit-2", "unit-3", "unit-4", "unit-5", "conflict-crusher", "time-traveller", "course-complete"], "mission_badges": {"M-03": "first-commit", "M-10": "conflict-crusher"}, "xp": {"mission": 75, "quizPass": 100, "unitComplete": 50, "game": 50}}'
-- course-constants:end
  ::jsonb
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Pure helpers (SECURITY INVOKER; called only from save_progress — X1). No API role may execute them (X3).
-- ---------------------------------------------------------------------------------------------------------------
create function private.fail(why text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'This progress is not valid (%).', why using errcode = '22023';
end;
$$;

-- A date string, or null when it is not one (like Date.parse in progress.js; at most 40 characters).
create function private.ts(v text)
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
begin
  if v is null or char_length(v) > 40 then
    return null;
  end if;
  return v::timestamptz;
exception when others then
  return null;
end;
$$;

create function private.is_date(v jsonb)
returns boolean
language sql
stable
set search_path = ''
as $$
  select v is not null and jsonb_typeof(v) = 'string' and private.ts(v #>> '{}') is not null
$$;

-- A 0–100 percentage, rounded; anything else rejects the document.
create function private.pct(v jsonb, what text)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
begin
  if v is null or jsonb_typeof(v) <> 'number' or (v #>> '{}')::numeric not between 0 and 100 then
    perform private.fail(what || ' must be 0–100');
  end if;
  return round((v #>> '{}')::numeric)::integer;
end;
$$;

-- Badges that the recorded work justifies (same rules as checkBadges/validateProgress in progress.js).
create function private.justified_badges(doc jsonb)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  c jsonb := private.course();
  j text[] := array['time-traveller'];
  k text;
  v text;
  n text;
  all_units boolean := true;
begin
  for k, v in select key, value #>> '{}' from jsonb_each(c -> 'mission_badges') loop
    if (doc -> 'missions' -> k ->> 'done')::boolean is true then
      j := j || v;
    end if;
  end loop;
  for n in select jsonb_object_keys(c -> 'unit_missions') loop
    if (doc -> 'units' -> n -> 'quiz' ->> 'passed')::boolean is true
       and not exists (select 1 from jsonb_array_elements_text(c -> 'unit_missions' -> n) m(id)
                       where (doc -> 'missions' -> m.id ->> 'done')::boolean is not true) then
      j := j || ('unit-' || n);
    else
      all_units := false;
    end if;
  end loop;
  if all_units then
    j := j || 'course-complete'::text;
  end if;
  return j;
end;
$$;

-- XP = missions × 75 + first quiz passes × 100 + units complete × 50 + mini-games × 50 (deriveXp in progress.js).
create function private.derive_xp(doc jsonb)
returns integer
language sql
immutable
set search_path = ''
as $$
  select (
      (select count(*) from jsonb_each(coalesce(doc -> 'missions', '{}')) m
        where (m.value ->> 'done')::boolean is true) * 75
    + (select count(*) from jsonb_each(coalesce(doc -> 'units', '{}')) u
        where (u.value -> 'quiz' ->> 'passed')::boolean is true) * 100
    + (select count(*) from jsonb_each(coalesce(doc -> 'units', '{}')) u
        where (u.value ->> 'complete')::boolean is true) * 50
    + (select count(*) from jsonb_object_keys(coalesce(doc -> 'games', '{}'))) * 50
  )::integer
$$;

-- Removes unjustified badges and sets XP from the facts.
create function private.finish_progress(doc jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  justified text[] := private.justified_badges(doc);
begin
  doc := jsonb_set(doc, '{badges}', (
    select coalesce(jsonb_object_agg(b.key, b.value), '{}')
    from jsonb_each(coalesce(doc -> 'badges', '{}')) b
    where b.key = any (justified)));
  return jsonb_set(doc, '{xp}', to_jsonb(private.derive_xp(doc)));
end;
$$;

-- Distinct strings in first-seen order, at most 100.
create function private.distinct_strings(arr jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_agg(to_jsonb(s.x) order by s.o), '[]')
  from (
    select t.x, min(t.o) as o
    from jsonb_array_elements_text(coalesce(arr, '[]')) with ordinality as t(x, o)
    group by t.x
    order by 2
    limit 100
  ) s
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- validate_progress: mirrors validateProgress() — wrong types or ranges reject the whole document; unknown entries
-- are dropped; unjustified badges removed; XP recalculated.
-- ---------------------------------------------------------------------------------------------------------------
create function private.validate_progress(d jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  c jsonb := private.course();
  epoch constant jsonb := '"1970-01-01T00:00:00.000Z"';
  units jsonb := '{}';
  missions jsonb := '{}';
  games jsonb := '{}';
  badges jsonb := '{}';
  last_visited jsonb := 'null';
  self_check jsonb;
  profile jsonb;
  n text;
  k text;
  v jsonb;
  src jsonb;
  sections jsonb;
  total jsonb;
  q jsonb;
  quiz jsonb;
  s jsonb;
  by_unit jsonb;
  href text;
  clean_name text;
  result jsonb;
begin
  if d is null or jsonb_typeof(d) <> 'object' then
    perform private.fail('not a progress object');
  end if;
  if jsonb_typeof(d -> 'version') is distinct from 'number' or (d ->> 'version')::numeric <> 1 then
    perform private.fail('unsupported version');
  end if;

  if d ? 'units' then
    if jsonb_typeof(d -> 'units') <> 'object' then
      perform private.fail('units');
    end if;
    for n in select jsonb_object_keys(c -> 'unit_missions') loop
      src := d -> 'units' -> n;
      continue when src is null;
      if jsonb_typeof(src) <> 'object' then
        perform private.fail('unit ' || n);
      end if;
      sections := coalesce(nullif(src -> 'sections', 'null'::jsonb), '[]');
      if jsonb_typeof(sections) <> 'array'
         or exists (select 1 from jsonb_array_elements(sections) e
                    where jsonb_typeof(e) <> 'string' or char_length(e #>> '{}') > 80) then
        perform private.fail('unit ' || n || ' sections');
      end if;
      total := coalesce(nullif(src -> 'total', 'null'::jsonb), '0');
      if jsonb_typeof(total) <> 'number'
         or (total #>> '{}')::numeric <> trunc((total #>> '{}')::numeric)
         or (total #>> '{}')::numeric not between 0 and 100 then
        perform private.fail('unit ' || n || ' section total');
      end if;
      quiz := null;
      q := nullif(src -> 'quiz', 'null'::jsonb);
      if q is not null then
        if jsonb_typeof(q) <> 'object' or jsonb_typeof(q -> 'passed') is distinct from 'boolean' then
          perform private.fail('unit ' || n || ' quiz');
        end if;
        quiz := jsonb_build_object(
          'best', private.pct(q -> 'best', 'quiz score'),
          'last', private.pct(coalesce(nullif(q -> 'last', 'null'::jsonb), q -> 'best'), 'quiz score'),
          'passed', q -> 'passed');
      end if;
      if src ? 'complete' and jsonb_typeof(src -> 'complete') <> 'boolean' then
        perform private.fail('unit ' || n || ' complete');
      end if;
      units := units || jsonb_build_object(n, jsonb_build_object(
        'sections', private.distinct_strings(sections),
        'total', (total #>> '{}')::integer,
        'quiz', coalesce(quiz, 'null'::jsonb),
        'complete', coalesce((src ->> 'complete')::boolean, false)));
    end loop;
  end if;

  if d ? 'missions' then
    if jsonb_typeof(d -> 'missions') <> 'object' then
      perform private.fail('missions');
    end if;
    for k, v in select key, value from jsonb_each(d -> 'missions') loop
      continue when not (c -> 'mission_ids') ? k;
      if jsonb_typeof(v) <> 'object' or jsonb_typeof(v -> 'done') is distinct from 'boolean' then
        perform private.fail('mission ' || k);
      end if;
      if (v ->> 'done')::boolean then
        missions := missions || jsonb_build_object(k, jsonb_build_object(
          'done', true, 'at', case when private.is_date(v -> 'at') then v -> 'at' else epoch end));
      end if;
    end loop;
  end if;

  if d ? 'games' then
    if jsonb_typeof(d -> 'games') <> 'object' then
      perform private.fail('games');
    end if;
    for k in select jsonb_array_elements_text(c -> 'games') loop
      if d -> 'games' ? k then
        games := games || jsonb_build_object(k,
          case when private.is_date(d -> 'games' -> k) then d -> 'games' -> k else epoch end);
      end if;
    end loop;
  end if;

  if d ? 'badges' then
    if jsonb_typeof(d -> 'badges') <> 'object' then
      perform private.fail('badges');
    end if;
    for k, v in select key, value from jsonb_each(d -> 'badges') loop
      continue when not (c -> 'badge_ids') ? k;
      if not private.is_date(v) then
        perform private.fail('badge ' || k || ' date');
      end if;
      badges := badges || jsonb_build_object(k, v);
    end loop;
  end if;

  if jsonb_typeof(d -> 'lastVisited') = 'object'
     and jsonb_typeof(d -> 'lastVisited' -> 'href') = 'string'
     and jsonb_typeof(d -> 'lastVisited' -> 'title') = 'string' then
    href := d -> 'lastVisited' ->> 'href';
    if char_length(href) <= 200 and starts_with(href, c ->> 'base') and not starts_with(href, '//')
       and href !~ '[[:space:]"''<>\\]' then
      last_visited := jsonb_build_object('href', href, 'title', left(d -> 'lastVisited' ->> 'title', 120));
    end if;
  end if;

  s := nullif(d -> 'selfCheck', 'null'::jsonb);
  if s is not null then
    if jsonb_typeof(s) <> 'object' then
      perform private.fail('self-check');
    end if;
    by_unit := '{}';
    if s ? 'byUnit' then
      if jsonb_typeof(s -> 'byUnit') <> 'object' then
        perform private.fail('self-check units');
      end if;
      for n in select jsonb_object_keys(c -> 'unit_missions') loop
        if s -> 'byUnit' ? n then
          by_unit := by_unit || jsonb_build_object(n, private.pct(s -> 'byUnit' -> n, 'self-check score'));
        end if;
      end loop;
    end if;
    self_check := jsonb_build_object(
      'best', private.pct(s -> 'best', 'self-check score'),
      'last', private.pct(coalesce(nullif(s -> 'last', 'null'::jsonb), s -> 'best'), 'self-check score'),
      'byUnit', by_unit,
      'at', case when private.is_date(s -> 'at') then s -> 'at' else 'null'::jsonb end);
  end if;

  if jsonb_typeof(d -> 'profile') = 'object' and jsonb_typeof(d -> 'profile' -> 'name') in ('string', 'number', 'boolean') then
    clean_name := left(btrim(regexp_replace(regexp_replace(d -> 'profile' ->> 'name', '[[:cntrl:]<>]', '', 'g'), '\s+', ' ', 'g')), 60);
    if clean_name <> '' then
      profile := jsonb_build_object('name', clean_name);
    end if;
  end if;

  result := jsonb_build_object('version', 1, 'units', units, 'missions', missions, 'badges', badges, 'games', games,
                            'xp', 0, 'lastVisited', last_visited);
  if self_check is not null then
    result := result || jsonb_build_object('selfCheck', self_check);
  end if;
  if profile is not null then
    result := result || jsonb_build_object('profile', profile);
  end if;
  return private.finish_progress(result);
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- merge_progress(a = stored, b = incoming), both validated. Rules: Milestone 11 plan §4.2 (mergeProgress in
-- progress.js uses the same rules). Never lowers or removes anything that awards XP or a badge.
-- ---------------------------------------------------------------------------------------------------------------
-- Union of two maps whose values are dates (or {done, at} objects); the earliest date is kept.
create function private.union_earliest(a jsonb, b jsonb)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(s.key, s.value), '{}')
  from (
    select distinct on (z.key) z.key, z.value
    from (
      select key, value, 1 as side from jsonb_each(coalesce(a, '{}'))
      union all
      select key, value, 2 as side from jsonb_each(coalesce(b, '{}'))
    ) z
    order by z.key,
             private.ts(case when jsonb_typeof(z.value) = 'object' then z.value ->> 'at' else z.value #>> '{}' end)
               asc nulls last,
             z.side
  ) s
$$;

create function private.merge_progress(a jsonb, b jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  units jsonb := '{}';
  n text;
  ua jsonb;
  ub jsonb;
  qa jsonb;
  qb jsonb;
  q jsonb;
  sa jsonb;
  sb jsonb;
  self_check jsonb;
  profile jsonb;
  result jsonb;
begin
  for n in select jsonb_object_keys(coalesce(a -> 'units', '{}'))
           union select jsonb_object_keys(coalesce(b -> 'units', '{}')) loop
    ua := a -> 'units' -> n;
    ub := b -> 'units' -> n;
    if ua is null or ub is null then
      units := units || jsonb_build_object(n, coalesce(ua, ub));
      continue;
    end if;
    qa := nullif(ua -> 'quiz', 'null'::jsonb);
    qb := nullif(ub -> 'quiz', 'null'::jsonb);
    q := case
      when qa is null then qb
      when qb is null then qa
      else jsonb_build_object(
        'best', greatest((qa ->> 'best')::integer, (qb ->> 'best')::integer),
        'last', qb -> 'last',
        'passed', (qa ->> 'passed')::boolean or (qb ->> 'passed')::boolean)
    end;
    units := units || jsonb_build_object(n, jsonb_build_object(
      'sections', private.distinct_strings((ua -> 'sections') || (ub -> 'sections')),
      'total', greatest((ua ->> 'total')::integer, (ub ->> 'total')::integer),
      'quiz', coalesce(q, 'null'::jsonb),
      'complete', (ua ->> 'complete')::boolean or (ub ->> 'complete')::boolean));
  end loop;

  sa := nullif(a -> 'selfCheck', 'null'::jsonb);
  sb := nullif(b -> 'selfCheck', 'null'::jsonb);
  if sa is null or sb is null then
    self_check := coalesce(sb, sa);
  else
    -- last, byUnit and at from the newer attempt; best is the maximum.
    self_check := case
      when private.ts(sa ->> 'at') > coalesce(private.ts(sb ->> 'at'), '-infinity'::timestamptz) then sa
      else sb
    end || jsonb_build_object('best', greatest((sa ->> 'best')::integer, (sb ->> 'best')::integer));
  end if;

  profile := coalesce(b -> 'profile', a -> 'profile');  -- no timestamp in v1: the latest save wins (M11-D3)

  result := jsonb_build_object(
    'version', 1,
    'units', units,
    'missions', private.union_earliest(a -> 'missions', b -> 'missions'),
    'badges', private.union_earliest(a -> 'badges', b -> 'badges'),
    'games', private.union_earliest(a -> 'games', b -> 'games'),
    'xp', 0,
    'lastVisited', coalesce(nullif(b -> 'lastVisited', 'null'::jsonb), a -> 'lastVisited', 'null'::jsonb));
  if self_check is not null then
    result := result || jsonb_build_object('selfCheck', self_check);
  end if;
  if profile is not null then
    result := result || jsonb_build_object('profile', profile);
  end if;
  return private.finish_progress(result);
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- progress table: read own row only; written only by save_progress (P1–P3, R1, R2)
-- ---------------------------------------------------------------------------------------------------------------
create table public.progress (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  doc jsonb not null,
  xp integer not null default 0 check (xp >= 0),
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;
revoke all on public.progress from public, anon, authenticated;
grant select on public.progress to authenticated;

create policy progress_select_own on public.progress
  for select to authenticated
  using (user_id = (select auth.uid()));
-- No insert, update or delete policy or grant for any API role.

-- SECURITY DEFINER: writes public.progress, which no API role can write, and reads the consent allowlist (X1).
-- No user-id parameter: always the caller's own row (P1, X5).
create function public.save_progress(p_doc jsonb, p_base_revision bigint default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  clean jsonb;
  merged jsonb;
  stored public.progress;
  was_revision bigint;
begin
  if uid is null then
    raise exception 'Please sign in first.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles p
                 where p.id = uid and p.consent_version = private.current_consent_version()) then
    raise exception 'Please accept the current consent before saving online.' using errcode = '42501';
  end if;
  if p_doc is null or octet_length(p_doc::text) > 65536 then
    raise exception 'This progress is not valid (larger than 64 KB).' using errcode = '22023';
  end if;

  clean := private.validate_progress(p_doc);  -- raises on invalid input; nothing is changed

  insert into public.progress (user_id, doc) values (uid, private.validate_progress('{"version": 1}'))
  on conflict (user_id) do nothing;
  select * into stored from public.progress where user_id = uid for update;  -- serialises concurrent saves
  was_revision := stored.revision;

  merged := private.merge_progress(stored.doc, clean);
  if merged = stored.doc and stored.revision > 0 then  -- nothing new: same result, no new revision (idempotent)
    return jsonb_build_object('doc', stored.doc, 'xp', stored.xp, 'revision', stored.revision,
                              'changed', false, 'merged_newer', p_base_revision is distinct from was_revision);
  end if;

  update public.progress
     set doc = merged, xp = (merged ->> 'xp')::integer, revision = revision + 1, updated_at = now()
   where user_id = uid
  returning * into stored;
  return jsonb_build_object('doc', stored.doc, 'xp', stored.xp, 'revision', stored.revision, 'changed', true,
                            'merged_newer', was_revision > 0 and p_base_revision is distinct from was_revision);
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- export_my_data now includes progress (K-7). Same rules as in Milestone 10.
-- ---------------------------------------------------------------------------------------------------------------
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
    'profile', (select to_jsonb(p) from public.profiles p where p.id = uid),
    'progress', (select jsonb_build_object('doc', g.doc, 'xp', g.xp, 'revision', g.revision,
                                           'updated_at', g.updated_at)
                 from public.progress g where g.user_id = uid),
    'not_included', 'Other students'' data; Supabase security and sign-in logs (ask the college); your GitHub '
      || 'authorisation of this app (GitHub → Settings → Applications); progress on your devices that was never '
      || 'saved online.'
  );
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Function privileges (X3)
-- ---------------------------------------------------------------------------------------------------------------
revoke all on function private.course() from public, anon, authenticated;
revoke all on function private.fail(text) from public, anon, authenticated;
revoke all on function private.ts(text) from public, anon, authenticated;
revoke all on function private.is_date(jsonb) from public, anon, authenticated;
revoke all on function private.pct(jsonb, text) from public, anon, authenticated;
revoke all on function private.justified_badges(jsonb) from public, anon, authenticated;
revoke all on function private.derive_xp(jsonb) from public, anon, authenticated;
revoke all on function private.finish_progress(jsonb) from public, anon, authenticated;
revoke all on function private.distinct_strings(jsonb) from public, anon, authenticated;
revoke all on function private.validate_progress(jsonb) from public, anon, authenticated;
revoke all on function private.union_earliest(jsonb, jsonb) from public, anon, authenticated;
revoke all on function private.merge_progress(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.save_progress(jsonb, bigint) from public, anon, authenticated;
revoke all on function public.export_my_data() from public, anon, authenticated;
grant execute on function public.save_progress(jsonb, bigint) to authenticated;
grant execute on function public.export_my_data() to authenticated;
