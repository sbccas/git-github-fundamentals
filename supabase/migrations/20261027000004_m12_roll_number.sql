-- Milestone 12 addition (owner decision M12-D9, 27 Oct 2026): roll number / SID on the student profile, required to
-- join a batch, shown to the batch's faculty and in the CSV. Students set and correct it themselves; faculty cannot
-- change it. Included in "Download my data" through the profile.

alter table public.profiles add column roll_no text
  check (roll_no is null or (char_length(roll_no) between 1 and 20 and roll_no ~ '^[A-Za-z0-9/-]+$'));

grant update (roll_no) on public.profiles to authenticated;

-- join_batch now asks for the roll number first (otherwise unchanged; J2, J3 as in migration 3).
-- SECURITY DEFINER: reads private join codes and attempts and sets the caller's profiles.batch_id (X1).
create or replace function public.join_batch(p_code text)
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
  if (select p.roll_no from public.profiles p where p.id = uid) is null then
    return jsonb_build_object('ok', false, 'message', 'Please add your roll number / SID to your profile first.', 'needs_roll_no', true);
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

-- Dashboard rows now include the roll number (plan §1 fields; still no email or account ids).
-- SECURITY DEFINER: reads other students' rows for a batch the caller is linked to (X1, R3).
create or replace function public.faculty_batch_progress(p_batch uuid)
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
      'roll_no', p.roll_no,
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

revoke all on function public.join_batch(text) from public, anon, authenticated;
revoke all on function public.faculty_batch_progress(uuid) from public, anon, authenticated;
grant execute on function public.join_batch(text) to authenticated;
grant execute on function public.faculty_batch_progress(uuid) to authenticated;
