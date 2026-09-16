import { describe, test, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
// عزل الشبكة: خدمة البروفايلات تستورد عميل Supabase ديناميكياً، فنُرجع
// "لا صفوف" حتى تبقى الاختبارات حتمية وبلا اتصال.
vi.mock("@/lib/supabase/client", () => {
  const query = {
    select: () => query,
    eq: () => query,
    ilike: () => query,
    maybeSingle: async () => ({ data: null, error: null }),
    single: async () => ({ data: null, error: null }),
    upsert: () => query,
    insert: () => query,
    update: () => query,
  };
  return {
    supabase: {
      from: () => query,
      rpc: async () => ({ data: [], error: null }),
      auth: {
        getUser: async () => ({ data: { user: null } }),
        getSession: async () => ({ data: { session: null } }),
      },
    },
  };
});

import {
  RANKS,
  getRankForXp,
  getRankProgress,
  getRankCapabilities,
  getRankLevel,
  hasRankAtLeast,
  higherRank,
} from "../src/lib/quiz/ranks";

/**
 * نظام الرتب: TS ↔ SQL parity
 * -----------------------------------------------------------------------
 * الرتبة تُطبّق على البروفايل في مكانين يجب ألا يختلفا أبداً:
 *   • src/lib/quiz/ranks.ts        (الواجهة: الشارة، شريط XP، الصلاحيات)
 *   • public.rank_capabilities     (القاعدة: المشغّل apply_profile_rank)
 * أي انحراف يعني أن المستخدم يرى رتبة والقاعدة تخزّن أخرى.
 */

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260924000000_supabase_auth_profiles_and_ranks.sql"
);

describe("rank ladder (TS)", () => {
  test("covers all 7 ranks D → SSS with contiguous thresholds", () => {
    expect(RANKS.map((rank) => rank.id)).toEqual(["D", "C", "B", "A", "S", "SS", "SSS"]);
    expect(RANKS.map((rank) => rank.level)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(RANKS[0].minXp).toBe(0);
    expect(RANKS[RANKS.length - 1].maxXp).toBeNull();

    for (let index = 0; index < RANKS.length - 1; index += 1) {
      expect(RANKS[index].maxXp).toBe(RANKS[index + 1].minXp);
      expect(RANKS[index].minXp).toBeLessThan(RANKS[index].maxXp as number);
    }
  });

  test("every rank declares capabilities and perks", () => {
    for (const rank of RANKS) {
      expect(typeof rank.capabilities.canComment).toBe("boolean");
      expect(typeof rank.capabilities.canPublishArticle).toBe("boolean");
      expect(rank.capabilities.maxDailyComments).toBeGreaterThan(0);
      expect(rank.capabilities.maxDailyReports).toBeGreaterThan(0);
      expect(rank.perks.length).toBeGreaterThan(0);
      expect(rank.label.trim().length).toBeGreaterThan(0);
      expect(rank.description.trim().length).toBeGreaterThan(0);
    }
  });

  test("capabilities never decrease as the rank grows", () => {
    const keys: Array<keyof (typeof RANKS)[number]["capabilities"]> = [
      "canSuggestContent",
      "canHelpPeers",
      "canPublishArticle",
      "recommendationCert",
      "advisorPanel",
      "hallOfFame",
      "maxDailyReports",
      "maxDailyComments",
    ];
    for (let index = 1; index < RANKS.length; index += 1) {
      for (const key of keys) {
        const previous = RANKS[index - 1].capabilities[key];
        const current = RANKS[index].capabilities[key];
        if (typeof previous === "number" && typeof current === "number") {
          expect(current).toBeGreaterThanOrEqual(previous);
        } else {
          // boolean: لا يجوز أن تفقد رتبة أعلى صلاحية تملكها رتبة أدنى
          expect(Number(current)).toBeGreaterThanOrEqual(Number(previous));
        }
      }
    }
  });

  test("getRankForXp / getRankProgress match the thresholds", () => {
    expect(getRankForXp(-10).id).toBe("D");
    expect(getRankForXp(0).id).toBe("D");
    expect(getRankForXp(119).id).toBe("D");
    expect(getRankForXp(120).id).toBe("C");
    expect(getRankForXp(649).id).toBe("B");
    expect(getRankForXp(1200).id).toBe("S");
    expect(getRankForXp(4000).id).toBe("SSS");
    expect(getRankForXp(99_999).id).toBe("SSS");

    const midProgress = getRankProgress(700);
    expect(midProgress.rank.id).toBe("A");
    expect(midProgress.next?.id).toBe("S");
    expect(midProgress.xpToNext).toBe(500);
    expect(midProgress.percent).toBeGreaterThan(0);
    expect(midProgress.percent).toBeLessThan(100);

    const topProgress = getRankProgress(5000);
    expect(topProgress.next).toBeNull();
    expect(topProgress.percent).toBe(100);
  });

  test("rank level helpers", () => {
    expect(getRankLevel("SSS")).toBe(7);
    expect(getRankLevel("D")).toBe(1);
    expect(getRankLevel(null)).toBe(1);
    expect(hasRankAtLeast("A", "B")).toBe(true);
    expect(hasRankAtLeast("C", "A")).toBe(false);
    expect(hasRankAtLeast("S", "S")).toBe(true);
    expect(higherRank("C", "SS")).toBe("SS");
    expect(higherRank(null, "B")).toBe("B");
    expect(getRankCapabilities("SSS").hallOfFame).toBe(true);
    expect(getRankCapabilities("D").canPublishArticle).toBe(false);
  });
});

describe("rank ladder (SQL parity)", () => {
  const sql = readFileSync(MIGRATION, "utf8");

  test("the migration seeds the same 7 ranks with the same thresholds", () => {
    for (const rank of RANKS) {
      // صف البذرة: ('D', 1, 'مبتدئ', ..., 0, 120, 'D',
      const row = new RegExp(`'${rank.id}',\\s*${rank.level},`);
      expect(row.test(sql), `rank row missing for ${rank.id}`).toBe(true);
      expect(sql).toContain(rank.label);
      const threshold = new RegExp(`${rank.minXp},\\s*${rank.maxXp === null ? "NULL" : rank.maxXp},\\s*'${rank.glyph}'`);
      expect(threshold.test(sql), `thresholds missing for ${rank.id}`).toBe(true);
    }
  });

  test("the SQL rank derivation mirrors getRankForXp", () => {
    expect(sql).toContain("public.mizan_rank_for_xp");
    expect(sql).toContain("ORDER BY rc.min_xp DESC");
    // المشغّل يطبّق الرتبة على كل كتابة
    expect(sql).toContain("BEFORE INSERT OR UPDATE ON public.mizan_profiles");
    expect(sql).toContain("NEW.rank := v_rank");
  });

  test("sign-up provisions a profile automatically", () => {
    expect(sql).toContain("CREATE TRIGGER \"on_auth_user_created\"");
    expect(sql).toContain("AFTER INSERT ON auth.users");
    expect(sql).toContain("INSERT INTO public.mizan_profiles");
    expect(sql).toContain("public.generate_profile_username");
  });

  test("the auth trigger stays executable after PUBLIC is revoked", () => {
    // المشغّل يعمل بصلاحية supabase_auth_admin، لا service_role: سحب PUBLIC
    // دون منح صريح له يعني فشل كل تسجيل جديد بـ permission denied.
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.handle_new_user() TO %I");
    expect(sql).toContain("supabase_auth_admin");
    expect(sql).toContain("rolname = 'supabase_auth_admin'");
    // منحان منفصلان: GRANT واحدة لا تغطي قائمتي دوال.
    const grants = sql.match(/GRANT EXECUTE ON FUNCTION public\.\w+\([^)]*\) TO %I/g) ?? [];
    expect(grants.length).toBeGreaterThanOrEqual(2);
  });

  test("onboarding no longer depends on a Clerk identity", () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS user_id uuid");
    expect(sql).toContain("ALTER COLUMN clerk_user_id DROP NOT NULL");
  });
});

