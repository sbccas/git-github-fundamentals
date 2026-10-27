-- Milestone 10 — Phase 2 foundation (docs/plans/MILESTONE-10-FOUNDATION-PLAN.md §4.3, decisions of 26 Oct 2026).
-- Profiles, consent versions, consent-first profile creation, "Download my data", account deletion option (c).
-- The faculty allowlist is not created here: it moves to Milestone 12 (Milestone 11 plan, M11-D4).
-- Security rules: RLS on every table, default deny; X1–X6 for every privileged function (Phase 2 plan §5.1).
-- Environment-specific rows (environment name, consent versions) are NOT in this file: gg-test uses
-- supabase/tests/seed_gg_test.sql; gg-prod gets its approved consent version only after G-4.

-- ---------------------------------------------------------------------------------------------------------------
-- Private schema: not exposed by the Data API, no access for API roles (X4)
-- ---------------------------------------------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from public, anon, authenticated;
alter default privileges in schema private revoke all on tables from public, anon, authenticated;

-- Which environment this project is ('test' on gg-test, 'production' on gg-prod). One row, set by the owner.
create table private.environment (
  id boolean primary key default true check (id),
  name text not null check (name in ('test', 'production'))
);

-- Consent wording versions (P-7). Exactly one 'current' version per environment.
create table private.consent_versions (
  version text primary key check (version ~ '^[a-z0-9][a-z0-9-]{0,31}$'),
  status text not null check (status in ('current', 'retired')),
  environment text not null check (environment in ('test', 'production')),
  approved_by text,
  approved_at timestamptz
);
create unique index consent_versions_one_current on private.consent_versions (environment) where status = 'current';

-- Account deletion requests (P-6 (c)): the owner removes the Auth user in the dashboard; the row then goes with it.
create table private.deletion_requests (
  user_id uuid primary key references auth.users (id) on delete cascade,
  requested_at timestamptz not null default now()
);

revoke all on private.environment, private.consent_versions, private.deletion_requests from public, anon, authenticated;
-- Defence in depth: RLS on with no policies, so even a mistaken future grant would expose no rows. The definer
-- functions below are owned by the table owner, which RLS does not restrict.
alter table private.environment enable row level security;
alter table private.consent_versions enable row level security;
alter table private.deletion_requests enable row level security;

-- The consent version accepted in this environment, or null when none is configured (then nothing can be saved).
-- SECURITY INVOKER: only called from the definer functions and the trigger below (X1).
create function private.current_consent_version()
returns text
language sql
stable
set search_path = ''
as $$
  select cv.version
  from private.consent_versions cv
  join private.environment e on e.name = cv.environment
  where cv.status = 'current'
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Profiles (S-03 subset; K-2: no batch; K-6: leaderboard columns created, not updatable yet)
-- ---------------------------------------------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  github_id bigint not null unique,
  github_username text not null check (char_length(github_username) between 1 and 39),
  display_name text not null check (
    char_length(display_name) between 1 and 60
    and display_name = btrim(display_name)
    and display_name !~ '[[:cntrl:]<>]'
  ),
  programme text not null check (programme in ('BCA', 'BCA-AI', 'BSC-DS', 'MSC-IT')),
  leaderboard_opt_in boolean not null default false,
  leaderboard_hidden boolean not null default false,
  consent_version text not null,
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, programme) on public.profiles to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
-- No insert or delete policy: profiles are created only by accept_consent and removed by delete_my_account or
-- with the Auth user (cascade).

-- Re-consent rule (§4.8.3, LC6) and updated_at. SECURITY DEFINER: reads private.consent_versions, which the
-- updating user cannot read (X1). A consent change can only come from accept_consent (no column grant).
create function private.profiles_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.consent_version = old.consent_version
     and new.consent_version is distinct from private.current_consent_version() then
    raise exception 'Please review and accept the updated consent first.' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_before_update
  before update on public.profiles
  for each row execute function private.profiles_before_update();

