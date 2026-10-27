-- gg-test ONLY — never run this on gg-prod (Milestone 10 plan §4.7, §4.8.3).
-- Marks the project as the test environment and adds the draft consent wording "draft-1".
-- Run once in the Supabase SQL Editor after both files in supabase/migrations/ have been applied.

do $$
begin
  if exists (select 1 from private.environment where name = 'production') then
    raise exception 'Stop: this project is marked as production. This seed is for the test project only.';
  end if;
end
$$;

insert into private.environment (name) values ('test')
on conflict (id) do nothing;

insert into private.consent_versions (version, status, environment, approved_by, approved_at)
values ('draft-1', 'current', 'test', 'Draft wording for the test project only — not approved for production', now())
on conflict (version) do nothing;

select e.name as environment, private.current_consent_version() as current_consent_version
from private.environment e;
