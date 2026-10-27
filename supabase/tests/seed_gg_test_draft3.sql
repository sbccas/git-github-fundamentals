-- gg-test ONLY, before go-live — consent wording "draft-3" adds the roll number / SID (M12-D9).
-- Retires "draft-2"; signed-in test accounts are asked to agree again.

do $$
begin
  if not exists (select 1 from private.environment where name = 'test') then
    raise exception 'Stop: this project is not marked as the test environment.';
  end if;
end
$$;

update private.consent_versions set status = 'retired' where version in ('draft-1', 'draft-2') and environment = 'test';

insert into private.consent_versions (version, status, environment, approved_by, approved_at)
values ('draft-3', 'current', 'test', 'Draft wording for testing — adds roll number / SID (not approved for production)', now())
on conflict (version) do update set status = 'current';

select version, status, environment from private.consent_versions order by version;