-- ---------------------------------------------------------------------------------------------------------------
-- accept_consent: records consent and creates (or re-consents) the caller's profile in one transaction (P-5, K-3)
-- ---------------------------------------------------------------------------------------------------------------
-- SECURITY DEFINER: must read private.consent_versions and auth.identities and insert into public.profiles, none
-- of which the caller may access directly (X1). The caller is identified only by auth.uid() (X5).
create function public.accept_consent(p_consent_version text, p_display_name text, p_programme text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  current_v text := private.current_consent_version();
  clean_name text := btrim(regexp_replace(coalesce(p_display_name, ''), '\s+', ' ', 'g'));
  gh_id bigint;
  gh_user text;
  result public.profiles;
begin
  if uid is null then
    raise exception 'Please sign in first.' using errcode = '42501';
  end if;
  if current_v is null or p_consent_version is distinct from current_v then
    raise exception 'This consent version is not accepted. Please reload the page.' using errcode = '22023';
  end if;
  if char_length(clean_name) not between 1 and 60 or clean_name ~ '[[:cntrl:]<>]' then
    raise exception 'Display name must be 1–60 characters, without < or >.' using errcode = '22023';
  end if;
  if p_programme is null or p_programme not in ('BCA', 'BCA-AI', 'BSC-DS', 'MSC-IT') then
    raise exception 'Please choose a programme from the list.' using errcode = '22023';
  end if;

  select i.provider_id::bigint,
         coalesce(i.identity_data ->> 'user_name', i.identity_data ->> 'preferred_username')
    into gh_id, gh_user
  from auth.identities i
  where i.user_id = uid and i.provider = 'github' and i.provider_id ~ '^[0-9]{1,18}$'
  limit 1;
  if gh_id is null or gh_user is null then
    raise exception 'Your GitHub sign-in could not be read. Please sign in again.' using errcode = '42501';
  end if;

  insert into public.profiles as p (id, github_id, github_username, display_name, programme, consent_version, consent_at)
  values (uid, gh_id, left(gh_user, 39), clean_name, p_programme, current_v, now())
  on conflict (id) do update
    set consent_version = excluded.consent_version, consent_at = now()
    where p.consent_version is distinct from excluded.consent_version
  returning * into result;

  if result.id is null then  -- repeat call with the same version: unchanged (idempotent, LC7)
    select * into result from public.profiles where id = uid;
  end if;

  -- Consenting again cancels an earlier deletion request that the owner has not completed (P-6 (c) half state).
  delete from private.deletion_requests where user_id = uid;

  return to_jsonb(result);
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- export_my_data: the caller's online data (§4.5; K-10: basic Auth fields included). Replaced in Milestone 11.
-- ---------------------------------------------------------------------------------------------------------------
-- SECURITY DEFINER: reads the caller's own auth.users row, which the API roles cannot read (X1).
create function public.export_my_data()
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
    'not_included', 'Other students'' data; Supabase security and sign-in logs (ask the college); your GitHub '
      || 'authorisation of this app (GitHub → Settings → Applications); progress kept only on your devices.'
  );
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- delete_my_account: option (c) — removes the caller's application data now and records a removal request;
-- the owner then deletes the Auth user in the dashboard within the agreed time (§4.9).
-- ---------------------------------------------------------------------------------------------------------------
-- SECURITY DEFINER: deletes the caller's profile (no delete grant for API roles) and writes
-- private.deletion_requests (X1). Only the caller's own rows are touched (X5).
create function public.delete_my_account()
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
  delete from public.profiles where id = uid;  -- cascades to the caller's other application rows
  insert into private.deletion_requests (user_id) values (uid) on conflict (user_id) do nothing;
  return jsonb_build_object('status', 'pending_completion',
    'requested_at', (select requested_at from private.deletion_requests where user_id = uid));
end;
$$;

-- account_status: lets the client classify the outcome of a deletion or a lost response (§4.9.1).
-- SECURITY DEFINER: reads private.deletion_requests (X1).
create function public.account_status()
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
    'deletion_requested', exists (select 1 from private.deletion_requests where user_id = uid));
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Function privileges (X3): nothing for PUBLIC or anon; public functions for authenticated; helpers for no API role
-- ---------------------------------------------------------------------------------------------------------------
revoke all on function private.current_consent_version() from public, anon, authenticated;
revoke all on function private.profiles_before_update() from public, anon, authenticated;
revoke all on function public.accept_consent(text, text, text) from public, anon, authenticated;
revoke all on function public.export_my_data() from public, anon, authenticated;
revoke all on function public.delete_my_account() from public, anon, authenticated;
revoke all on function public.account_status() from public, anon, authenticated;
grant execute on function public.accept_consent(text, text, text) to authenticated;
grant execute on function public.export_my_data() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.account_status() to authenticated;
