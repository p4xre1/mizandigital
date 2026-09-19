import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';

// Execute the actual migration and policies in PostgreSQL, not mocked JS checks.
const db = new PGlite();
const admin = '00000000-0000-0000-0000-000000000001';
const free = '00000000-0000-0000-0000-000000000002';
const pro = '00000000-0000-0000-0000-000000000003';
const expired = '00000000-0000-0000-0000-000000000004';
const suspended = '00000000-0000-0000-0000-000000000005';
const canceled = '00000000-0000-0000-0000-000000000006';
async function asUser(id?: string) {
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id || '']);
  await db.exec(`SET ROLE ${id ? 'authenticated' : 'anon'}`);
}
async function rows(sql: string) { return (await db.query(sql)).rows; }
beforeAll(async () => {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon,authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;
    CREATE TABLE public.profiles(id uuid PRIMARY KEY, account_status text DEFAULT 'active', admin boolean DEFAULT false);
    CREATE TABLE public.mizan_profiles(owner_id uuid PRIMARY KEY, is_pro boolean DEFAULT false, subscription_status text, subscription_ends_at timestamptz, subscription_current_period_end timestamptz);
    CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$ SELECT coalesce((SELECT admin FROM profiles WHERE id=auth.uid()),false) $$;
  `);
  for (const id of [admin,free,pro,expired,suspended,canceled]) {
    await db.query('INSERT INTO auth.users VALUES ($1)', [id]);
    await db.query('INSERT INTO profiles(id,account_status,admin) VALUES ($1,$2,$3)', [id, id === suspended ? 'suspended' : 'active', id === admin]);
    await db.query("INSERT INTO mizan_profiles VALUES ($1,$2,$3,now() + $4::interval,NULL)", [id, id !== free, id === canceled ? 'canceled' : 'active', id === expired ? '-1 day' : '1 day']);
  }
  const migration = readFileSync('supabase/migrations/20260928000000_pro_legal_tools.sql', 'utf8');
  await db.exec(migration);
  // The migration must be idempotent: re-applying it (e.g. after a partial
  // earlier run) must succeed without losing the seeded catalog rows.
  await db.exec(migration);
  expect((await db.query("SELECT count(*)::int AS n FROM pro_tools")).rows).toEqual([{ n: 6 }]);
  await asUser(admin);
  await db.exec("UPDATE pro_tools SET enabled=true WHERE slug='cases'");
  await db.exec(`INSERT INTO pro_tool_entries(tool_slug,title,topic,source_url,source_reference,reviewed_by,reviewed_on,published,payload) VALUES
    ('cases','Published case','test','https://example.org','reference','reviewer',current_date,true,'{"scenario":"case","checklist":"check","model_answer":"answer"}'),
    ('cases','Draft case','test','','','',NULL,false,'{}')`);
}, 30000);
afterAll(async () => { await db.close(); });
describe.sequential('Pro tools database authorization', () => {
  it('exposes only the catalog to guests', async () => {
    await asUser(); expect(await rows('SELECT * FROM pro_tools')).toHaveLength(6);
    await expect(rows('SELECT * FROM pro_tool_entries')).rejects.toThrow(/permission denied/);
    await expect(rows('SELECT has_pro_tools_access()')).rejects.toThrow(/permission denied/);
  });
  it('denies free, expired, suspended and canceled memberships', async () => {
    for (const id of [free, expired, suspended, canceled]) {
      await asUser(id);
      expect(await rows('SELECT has_pro_tools_access() AS allowed')).toEqual([{ allowed: false }]);
      expect(await rows('SELECT * FROM pro_tool_entries')).toHaveLength(0);
      await expect(db.exec("INSERT INTO pro_tool_notes(tool_slug,title) VALUES ('workspace','denied')")).rejects.toThrow(/row-level security/);
    }
  });
  it('shows Pro only published content and prevents CMS changes', async () => {
    await asUser(pro);
    expect(await rows('SELECT has_pro_tools_access() AS allowed')).toEqual([{ allowed: true }]);
    expect(await rows('SELECT title FROM pro_tool_entries')).toEqual([{ title: 'Published case' }]);
    expect(await rows("UPDATE pro_tools SET enabled=false WHERE slug='cases' RETURNING slug")).toHaveLength(0);
    await expect(db.exec("INSERT INTO pro_tool_entries(tool_slug,title,topic) VALUES ('cases','unauthorized','test')")).rejects.toThrow(/row-level security/);
  });
  it('blocks disabled tools at the database layer', async () => {
    await asUser(admin); await db.exec("UPDATE pro_tools SET enabled=false WHERE slug='cases'");
    await asUser(pro); expect(await rows('SELECT * FROM pro_tool_entries')).toHaveLength(0);
    await expect(db.exec("INSERT INTO pro_tool_notes(tool_slug,title) VALUES ('cases','disabled')")).rejects.toThrow(/row-level security/);
    await asUser(admin); await db.exec("UPDATE pro_tools SET enabled=true WHERE slug='cases'");
  });
  it('keeps private notes isolated, including from CMS admins', async () => {
    await asUser(pro); await db.exec("INSERT INTO pro_tool_notes(tool_slug,title,body) VALUES ('workspace','Private','Secret')");
    expect(await rows('SELECT * FROM pro_tool_notes')).toHaveLength(1);
    await expect(db.query("INSERT INTO pro_tool_notes(owner_id,tool_slug,title) VALUES ($1,'workspace','spoof')", [free])).rejects.toThrow(/row-level security/);
    await asUser(admin); expect(await rows('SELECT * FROM pro_tool_notes')).toHaveLength(0);
    expect(await rows("UPDATE pro_tool_notes SET body='stolen' RETURNING id")).toHaveLength(0);
    await asUser(free); expect(await rows('SELECT * FROM pro_tool_notes')).toHaveLength(0);
  });
  it('isolates follows and enforces Pro access', async () => {
    await asUser(admin); await db.exec("UPDATE pro_tools SET enabled=true WHERE slug='alerts'");
    await asUser(pro); await db.exec("INSERT INTO pro_tool_follows(topic) VALUES ('test')");
    expect(await rows('SELECT topic FROM pro_tool_follows')).toEqual([{ topic: 'test' }]);
    await asUser(free); expect(await rows('SELECT * FROM pro_tool_follows')).toHaveLength(0);
    await expect(db.exec("INSERT INTO pro_tool_follows(topic) VALUES ('test')")).rejects.toThrow(/row-level security/);
  });
  it('requires valid reviewed content before publishing, even for admins', async () => {
    await asUser(admin);
    expect(await rows('SELECT * FROM pro_tool_entries')).toHaveLength(2);
    await expect(db.exec("UPDATE pro_tool_entries SET published=true WHERE title='Draft case'")).rejects.toThrow();
    await expect(db.exec(`INSERT INTO pro_tool_entries(tool_slug,title,topic,payload) VALUES ('cases','Bad payload','test','{"scenario":123}')`)).rejects.toThrow(/must be strings/);
    expect((await rows('SELECT * FROM pro_tools_audit')).length).toBeGreaterThan(0);
    await asUser(pro); expect(await rows('SELECT * FROM pro_tools_audit')).toHaveLength(0);
  });
  it('allows deletion but no reading of private notes after expiry', async () => {
    await db.exec('RESET ROLE'); await db.query("UPDATE mizan_profiles SET subscription_ends_at=now()-interval '1 hour' WHERE owner_id=$1", [pro]);
    await asUser(pro); expect(await rows('SELECT * FROM pro_tool_notes')).toHaveLength(0);
    // PostgreSQL SELECT RLS also affects row visibility for filtered DELETE.
    // A direct unfiltered DELETE is still owner-constrained by the DELETE policy.
    await db.exec('DELETE FROM pro_tool_notes');
    await db.exec('RESET ROLE'); expect(await rows('SELECT * FROM pro_tool_notes')).toHaveLength(0);
  });
});
