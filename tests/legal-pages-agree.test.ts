/**
 * الصفحات القانونية يجب أن تتفق مع الكود — ومع الـ HTML المنشور.
 *
 * وُلدت هذه الاختبارات من انحرافين حقيقيين:
 *   1) سياسة الخصوصية كانت تعد بحذف profiles و quiz_attempts بينما endpoint
 *      الحذف لم يكن يحذفهما، وسياسة الكوكيز كانت توثّق مفتاح
 *      mizan_quiz_progress غير الموجود أصلاً وتكرر صف sb-* بمدتين متضاربتين.
 *   2) scripts/prerender.mjs كان يحمل نسخة يدوية مختصرة، فكان /privacy
 *      المنشور يعرض 3 جمل عامة بينما التطبيق يعرض السياسة الكاملة.
 *
 * العلاج البنيوي: مصدر واحد (src/content/legal/policies.js) يستهلكه الطرفان.
 * هذه الاختبارات تمنع عودة أي من الانحرافين.
 */
import { describe, test, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

import { policyToHtml, inlineToHtml, tokenizeInline } from "../src/content/legal/markup.js";
import {
  PRIVACY_POLICY,
  COOKIE_POLICY,
  TERMS_POLICY,
  LEGAL_POLICIES,
  COOKIE_TABLE,
  DELETED_TABLES,
  RETAINED_TABLES,
  PUBLIC_PROFILE_FIELDS,
  PRIVATE_PROFILE_FIELDS,
  AUTH_STORAGE_KEY,
} from "../src/content/legal/policies.js";

const POLICIES_SRC = read("src/content/legal/policies.js");
const PRIVACY_HTML = policyToHtml(PRIVACY_POLICY) as string;
const COOKIES_HTML = policyToHtml(COOKIE_POLICY) as string;
const TERMS_HTML = policyToHtml(TERMS_POLICY) as string;

const PRIVACY_PAGE = read("src/pages/public/PrivacyPolicyPage.tsx");
const COOKIES_PAGE = read("src/pages/public/CookiePolicyPage.tsx");
const TERMS_PAGE = read("src/pages/public/TermsPage.tsx");
const PRERENDER = read("scripts/prerender.mjs");
const DELETE_FN = read("functions/api/account/delete.js");

/* ------------------------------------------------------------------ */

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(join(ROOT, dir))) {
    const full = join(dir, entry);
    const st = statSync(join(ROOT, full));
    if (st.isDirectory()) collectSourceFiles(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

/** مفاتيح التخزين المحلي المستعملة فعلاً في src. */
function realStorageKeys(): Set<string> {
  const keys = new Set<string>();
  for (const rel of collectSourceFiles("src")) {
    const src = read(rel);
    for (const m of src.matchAll(
      /(?:localStorage|sessionStorage)\s*\.\s*(?:getItem|setItem|removeItem)\s*\(\s*["'`]([^"'`]+)["'`]/g
    )) keys.add(m[1]);
    for (const m of src.matchAll(
      /(?:^|\n)\s*(?:export\s+)?const\s+[A-Z0-9_]*KEY[A-Z0-9_]*\s*=\s*["'`]([^"'`]+)["'`]/g
    )) keys.add(m[1]);
  }
  return keys;
}

const TRANSIENT_PREFIXES = ["mizan:ratelimit:", "mizan:toast"];
const NOT_STORAGE = new Set(["mizan_pro_monthly", "mizan_profiles", "mizan_profiles_username_lower_idx"]);

function documentedStorageKeys(): Set<string> {
  const out = new Set<string>();
  for (const key of realStorageKeys()) {
    if (NOT_STORAGE.has(key)) continue;
    if (TRANSIENT_PREFIXES.some((p) => key.startsWith(p))) continue;
    out.add(key);
  }
  return out;
}

/* ------------------------------------------------------------------ */

describe("one source of truth for the legal pages", () => {
  test("all three pages render from the shared content module", () => {
    for (const [name, page] of [
      ["privacy", PRIVACY_PAGE],
      ["cookies", COOKIES_PAGE],
      ["terms", TERMS_PAGE],
    ] as const) {
      expect(page, `${name} does not import the shared policies module`)
        .toContain("@/content/legal/policies.js");
      expect(page, `${name} does not use LegalBlocks`).toContain("LegalBlocks");
    }
  });

  test("prerender builds the legal pages from the same module", () => {
    expect(PRERENDER).toContain('from "../src/content/legal/policies.js"');
    expect(PRERENDER).toContain('from "../src/content/legal/markup.js"');
    for (const policy of ["PRIVACY_POLICY", "COOKIE_POLICY", "TERMS_POLICY"]) {
      expect(PRERENDER, `prerender does not render ${policy}`).toContain(`policyToHtml(${policy})`);
    }
  });

  test("prerender carries no hand-written legal stub", () => {
    expect(PRERENDER).not.toContain("نحترم خصوصية زوار المنصة");
    expect(PRERENDER).not.toContain("قد تستخدم المنصة ملفات ارتباط وتقنيات مشابهة");
    expect(PRERENDER).not.toContain("لأغراض قانونية وتعليمية وعدم إساءة استخدام الخدمات");
  });

  test("the shared module is the only place the prose lives", () => {
    // لو عاد النص ليُنسخ داخل الصفحات فسنملك مصدرين من جديد.
    for (const page of [PRIVACY_PAGE, COOKIES_PAGE, TERMS_PAGE]) {
      expect(page).not.toContain("نحترم خصوصية");
      expect(page).not.toContain("profile_rank_board");
    }
    expect(POLICIES_SRC).toContain("profile_rank_board");
  });
});

describe("no stale storage keys", () => {
  test("mizan_quiz_progress exists in neither code nor docs", () => {
    const usedDirectly = collectSourceFiles("src").some((f) =>
      /(?:localStorage|sessionStorage)\s*\.\s*\w+\s*\(\s*["'`]mizan_quiz_progress["'`]/.test(read(f))
    );
    expect(usedDirectly, "mizan_quiz_progress reappeared in code").toBe(false);
    expect(POLICIES_SRC).not.toContain("mizan_quiz_progress");
  });

  test("admin pages echo the real key names", () => {
    for (const p of [
      "src/pages/admin/HomeManagementPage.tsx",
      "src/pages/admin/PagesManagementPage.tsx",
      "src/pages/admin/SiteControlPage.tsx",
    ]) {
      expect(read(p), `${p} still lists mizan_quiz_progress`).not.toContain("mizan_quiz_progress");
      expect(read(p), `${p} still uses the sb-* wildcard`).not.toContain("sb-*");
    }
  });

  test("the wildcard sb-* is replaced by the real storageKey", () => {
    const client = read("src/lib/supabase/client.ts");
    const key = client.match(/storageKey:\s*['"]([^'"]+)['"]/)?.[1];
    expect(key, "client.ts no longer pins a storageKey").toBeTruthy();
    expect(AUTH_STORAGE_KEY).toBe(key);
    expect(COOKIE_TABLE.some((row) => row.name.includes(AUTH_STORAGE_KEY))).toBe(true);
    expect(COOKIE_TABLE.some((row) => row.name.startsWith("sb-*"))).toBe(false);
  });

  test("every real storage key is disclosed in the cookie table", () => {
    const tableText = COOKIE_TABLE.map((r) => r.name).join(" , ");
    const missing: string[] = [];
    for (const key of documentedStorageKeys()) {
      const covered =
        tableText.includes(key) ||
        tableText.includes(key.replace(/:v\d+$/, "")) ||
        tableText.includes(key.split(":").slice(0, -1).join(":"));
      if (!covered) missing.push(key);
    }
    expect(missing, `undisclosed storage keys: ${missing.join(", ")}`).toEqual([]);
  });

  test("no duplicate cookie row with a conflicting duration", () => {
    const seen = new Map<string, string>();
    for (const row of COOKIE_TABLE) {
      if (seen.has(row.name)) {
        expect(seen.get(row.name), `duplicate row for ${row.name} with a different duration`).toBe(row.duration);
      }
      seen.set(row.name, row.duration);
    }
  });
});

describe("the public profile is actually disclosed", () => {
  test("privacy states the profile is public by default and names what is exposed", () => {
    expect(PRIVACY_HTML).toContain("is_public = true");
    expect(PRIVACY_HTML).toContain("profile_rank_board");
    for (const field of PUBLIC_PROFILE_FIELDS) expect(PRIVACY_HTML).toContain(field);
    expect(PRIVACY_HTML).toContain("لا يُنشر أبداً");
    for (const field of PRIVATE_PROFILE_FIELDS) expect(PRIVACY_HTML).toContain(field);
  });

  test("privacy discloses that the username can derive from the email", () => {
    const sql = read("supabase/migrations/20260924000000_supabase_auth_profiles_and_ranks.sql");
    expect(sql).toContain("split_part(v_email, '@', 1)");
    expect(PRIVACY_HTML).toContain("يُولَّد تلقائياً");
    expect(TERMS_HTML).toContain("يُولَّد تلقائياً");
  });

  test("privacy and terms both offer the opt-out controls that exist in /profile", () => {
    const profilePage = read("src/pages/public/MyProfilePage.tsx");
    expect(profilePage).toContain("setIsPublic");
    expect(profilePage).toContain("setShowRank");

    for (const html of [PRIVACY_HTML, TERMS_HTML]) {
      expect(html).toContain("is_public");
      expect(html).toContain("show_rank");
    }
  });

  test("terms no longer claims a unique username is required at signup", () => {
    expect(TERMS_HTML).not.toContain("يجب تقديم بريد صحيح واسم مستعار فريد");
    expect(TERMS_HTML).toContain("يجب تقديم بريد صحيح");
  });
});

describe("the deletion promise matches the deletion code", () => {
  function deletedTables(): Set<string> {
    const tables = new Set<string>();
    for (const m of DELETE_FN.matchAll(/\[\s*"([a-z_]+)"\s*,\s*"[a-z_]+"\s*\]/g)) tables.add(m[1]);
    const attempts = DELETE_FN.match(/ATTEMPTS_TABLE\s*=\s*"([a-z_]+)"/);
    if (attempts) tables.add(attempts[1]);
    return tables;
  }

  test("DELETED_TABLES is exactly what the endpoint deletes", () => {
    const actual = deletedTables();
    expect([...DELETED_TABLES].sort()).toEqual([...actual].sort());
  });

  test("all three pages promise the same deletion list", () => {
    for (const [name, html] of [["privacy", PRIVACY_HTML], ["cookies", COOKIES_HTML], ["terms", TERMS_HTML]] as const) {
      for (const table of DELETED_TABLES) {
        expect(html, `${name} deletion list omits ${table}`).toContain(table);
      }
    }
  });

  test("no page claims the auth.users account itself is deleted automatically", () => {
    expect(DELETE_FN).not.toContain("/auth/v1/admin/users");
    expect(DELETE_FN).toContain("authUserRemoved: false");
    for (const html of [PRIVACY_HTML, COOKIES_HTML, TERMS_HTML]) {
      expect(html).toContain("auth.users");
      expect(html).toContain("يدوياً");
    }
  });

  test("retained legal tables are named consistently everywhere", () => {
    for (const html of [PRIVACY_HTML, COOKIES_HTML, TERMS_HTML]) {
      for (const t of RETAINED_TABLES) expect(html).toContain(t);
    }
  });
});

describe("security section reflects the current migrations", () => {
  test("privacy cites the rank trigger and RLS policy it relies on", () => {
    const sql = read("supabase/migrations/20260924000000_supabase_auth_profiles_and_ranks.sql");
    for (const term of ["apply_profile_rank", "mizan_profiles_owner_read"]) {
      expect(sql, `migration no longer defines ${term}`).toContain(term);
      expect(PRIVACY_HTML, `privacy no longer cites ${term}`).toContain(term);
    }
    expect(PRIVACY_HTML).toContain("20260924000000");
    expect(PRIVACY_HTML).toContain("20260920000000_protect_progression_and_quiz_answers");
  });

  test("all pages carry the same last-updated date", () => {
    const dates = LEGAL_POLICIES.map((p) => p.updatedNote.match(/آخر تحديث: ([^—(]+)/)?.[1]?.trim());
    expect(new Set(dates).size, `dates disagree: ${dates.join(" | ")}`).toBe(1);
    expect(dates[0]).toBeTruthy();
  });
});

describe("the inline markup renderer is safe", () => {
  test("it escapes HTML instead of passing it through", () => {
    expect(inlineToHtml('<img src=x onerror=alert(1)>')).not.toContain("<img");
    expect(inlineToHtml("a & b < c")).toBe("a &amp; b &lt; c");
  });

  test("it parses bold, code and links", () => {
    const kinds = tokenizeInline("**ع** `c` [n](/x)").map((t: { type: string }) => t.type);
    expect(kinds).toEqual(["strong", "text", "code", "text", "link"]);
    expect(inlineToHtml("[n](/x)")).toBe('<a href="/x">n</a>');
    expect(inlineToHtml("[n](mailto:a@b.c)")).toContain('dir="ltr"');
    expect(inlineToHtml("`k`")).toBe('<code dir="ltr">k</code>');
  });

  test("every policy renders without throwing and produces real content", () => {
    for (const policy of LEGAL_POLICIES) {
      const html = policyToHtml(policy) as string;
      expect(html, `${policy.path} rendered empty`).toContain("<h1>");
      expect(html.length, `${policy.path} looks like a stub`).toBeGreaterThan(3000);
      expect(html).toContain(`lang="ar-MA"`);
    }
  });
});

describe("the built output carries the real policy", () => {
  const distPrivacy = join(ROOT, "dist/privacy.html");
  const skip = !existsSync(distPrivacy);

  test.skipIf(skip)("dist/privacy.html contains the disclosures, not the stub", () => {
    const html = read("dist/privacy.html");
    expect(html).not.toContain("نحترم خصوصية زوار المنصة");
    for (const needle of ["بروفايلك عام افتراضياً", AUTH_STORAGE_KEY, "profile_rank_board", "is_public", "show_rank"]) {
      expect(html, `dist/privacy.html omits ${needle}`).toContain(needle);
    }
  });
});
