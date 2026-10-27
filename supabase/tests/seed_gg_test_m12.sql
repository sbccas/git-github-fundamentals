-- gg-test ONLY, before go-live — Milestone 12 consent wording (plan §3.2, M12-D5).
-- Retires "draft-1" and makes "draft-2" (adds: faculty of your batch can see your progress) the current version.
-- Signed-in test accounts are then asked to agree again (re-consent, Milestone 10 plan §4.8.3).

do $$
begin
  if not exists (select 1 from private.environment where name = 'test') then
    raise exception 'Stop: this project is not marked as the test environment.';
  end if;
end
$$;

update private.consent_versions set status = 'retired' where version = 'draft-1' and environment = 'test';

insert into private.consent_versions (version, status, environment, approved_by, approved_at)
values ('draft-2', 'current', 'test', 'Draft wording for testing — adds faculty access to batch progress (not approved for production)', now())
on conflict (version) do update set status = 'current';

select version, status, environment from private.consent_versions order by version;
