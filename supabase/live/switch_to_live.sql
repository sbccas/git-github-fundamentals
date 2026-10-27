-- ONE TIME, at go-live (Milestone 12 plan §6, owner approval 27 Oct 2026; M12-D8: the same project goes live).
-- Run only after the test accounts have been deleted. Switches the project from test to live use:
-- retires the draft consent wording, marks the environment as production and makes the approved wording "v1"
-- current. Afterwards every script in supabase/tests/ refuses to run on this project, by design.

do $$
begin
  if exists (select 1 from private.environment where name = 'production') then
    raise exception 'Stop: this project is already live.';
  end if;
end
$$;

update private.consent_versions set status = 'retired' where status = 'current';
update private.environment set name = 'production';
insert into private.consent_versions (version, status, environment, approved_by, approved_at)
values ('v1', 'current', 'production', 'Hitesh Patel (owner, Department Coordinator) — approved 27 Oct 2026', now());

select e.name as environment,
       private.current_consent_version() as current_consent_version,
       (select count(*) from auth.users) as sign_in_records,
       (select count(*) from public.profiles) as profiles,
       (select count(*) from private.faculty_allowlist) as faculty,
       (select count(*) from public.batches) as batches
from private.environment e;
