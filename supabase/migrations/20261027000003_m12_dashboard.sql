-- Milestone 12 — faculty dashboard, batches and join codes (docs/plans/MILESTONE-12-DASHBOARD-PLAN.md §3.1).
-- Faculty role only from the allowlist of GitHub numeric ids (F1–F4); faculty see only batches they are linked to
-- (R3, M12-D7: several faculty per batch); students cannot list batches (R5); join codes never readable through a
-- table (J1), one message for every failed join (J2), at most 10 failed joins per hour (J3), codes only for linked
-- faculty (J4). X1–X6 for every privileged function. Faculty can read progress but never change it (S-06, §5.4).

-- ---------------------------------------------------------------------------------------------------------------
-- Faculty allowlist and role check (moved here from Milestone 10 by M11-D4)
-- ---------------------------------------------------------------------------------------------------------------
create table private.faculty_allowlist (
  github_id bigint primary key,
  note text,
  added_at timestamptz not null default now()
);
alter table private.faculty_allowlist enable row level security;
revoke all on private.faculty_allowlist from public, anon, authenticated;

-- GitHub numeric id of the caller, from Supabase Auth's identity record (never from the browser). SECURITY INVOKER:
-- called only from the definer functions below (X1).
create function private.current_github_id()
returns bigint
language sql
stable
set search_path = ''
as $$
  select i.provider_id::bigint
  from auth.identities i
  where i.user_id = auth.uid() and i.provider = 'github' and i.provider_id ~ '^[0-9]{1,18}$'
  limit 1
$$;

-- Evaluated on every call, so removal from the allowlist takes effect at once (F4).
create function private.is_faculty()
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from private.faculty_allowlist f where f.github_id = private.current_github_id())
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Batches, the faculty linked to them, join codes and join attempts
-- ---------------------------------------------------------------------------------------------------------------
create table public.batches (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80 and name = btrim(name) and name !~ '[[:cntrl:]<>]'),
  programme text not null check (programme in ('BCA', 'BCA-AI', 'BSC-DS', 'MSC-IT')),
  year integer not null check (year between 2020 and 2100),
  created_by bigint not null,  -- GitHub id of the faculty member who created it
  created_at timestamptz not null default now()
);
alter table public.batches enable row level security;
revoke all on public.batches from public, anon, authenticated;
-- No policies and no grants: faculty read batches only through the functions below; students only see their own
-- batch's name through account_status (R5).

create table private.batch_faculty (
  batch_id uuid not null references public.batches (id) on delete cascade,
  github_id bigint not null,
  added_at timestamptz not null default now(),
  primary key (batch_id, github_id)
);

-- 8 characters from a 32-letter alphabet without I, O, 0, 1 (J3).
create table private.batch_join_codes (
  batch_id uuid primary key references public.batches (id) on delete cascade,
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table private.join_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  success boolean not null
);
create index join_attempts_user_at on private.join_attempts (user_id, at);

alter table private.batch_faculty enable row level security;
alter table private.batch_join_codes enable row level security;
alter table private.join_attempts enable row level security;
revoke all on private.batch_faculty, private.batch_join_codes, private.join_attempts from public, anon, authenticated;

-- The student's batch. Not updatable by students (no column grant): set only by join_batch.
alter table public.profiles add column batch_id uuid references public.batches (id) on delete set null;

-- A new random code. Uses only the fully random bytes of a version 4 UUID; 256 is a multiple of 32, so every
-- letter is equally likely.
create function private.new_join_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  b bytea := uuid_send(gen_random_uuid());
  code text := '';
  i integer;
begin
  foreach i in array array[0, 1, 2, 3, 4, 5, 10, 11] loop
    code := code || substr(alphabet, get_byte(b, i) % 32 + 1, 1);
  end loop;
  return code;
end;
$$;

