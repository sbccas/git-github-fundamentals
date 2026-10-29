-- Milestone 12c, part 1 — remote session (docs/plans/MILESTONE-12C-SESSION-EXAM-PLAN.md §2).
-- ADDITIVE: an activity log written by a trigger on progress (M12C-D2), per-student session links (project repository,
-- class-wall pull request), a faculty session report, and one extra field each in account_status() / export_my_data().
-- Nothing the live site already uses changes behaviour. X1–X6 for every new function.

-- ---------------------------------------------------------------------------------------------------------------
-- Activity log: the time of every progress save that changed something
-- ---------------------------------------------------------------------------------------------------------------
create table private.activity_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  at timestamptz not null default now()
);
create index activity_log_user_at on private.activity_log (user_id, at);
alter table private.activity_log enable row level security;
revoke all on private.activity_log from public, anon, authenticated;

-- SECURITY DEFINER: writes private.activity_log on behalf of save_progress (X1). Fires only when the stored copy
-- changed (new revision), so repeated identical saves add nothing.
create function private.log_progress_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.revision is distinct from old.revision then  -- save_progress inserts an empty row first, then updates
    insert into private.activity_log (user_id) values (new.user_id);
  end if;
  return new;
end;
$$;

create trigger progress_activity
  after update on public.progress
  for each row execute function private.log_progress_activity();

-- ---------------------------------------------------------------------------------------------------------------
-- Session links: the student's project repository (with the browser's GitHub check) and class-wall pull request
-- ---------------------------------------------------------------------------------------------------------------
create table private.session_links (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  project_url text check (project_url is null or project_url ~ '^https://github\.com/[A-Za-z0-9-]{1,39}/[A-Za-z0-9._-]{1,100}$'),
  project_check jsonb check (project_check is null or (jsonb_typeof(project_check) = 'object' and octet_length(project_check::text) <= 4096)),
  project_submitted_at timestamptz,
  wall_pr_url text check (wall_pr_url is null or wall_pr_url ~ '^https://github\.com/sbccas/sy-ai-2026-wall/pull/[0-9]{1,7}$'),
  wall_submitted_at timestamptz
);
alter table private.session_links enable row level security;
revoke all on private.session_links from public, anon, authenticated;

