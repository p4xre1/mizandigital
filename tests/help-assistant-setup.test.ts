import { readFileSync } from "node:fs"
import { PGlite } from "@electric-sql/pglite"
import { afterAll, beforeAll, expect, test } from "vitest"

const sql = readFileSync(new URL("../deploy/help-assistant-setup.sql", import.meta.url), "utf8")
const db = new PGlite()

beforeAll(async () => {
  // Minimal Supabase fixtures, not production definitions of auth or is_admin.
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
    CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
  `)
}, 30_000)

afterAll(async () => { await db.close() })

test("manual setup installs protected configuration, grants server reads, and preserves data on rerun", async () => {
  await db.exec(sql)
  expect((await db.query("SELECT id, enabled FROM public.help_settings")).rows)
    .toEqual([{ id: 1, enabled: true }])
  expect((await db.query(`SELECT policyname FROM pg_policies
    WHERE tablename='help_settings' AND policyname='help_settings_public_read'`)).rows).toEqual([])
  expect((await db.query(`SELECT relrowsecurity FROM pg_class
    WHERE oid='public.help_settings'::regclass`)).rows).toEqual([{ relrowsecurity: true }])
  await db.exec("SET ROLE service_role")
  expect((await db.query("SELECT id FROM public.help_settings")).rows).toEqual([{ id: 1 }])
  expect((await db.query("SELECT id FROM public.help_qa")).rows).toEqual([])
  await db.exec("RESET ROLE")

  // Even when table grants exist, a non-admin must not see protected settings.
  await db.exec("GRANT SELECT ON public.help_settings TO authenticated; SET ROLE authenticated")
  expect((await db.query("SELECT id FROM public.help_settings")).rows).toEqual([])
  await db.exec("RESET ROLE")

  await db.exec(`UPDATE public.help_settings SET enabled=false;
    INSERT INTO public.help_qa(question, answer) VALUES ('Existing question', 'Existing answer');`)
  await db.exec(sql)
  expect((await db.query("SELECT id, enabled FROM public.help_settings")).rows)
    .toEqual([{ id: 1, enabled: false }])
  expect((await db.query("SELECT question FROM public.help_qa")).rows)
    .toEqual([{ question: "Existing question" }])
}, 30_000)

test("bundle includes both source migrations unchanged and inside one transaction", () => {
  for (const file of ["20261008000000_help_assistant_cms.sql", "20261009000000_help_assistant_hardening.sql"]) {
    const migration = readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8")
    expect(sql).toContain(migration)
  }
  expect(sql.indexOf("BEGIN;")).toBeLessThan(sql.indexOf("CREATE TABLE"))
  expect(sql.indexOf("COMMIT;")).toBeGreaterThan(sql.indexOf("CREATE TRIGGER help_settings_protect"))
})