-- True when the caller is allowlisted faculty and linked to the batch (R3, J4).
create function private.can_see_batch(p_batch uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.is_faculty() and exists (
    select 1 from private.batch_faculty bf
    where bf.batch_id = p_batch and bf.github_id = private.current_github_id())
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Student: join a batch with the code shown in class
-- ---------------------------------------------------------------------------------------------------------------
-- SECURITY DEFINER: reads private join codes and attempts and sets the caller's profiles.batch_id, none of which the
-- caller can access directly (X1). Failures return a result instead of raising, so the attempt is still recorded (J3).
create function public.join_batch(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  clean text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  target uuid;
  target_name text;
begin
  if uid is null then
    raise exception 'Please sign in first.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles p
                 where p.id = uid and p.consent_version = private.current_consent_version()) then
    raise exception 'Please accept the current consent first.' using errcode = '42501';
  end if;
  if (select count(*) from private.join_attempts a
      where a.user_id = uid and not a.success and a.at > now() - interval '1 hour') >= 10 then
    return jsonb_build_object('ok', false, 'message', 'Too many attempts. Please try again in an hour.');
  end if;

  select c.batch_id, b.name into target, target_name
  from private.batch_join_codes c join public.batches b on b.id = c.batch_id
  where c.code = clean and c.enabled;

  insert into private.join_attempts (user_id, success) values (uid, target is not null);
  if target is null then
    return jsonb_build_object('ok', false, 'message', 'This code is not valid. Check it with your teacher.');  -- J2
  end if;
  update public.profiles set batch_id = target where id = uid;
  return jsonb_build_object('ok', true, 'batch_name', target_name);
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Faculty functions (allowlisted faculty only; linked batches only; read-only for student data)
-- ---------------------------------------------------------------------------------------------------------------
-- SECURITY DEFINER (all below): read or write batches, links, codes and other students' rows that no API role can
-- access directly (X1). Each checks private.is_faculty() / private.can_see_batch() itself (X5).

create function public.faculty_create_batch(p_name text, p_programme text, p_year integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  gh bigint := private.current_github_id();
  clean_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  new_id uuid;
  attempt integer := 0;
begin
  if not private.is_faculty() then
    raise exception 'This is for course faculty only.' using errcode = '42501';
  end if;
  if char_length(clean_name) not between 1 and 80 or clean_name ~ '[[:cntrl:]<>]' then
    raise exception 'Batch name must be 1–80 characters, without < or >.' using errcode = '22023';
  end if;
  if p_programme is null or p_programme not in ('BCA', 'BCA-AI', 'BSC-DS', 'MSC-IT') then
    raise exception 'Please choose a programme from the list.' using errcode = '22023';
  end if;
  if p_year is null or p_year not between 2020 and 2100 then
    raise exception 'Please enter a year between 2020 and 2100.' using errcode = '22023';
  end if;
  insert into public.batches (name, programme, year, created_by) values (clean_name, p_programme, p_year, gh)
  returning id into new_id;
  insert into private.batch_faculty (batch_id, github_id) values (new_id, gh);
  loop
    begin
      insert into private.batch_join_codes (batch_id, code) values (new_id, private.new_join_code());
      exit;
    exception when unique_violation then
      attempt := attempt + 1;
      if attempt > 5 then raise; end if;
    end;
  end loop;
  return jsonb_build_object('id', new_id);
end;
$$;

create function public.faculty_batches()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_faculty() then
    raise exception 'This is for course faculty only.' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', b.id, 'name', b.name, 'programme', b.programme, 'year', b.year, 'created_at', b.created_at,
      'code', c.code, 'code_enabled', c.enabled,
      'students', (select count(*) from public.profiles p where p.batch_id = b.id),
      'faculty', (select coalesce(jsonb_agg(coalesce(p.github_username, 'GitHub id ' || bf2.github_id) order by bf2.added_at), '[]')
                  from private.batch_faculty bf2
                  left join public.profiles p on p.github_id = bf2.github_id
                  where bf2.batch_id = b.id)
    ) order by b.created_at desc)
    from public.batches b
    join private.batch_faculty bf on bf.batch_id = b.id and bf.github_id = private.current_github_id()
    left join private.batch_join_codes c on c.batch_id = b.id), '[]');
end;
$$;