create function private.my_session_links(p_uid uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object('project_url', s.project_url, 'project_check', s.project_check,
                            'project_submitted_at', s.project_submitted_at,
                            'wall_pr_url', s.wall_pr_url, 'wall_submitted_at', s.wall_submitted_at)
  from private.session_links s where s.user_id = p_uid
$$;

-- SECURITY DEFINER: writes private.session_links (X1). Caller's own row only; null leaves a link unchanged.
-- project_check is what the student's browser read from GitHub's public data — a convenience for faculty, who can
-- open the repository themselves (trust model as for progress).
create function public.submit_session_links(p_project_url text, p_project_check jsonb, p_wall_pr_url text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  project text := nullif(regexp_replace(btrim(coalesce(p_project_url, '')), '(\.git)?/*$', ''), '');
  wall text := nullif(regexp_replace(btrim(coalesce(p_wall_pr_url, '')), '/+$', ''), '');
begin
  if uid is null then
    raise exception 'Please sign in first.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles p
                 where p.id = uid and p.consent_version = private.current_consent_version()) then
    raise exception 'Please accept the current consent first.' using errcode = '42501';
  end if;
  if project is not null and project !~ '^https://github\.com/[A-Za-z0-9-]{1,39}/[A-Za-z0-9._-]{1,100}$' then
    raise exception 'Project link must look like https://github.com/your-name/your-repository' using errcode = '22023';
  end if;
  if wall is not null and wall !~ '^https://github\.com/sbccas/sy-ai-2026-wall/pull/[0-9]{1,7}$' then
    raise exception 'Class wall link must look like https://github.com/sbccas/sy-ai-2026-wall/pull/12' using errcode = '22023';
  end if;
  if p_project_check is not null and (jsonb_typeof(p_project_check) <> 'object' or octet_length(p_project_check::text) > 4096) then
    raise exception 'The project check result is not valid.' using errcode = '22023';
  end if;
  if project is null and wall is null then
    raise exception 'Please paste a link first.' using errcode = '22023';
  end if;
  insert into private.session_links as s (user_id, project_url, project_check, project_submitted_at, wall_pr_url, wall_submitted_at)
  values (uid, project, case when project is not null then p_project_check end,
          case when project is not null then now() end, wall, case when wall is not null then now() end)
  on conflict (user_id) do update set
    project_url = coalesce(excluded.project_url, s.project_url),
    project_check = case when excluded.project_url is not null then excluded.project_check else s.project_check end,
    project_submitted_at = case when excluded.project_url is not null then now() else s.project_submitted_at end,
    wall_pr_url = coalesce(excluded.wall_pr_url, s.wall_pr_url),
    wall_submitted_at = case when excluded.wall_pr_url is not null then now() else s.wall_submitted_at end;
  return private.my_session_links(uid);
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Faculty session report (§2): one row per student of a linked batch for a time window
-- ---------------------------------------------------------------------------------------------------------------
-- SECURITY DEFINER: reads other students' activity, progress and links for a batch the caller is linked to (X1, R3).
-- Active time = distinct 5-minute periods with at least one progress save inside the window.
create function public.faculty_session_report(p_batch uuid, p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_see_batch(p_batch) then
    raise exception 'Batch not found.' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > interval '24 hours' then
    raise exception 'Choose a time window of up to 24 hours.' using errcode = '22023';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'display_name', p.display_name,
      'roll_no', p.roll_no,
      'github_username', p.github_username,
      'first_activity', (select min(a.at) from private.activity_log a where a.user_id = p.id and a.at >= p_from and a.at < p_to),
      'last_activity', (select max(a.at) from private.activity_log a where a.user_id = p.id and a.at >= p_from and a.at < p_to),
      'active_periods', (select count(distinct floor(extract(epoch from a.at) / 300)) from private.activity_log a
                         where a.user_id = p.id and a.at >= p_from and a.at < p_to),
      'saves', (select count(*) from private.activity_log a where a.user_id = p.id and a.at >= p_from and a.at < p_to),
      'missions_in_window', (select coalesce(jsonb_agg(m.key order by m.key), '[]') from jsonb_each(coalesce(g.doc -> 'missions', '{}')) m
                             where private.ts(m.value ->> 'at') >= p_from and private.ts(m.value ->> 'at') < p_to),
      'self_check_in_window', coalesce(private.ts(g.doc -> 'selfCheck' ->> 'at') >= p_from
                                       and private.ts(g.doc -> 'selfCheck' ->> 'at') < p_to, false),
      'self_check_best', g.doc -> 'selfCheck' -> 'best',
      'xp', coalesce(g.xp, 0),
      'project_url', s.project_url,
      'project_check', s.project_check,
      'project_submitted_at', s.project_submitted_at,
      'wall_pr_url', s.wall_pr_url,
      'wall_submitted_at', s.wall_submitted_at
    ) order by p.roll_no nulls last, lower(p.display_name))
    from public.profiles p
    left join public.progress g on g.user_id = p.id
    left join private.session_links s on s.user_id = p.id
    where p.batch_id = p_batch), '[]');
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
    'request', private.my_latest_request(uid),
    'session', private.my_session_links(uid));
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
    'session_links', private.my_session_links(uid),
    'activity_times', coalesce((select jsonb_agg(a.at order by a.at) from private.activity_log a where a.user_id = uid), '[]'),
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
-- Function privileges (X3)
-- ---------------------------------------------------------------------------------------------------------------
revoke all on function private.log_progress_activity() from public, anon, authenticated;
revoke all on function private.my_session_links(uuid) from public, anon, authenticated;
revoke all on function public.submit_session_links(text, jsonb, text) from public, anon, authenticated;
revoke all on function public.faculty_session_report(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.account_status() from public, anon, authenticated;
revoke all on function public.export_my_data() from public, anon, authenticated;
grant execute on function public.submit_session_links(text, jsonb, text) to authenticated;
grant execute on function public.faculty_session_report(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.account_status() to authenticated;
grant execute on function public.export_my_data() to authenticated;
