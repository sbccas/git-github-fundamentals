-- Remote session full report (31 Oct 2026, 11:00–15:00 IST) — READ-ONLY, safe to run on the live project.
-- One row per student in the batch. Shows today's work AND work done before 11:00 (early finishers), so nobody who
-- completed early is missed. Run in the Supabase SQL Editor, then download the result as CSV into local-reports/.
-- Change the batch name or the window on the first lines if needed. Times are shown in India Standard Time.
-- Active minutes count only 5-minute periods in which the student's saved progress CHANGED (a new lesson section, a
-- different page, a finished mission, a quiz or self-check). Time spent typing in a mission, reading, or working on
-- GitHub (Part B) saves nothing, so the span from first to last save is shown as well.
-- Note: unit quizzes keep no date, so a passed quiz cannot be placed before or during the session.
with w as (
  select timestamptz '2026-10-31 11:00:00+05:30' as f,
         timestamptz '2026-10-31 15:00:00+05:30' as t,
         'BCA 2026 – SY AI'::text as batch
), s as (
  select p.id, p.roll_no, p.display_name, p.github_username, coalesce(g.doc, '{}'::jsonb) as doc, coalesce(g.xp, 0) as xp,
         l.project_url, l.project_check, l.project_submitted_at, l.wall_pr_url, l.wall_submitted_at, w.f, w.t
  from w
  join public.batches b on b.name = w.batch
  join public.profiles p on p.batch_id = b.id
  left join public.progress g on g.user_id = p.id
  left join private.session_links l on l.user_id = p.id
), r as (
  select s.*,
    (select count(distinct floor(extract(epoch from a.at) / 300)) * 5 from private.activity_log a
      where a.user_id = s.id and a.at >= s.f and a.at < s.t) as min_today,
    (select count(distinct floor(extract(epoch from a.at) / 300)) * 5 from private.activity_log a
      where a.user_id = s.id and a.at < s.f) as min_before,
    (select min(a.at) from private.activity_log a where a.user_id = s.id and a.at >= s.f and a.at < s.t) as first_today,
    (select max(a.at) from private.activity_log a where a.user_id = s.id and a.at >= s.f and a.at < s.t) as last_today,
    (select count(*) from private.activity_log a where a.user_id = s.id and a.at >= s.f and a.at < s.t) as saves_today,
    (select string_agg(m.id, ' ' order by m.id) from unnest(array['M-12', 'M-13', 'M-14', 'M-15']) m(id)
      where s.doc -> 'missions' -> m.id ->> 'done' = 'true') as missions_done,
    (select count(*) from unnest(array['M-12', 'M-13', 'M-14', 'M-15']) m(id)
      where s.doc -> 'missions' -> m.id ->> 'done' = 'true') as n_missions,
    (select count(*) from unnest(array['M-12', 'M-13', 'M-14', 'M-15']) m(id)
      where s.doc -> 'missions' -> m.id ->> 'done' = 'true' and private.ts(s.doc -> 'missions' -> m.id ->> 'at') < s.f) as n_missions_before,
    (select count(*) from unnest(array['M-12', 'M-13', 'M-14', 'M-15']) m(id)
      where s.doc -> 'missions' -> m.id ->> 'done' = 'true' and private.ts(s.doc -> 'missions' -> m.id ->> 'at') >= s.f
        and private.ts(s.doc -> 'missions' -> m.id ->> 'at') < s.t) as n_missions_today,
    (s.doc -> 'units' -> '4' -> 'quiz' ->> 'passed' = 'true') as quiz4,
    (s.doc -> 'units' -> '5' -> 'quiz' ->> 'passed' = 'true') as quiz5,
    private.ts(s.doc -> 'selfCheck' ->> 'at') as self_check_at,
    (coalesce(s.project_check ->> 'public', '') = 'true')::int + (coalesce(s.project_check ->> 'readme', '') = 'true')::int
      + (coalesce(s.project_check ->> 'gitignore', '') = 'true')::int
      + (coalesce((s.project_check ->> 'commits')::int, 0) >= 5)::int
      + (coalesce((s.project_check ->> 'merged_prs')::int, 0) >= 1)::int
      + (coalesce(s.project_check ->> 'tag_v1', '') = 'true')::int as checklist
  from s
), x as (
  select r.*,
    r.n_missions + coalesce(r.quiz4, false)::int + coalesce(r.quiz5, false)::int + (r.doc ? 'selfCheck')::int as part_a,
    case when r.project_submitted_at is null then '' when r.project_submitted_at < r.f then 'before 11:00'
         when r.project_submitted_at < r.t then 'during' else 'after 15:00' end as part_b_when,
    case when r.wall_submitted_at is null then '' when r.wall_submitted_at < r.f then 'before 11:00'
         when r.wall_submitted_at < r.t then 'during' else 'after 15:00' end as part_c_when
  from r
)
select
  x.roll_no as "Roll",
  x.display_name as "Name",
  x.github_username as "GitHub",
  case
    when x.min_today >= 90 then 'Attended today (90+ min)'
    when extract(epoch from (x.last_today - x.first_today)) / 60 >= 90 then 'Present 90+ min (first to last save)'
    when x.part_a = 7 and x.checklist = 6 and x.min_today < 90
         and (x.part_b_when = 'before 11:00' or x.n_missions_before > 0 or x.self_check_at < x.f) then 'Completed early — check'
    when x.min_today > 0 then 'Partly active today'
    when x.min_before > 0 or x.part_a > 0 or x.project_url is not null then 'Worked earlier only'
    else 'No work recorded'
  end as "Result",
  x.min_today as "Active min today",
  x.min_before as "Active min before 11:00 (all days)",
  to_char(x.first_today at time zone 'Asia/Kolkata', 'HH24:MI') as "First today",
  to_char(x.last_today at time zone 'Asia/Kolkata', 'HH24:MI') as "Last today",
  coalesce(round(extract(epoch from (x.last_today - x.first_today)) / 60), 0) as "Span today (min, first to last save)",
  x.saves_today as "Saves today",
  x.part_a || ' of 7' as "Part A done (any time)",
  coalesce(x.missions_done, '') as "Missions done",
  x.n_missions_before as "Missions before 11:00",
  x.n_missions_today as "Missions today",
  case when x.quiz4 then 'yes' else 'no' end as "Unit 4 quiz",
  case when x.quiz5 then 'yes' else 'no' end as "Unit 5 quiz",
  case when x.self_check_at is null and not (x.doc ? 'selfCheck') then 'not taken'
       when x.self_check_at < x.f then 'before 11:00' when x.self_check_at < x.t then 'today'
       else 'after 15:00' end as "Self-check taken",
  x.doc -> 'selfCheck' ->> 'best' as "Self-check best %",
  coalesce(x.project_url, '') as "Project link",
  case when x.project_url is null then '' else x.checklist || ' of 6' end as "Checklist",
  coalesce(x.project_check ->> 'commits_in_session', '') as "Commits in session (at last check)",
  case when coalesce(x.project_check ->> 'env_file', '') = 'true' then 'YES — warn' else '' end as ".env in repo",
  to_char(x.project_submitted_at at time zone 'Asia/Kolkata', 'DD Mon HH24:MI') as "Project submitted",
  x.part_b_when as "Project when",
  coalesce(x.wall_pr_url, '') as "Class wall PR",
  to_char(x.wall_submitted_at at time zone 'Asia/Kolkata', 'DD Mon HH24:MI') as "Wall PR submitted",
  x.part_c_when as "Wall PR when",
  x.xp as "XP"
from x
order by coalesce(substring(x.roll_no from '(?:^|\D)(5\d\d)(?:\D|$)'), '999'), lower(x.display_name);