create function public.faculty_set_code(p_batch uuid, p_regenerate boolean, p_enabled boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt integer := 0;
  result private.batch_join_codes;
begin
  if not private.can_see_batch(p_batch) then
    raise exception 'Batch not found.' using errcode = '42501';
  end if;
  loop
    begin
      update private.batch_join_codes
         set code = case when p_regenerate then private.new_join_code() else code end,
             enabled = coalesce(p_enabled, enabled)
       where batch_id = p_batch
      returning * into result;
      exit;
    exception when unique_violation then
      attempt := attempt + 1;
      if attempt > 5 then raise; end if;
    end;
  end loop;
  return jsonb_build_object('code', result.code, 'code_enabled', result.enabled);
end;
$$;

-- Gives another allowlisted faculty member (who has signed in once, so their username is known) access to a batch.
create function public.faculty_add_colleague(p_batch uuid, p_github_username text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target bigint;
begin
  if not private.can_see_batch(p_batch) then
    raise exception 'Batch not found.' using errcode = '42501';
  end if;
  select p.github_id into target
  from public.profiles p
  join private.faculty_allowlist f on f.github_id = p.github_id
  where lower(p.github_username) = lower(btrim(ltrim(coalesce(p_github_username, ''), '@')));
  if target is null then
    raise exception 'No course faculty member with that GitHub username has signed in yet.' using errcode = '22023';
  end if;
  insert into private.batch_faculty (batch_id, github_id) values (p_batch, target) on conflict do nothing;
  return jsonb_build_object('ok', true);
end;
$$;

-- One row per student of a linked batch: only the dashboard fields (plan §1) — no email, no Auth data, no ids.
create function public.faculty_batch_progress(p_batch uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_see_batch(p_batch) then
    raise exception 'Batch not found.' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'display_name', p.display_name,
      'github_username', p.github_username,
      'programme', p.programme,
      'joined', p.created_at,
      'xp', coalesce(g.xp, 0),
      'units', coalesce(g.doc -> 'units', '{}'),
      'missions', coalesce((select jsonb_agg(m.key order by m.key) from jsonb_each(g.doc -> 'missions') m), '[]'),
      'badges', coalesce((select jsonb_agg(x.key order by x.key) from jsonb_each(g.doc -> 'badges') x), '[]'),
      'games', coalesce((select jsonb_agg(x.key order by x.key) from jsonb_each(g.doc -> 'games') x), '[]'),
      'self_check_best', g.doc -> 'selfCheck' -> 'best',
      'updated_at', g.updated_at
    ) order by lower(p.display_name))
    from public.profiles p
    left join public.progress g on g.user_id = p.id
    where p.batch_id = p_batch), '[]');
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Existing functions extended: role and batch in the status; batch in the export; join attempts removed on deletion
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
    'batch_name', (select b.name from public.profiles p join public.batches b on b.id = p.batch_id where p.id = uid));
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
    'progress', (select jsonb_build_object('doc', g.doc, 'xp', g.xp, 'revision', g.revision,
                                           'updated_at', g.updated_at)
                 from public.progress g where g.user_id = uid),
    'not_included', 'Other students'' data and class results; Supabase security and sign-in logs (ask the college); '
      || 'your GitHub authorisation of this app (GitHub → Settings → Applications); progress on your devices that '
      || 'was never saved online.'
  );
end;
$$;

create or replace function public.delete_my_account()
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
  delete from public.profiles where id = uid;  -- cascades to the caller's progress
  delete from private.join_attempts where user_id = uid;
  insert into private.deletion_requests (user_id) values (uid) on conflict (user_id) do nothing;
  return jsonb_build_object('status', 'pending_completion',
    'requested_at', (select requested_at from private.deletion_requests where user_id = uid));
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Function privileges (X3)
-- ---------------------------------------------------------------------------------------------------------------
revoke all on function private.current_github_id() from public, anon, authenticated;
revoke all on function private.is_faculty() from public, anon, authenticated;
revoke all on function private.new_join_code() from public, anon, authenticated;
revoke all on function private.can_see_batch(uuid) from public, anon, authenticated;
revoke all on function public.join_batch(text) from public, anon, authenticated;
revoke all on function public.faculty_create_batch(text, text, integer) from public, anon, authenticated;
revoke all on function public.faculty_batches() from public, anon, authenticated;
revoke all on function public.faculty_set_code(uuid, boolean, boolean) from public, anon, authenticated;
revoke all on function public.faculty_add_colleague(uuid, text) from public, anon, authenticated;
revoke all on function public.faculty_batch_progress(uuid) from public, anon, authenticated;
revoke all on function public.account_status() from public, anon, authenticated;
revoke all on function public.export_my_data() from public, anon, authenticated;
revoke all on function public.delete_my_account() from public, anon, authenticated;
grant execute on function public.join_batch(text) to authenticated;
grant execute on function public.faculty_create_batch(text, text, integer) to authenticated;
grant execute on function public.faculty_batches() to authenticated;
grant execute on function public.faculty_set_code(uuid, boolean, boolean) to authenticated;
grant execute on function public.faculty_add_colleague(uuid, text) to authenticated;
grant execute on function public.faculty_batch_progress(uuid) to authenticated;
grant execute on function public.account_status() to authenticated;
grant execute on function public.export_my_data() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
