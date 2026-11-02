-- Remote session FINAL report (participation from Friday 30 Oct 00:00 IST to now) — READ-ONLY, safe on the live project.
-- One row per student in the batch, split into three periods so early finishers and late workers are not missed:
--   early   = Fri 30 Oct 00:00 → Sat 31 Oct 11:00
--   session = Sat 31 Oct 11:00 → 15:00
--   after   = Sat 31 Oct 15:00 → now
-- Active minutes = 5-minute periods with at least one saved change of progress (the student timer's rule).
-- Run in the Supabase SQL Editor and download the result as CSV into local-reports/.
with w as (
  select timestamptz '2026-10-30 00:00:00+05:30' as e,
         timestamptz '2026-10-31 11:00:00+05:30' as f,
         timestamptz '2026-10-31 15:00:00+05:30' as t,
         'BCA 2026 – SY AI'::text as batch
), s as (
  select p.id, p.roll_no, p.display_name, p.github_username, coalesce(g.doc, '{}'::jsonb) as doc, coalesce(g.xp, 0) as xp,
         l.project_url, l.project_check, l.project_submitted_at, l.wall_pr_url, l.wall_submitted_at, w.e, w.f, w.t
  from w
  join public.batches b on b.name = w.batch
  join public.profiles p on p.batch_id = b.id
  left join public.progress g on g.user_id = p.id
  left join private.session_links l on l.user_id = p.id
), r as (
  select s.*,
    (select count(distinct floor(extract(epoch from a.at) / 300)) * 5 from private.activity_log a where a.user_id = s.id and a.at >= s.e and a.at < s.f) as early_min,
    (select count(*) from private.activity_log a where a.user_id = s.id and a.at >= s.e and a.at < s.f) as early_saves,
    (select count(distinct floor(extract(epoch from a.at) / 300)) * 5 from private.activity_log a where a.user_id = s.id and a.at >= s.f and a.at < s.t) as session_min,
    (select count(*) from private.activity_log a where a.user_id = s.id and a.at >= s.f and a.at < s.t) as session_saves,
    (select min(a.at) from private.activity_log a where a.user_id = s.id and a.at >= s.f and a.at < s.t) as session_first,
    (select max(a.at) from private.activity_log a where a.user_id = s.id and a.at >= s.f and a.at < s.t) as session_last,
    (select count(distinct floor(extract(epoch from a.at) / 300)) * 5 from private.activity_log a where a.user_id = s.id and a.at >= s.t) as after_min,
    (select count(*) from private.activity_log a where a.user_id = s.id and a.at >= s.t) as after_saves,
    (select max(a.at) from private.activity_log a where a.user_id = s.id) as last_save_ever,
    (select string_agg(m.id, ' ' order by m.id) from unnest(array['M-12', 'M-13', 'M-14', 'M-15']) m(id)
      where s.doc -> 'missions' -> m.id ->> 'done' = 'true') as missions_done,
    (select count(*) from unnest(array['M-12', 'M-13', 'M-14', 'M-15']) m(id)
      where s.doc -> 'missions' -> m.id ->> 'done' = 'true' and private.ts(s.doc -> 'missions' -> m.id ->> 'at') >= s.e) as missions_since_fri,
    (select count(*) from unnest(array['M-12', 'M-13', 'M-14', 'M-15']) m(id)
      where s.doc -> 'missions' -> m.id ->> 'done' = 'true' and private.ts(s.doc -> 'missions' -> m.id ->> 'at') >= s.f
        and private.ts(s.doc -> 'missions' -> m.id ->> 'at') < s.t) as missions_in_session,
    (select count(*) from jsonb_each(coalesce(s.doc -> 'missions', '{}')) m where private.ts(m.value ->> 'at') >= s.e) as any_missions_since_fri,
    (s.doc -> 'units' -> '4' -> 'quiz' ->> 'passed' = 'true') as quiz4,
    (s.doc -> 'units' -> '5' -> 'quiz' ->> 'passed' = 'true') as quiz5,
    private.ts(s.doc -> 'selfCheck' ->> 'at') as self_check_at,
    (coalesce(s.project_check ->> 'public', '') = 'true')::int + (coalesce(s.project_check ->> 'readme', '') = 'true')::int
      + (coalesce(s.project_check ->> 'gitignore', '') = 'true')::int
      + (coalesce((s.project_check ->> 'commits')::int, 0) >= 5)::int
      + (coalesce((s.project_check ->> 'merged_prs')::int, 0) >= 1)::int
      + (coalesce(s.project_check ->> 'tag_v1', '') = 'true')::int as checklist
  from s
)
select
  r.roll_no as "Roll",
  r.display_name as "Name",
  r.github_username as "GitHub",
  r.early_min as "Early active min (Fri 00:00 to Sat 11:00)",
  r.early_saves as "Early saves",
  r.session_min as "Session active min (11:00 to 15:00)",
  r.session_saves as "Session saves",
  to_char(r.session_first at time zone 'Asia/Kolkata', 'HH24:MI') as "Session first save",
  to_char(r.session_last at time zone 'Asia/Kolkata', 'HH24:MI') as "Session last save",
  coalesce(round(extract(epoch from (r.session_last - r.session_first)) / 60), 0) as "Session span min",
  r.after_min as "After 15:00 active min",
  r.after_saves as "After saves",
  to_char(r.last_save_ever at time zone 'Asia/Kolkata', 'DD Mon HH24:MI') as "Last save ever",
  coalesce(r.missions_done, '') as "Session missions done (M-12 to M-15, any time)",
  r.missions_since_fri as "Session missions done since Fri",
  r.missions_in_session as "Session missions done 11:00 to 15:00",
  r.any_missions_since_fri as "Any missions done since Fri",
  case when r.quiz4 then 'yes' else 'no' end as "Unit 4 quiz passed",
  case when r.quiz5 then 'yes' else 'no' end as "Unit 5 quiz passed",
  coalesce(to_char(r.self_check_at at time zone 'Asia/Kolkata', 'DD Mon HH24:MI'), case when r.doc ? 'selfCheck' then 'yes (no date)' else '' end) as "Self-check taken",
  r.doc -> 'selfCheck' ->> 'best' as "Self-check best %",
  coalesce(r.project_url, '') as "Project link",
  case when r.project_url is null then '' else r.checklist::text end as "Checklist of 6",
  coalesce(r.project_check ->> 'commits', '') as "Project commits",
  coalesce(r.project_check ->> 'commits_in_session', '') as "Commits in session (at last check)",
  case when coalesce(r.project_check ->> 'env_file', '') = 'true' then 'YES' else '' end as ".env in repo",
  to_char(r.project_submitted_at at time zone 'Asia/Kolkata', 'DD Mon HH24:MI') as "Project submitted",
  coalesce(r.wall_pr_url, '') as "Class wall PR",
  to_char(r.wall_submitted_at at time zone 'Asia/Kolkata', 'DD Mon HH24:MI') as "Wall PR submitted",
  r.xp as "XP"
from r
order by coalesce(substring(r.roll_no from '(?:^|\D)(5\d\d)(?:\D|$)'), '999'), lower(r.display_name);
