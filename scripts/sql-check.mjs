/**
 * Local database check (`npm run sql-check`). The live Supabase project must never run the test scripts (M12-D8),
 * so database changes are checked here first: a throwaway PostgreSQL (PGlite, in memory) with a small stand-in for
 * Supabase's auth schema, roles and default grants. It applies every file in supabase/migrations/ in order, the test
 * seeds, and both SQL suites (twice, to prove re-runs are safe), and prints any failing test.
 *
 * It catches SQL errors and logic mistakes early; it is not a copy of Supabase. After a check passes, a new migration
 * is applied to the live project by the owner in the SQL Editor — and only the migration, never the tests or seeds.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SUPA = path.join(ROOT, 'supabase');
const read = (...p) => fs.readFileSync(path.join(SUPA, ...p), 'utf8');

const STAND_IN = `
create role anon nologin;
create role authenticated nologin;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
create schema auth;
grant usage on schema auth to anon, authenticated;
create table auth.users (
  id uuid primary key, instance_id uuid, aud text, role text, email text,
  raw_app_meta_data jsonb, raw_user_meta_data jsonb,
  created_at timestamptz, updated_at timestamptz, last_sign_in_at timestamptz);
create table auth.identities (
  id uuid primary key default gen_random_uuid(), provider_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  identity_data jsonb not null, provider text not null,
  last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz,
  unique (provider_id, provider));
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
grant execute on function auth.uid() to anon, authenticated;
`;

const db = new PGlite();
let failed = false;

async function step(label, sql) {
  try {
    const res = await db.exec(sql);
    console.log(`  ✓ ${label}`);
    return res;
  } catch (e) {
    console.log(`  ✗ ${label}: ${e.message}`);
    process.exit(1);
  }
}

console.log('\nLocal database check (PGlite stand-in for Supabase)');
await step('Supabase stand-in (auth schema, roles, default grants)', STAND_IN);
for (const f of fs.readdirSync(path.join(SUPA, 'migrations')).filter((n) => n.endsWith('.sql')).sort()) {
  await step(`migration ${f}`, read('migrations', f));
}
for (const f of ['seed_gg_test.sql', 'seed_gg_test_m12.sql', 'seed_gg_test_draft3.sql']) await step(`seed ${f}`, read('tests', f));

for (const run of [1, 2]) {
  for (const f of ['m10_m11_security_test.sql', 'm12_dashboard_test.sql']) {
    const res = await step(`${f} (run ${run})`, read('tests', f));
    const rows = res.at(-1).rows;
    const bad = rows.filter((r) => r.result !== 'PASS');
    console.log(`      ${rows.length - bad.length} / ${rows.length} PASS`);
    for (const r of bad) { failed = true; console.log(`      FAIL ${r.test}: ${r.detail}`); }
  }
}
console.log(failed ? '\nDatabase check FAILED' : '\nDatabase check passed');
process.exit(failed ? 1 : 0);