describe("profile service mapping", () => {
  test("a cloud row maps to the profile shape with a valid rank", async () => {
    const { mapRowToProfile } = await import("../src/lib/profiles/service");
    const profile = mapRowToProfile({
      id: "p1",
      owner_id: "u1",
      username: "amina_law",
      display_name: "أمينة",
      role: "lawyer",
      semester: null,
      years_of_experience: 4,
      interests: [],
      city: "الرباط",
      bio: null,
      avatar_url: null,
      theme_color: "#2563eb",
      show_xp: true,
      show_badges: true,
      show_attempts: false,
      show_rank: true,
      xp: 1300,
      credits: 12,
      // حتى لو أرسلت القاعدة قيمة غريبة، نوفّقها مع سلم الرتب
      rank: "weird",
      highest_rank: "S",
      badges: ["first_quiz"],
      streak_days: 3,
      placement_completed: true,
      is_public: true,
      updated_at: "2026-09-24T10:00:00.000Z",
    });

    expect(profile.username).toBe("amina_law");
    expect(profile.rank).toBe("D"); // قيمة غير معروفة → رتبة افتراضية آمنة
    expect(profile.highestRank).toBe("S");
    expect(profile.xp).toBe(1300);
    expect(profile.showAttempts).toBe(false);
    expect(profile.themeColor).toBe("#2563eb");
  });

  test("username suggestions are always valid and unique", async () => {
    const { generateUsernameSuggestions } = await import("../src/lib/profiles/service");
    const suggestions = generateUsernameSuggestions("Amine Ben Ali!", 4);
    expect(suggestions).toHaveLength(4);
    for (const suggestion of suggestions) {
      expect(suggestion).toMatch(/^[a-z0-9_]{3,30}$/);
    }
    expect(new Set(suggestions).size).toBe(suggestions.length);
  });

  test("availability rejects malformed usernames without hitting the network", async () => {
    const { checkUsernameAvailability } = await import("../src/lib/profiles/service");
    expect((await checkUsernameAvailability("ab")).available).toBe(false);
    expect((await checkUsernameAvailability("bad!name")).available).toBe(false);
    expect((await checkUsernameAvailability("x".repeat(31))).available).toBe(false);
    // المسافات تُحوَّل إلى _ (سلوك مقصود) فتصبح صالحة
    expect((await checkUsernameAvailability("has space")).normalized).toBe("has_space");
    expect((await checkUsernameAvailability("amina_law", "amina_law")).available).toBe(true);
  });
});
