import { describe, test, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
// عزل الشبكة: الخدمات تستورد عميل Supabase — تُعوَّض ببناء فارغ حتمي.
vi.mock("@/lib/supabase/client", () => {
  const query: Record<string, unknown> = {
    select: () => query,
    eq: () => query,
    or: () => query,
    order: () => query,
    limit: () => query,
    insert: () => query,
    upsert: () => query,
    update: () => query,
    delete: () => query,
    maybeSingle: async () => ({ data: null, error: null }),
    single: async () => ({ data: null, error: null }),
  };
  return {
    supabase: {
      from: () => query,
      storage: {
        from: () => ({
          upload: async () => ({ error: null }),
          remove: async () => ({ error: null }),
          getPublicUrl: () => ({ data: { publicUrl: "https://x/cv" } }),
        }),
      },
      auth: {
        getUser: async () => ({ data: { user: null } }),
        getSession: async () => ({ data: { session: null } }),
      },
    },
  };
});

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260929000000_school_annonce_resume_links.sql",
);
const MIGRATION_SQL = readFileSync(MIGRATION, "utf8");

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

/**
 * الوصلة الثلاثية: الكلية ↔ الإعلانات ↔ السيرة الذاتية
 * -----------------------------------------------------------------------
 *   §1  seminars + news + events   ← faculty_id / facultySlug
 *   §2  mizan_profiles             ← faculty_id (كليتي)
 *   §3  resumes                    ← سيرة واحدة لكل بروفايل + CV file
 *   §4  applications               ← تقديم سيرة على إعلان
 *   §5  وعاء cv-files
 * الاختبارات تقيس: SQL ↔ TS parity، سلامة RLS، والربط في الواجهة
 * (صفحة الكلية، /annonces، المحرر، لوحة الإدارة) + SEO (canonical/sitemap).
 */

describe("الهجرة: أعمدة الربط والقيود", () => {
  test("seminars وnews تربطان بـ faculties عبر faculty_id مع حذف آمن", () => {
    expect(MIGRATION_SQL).toMatch(
      /ALTER TABLE public\.seminars\s+ADD COLUMN IF NOT EXISTS faculty_id uuid REFERENCES public\.faculties\(id\) ON DELETE SET NULL/,
    );
    expect(MIGRATION_SQL).toMatch(
      /ALTER TABLE public\.news\s+ADD COLUMN IF NOT EXISTS faculty_id uuid REFERENCES public\.faculties\(id\) ON DELETE SET NULL/,
    );
  });

  test("مفهرسات faculty_id للاستعلامات في SchoolPage وAnnoncesPage", () => {
    expect(MIGRATION_SQL).toContain("CREATE INDEX IF NOT EXISTS seminars_faculty_id_idx ON public.seminars (faculty_id)");
    expect(MIGRATION_SQL).toContain("CREATE INDEX IF NOT EXISTS news_faculty_id_idx ON public.news (faculty_id)");
  });

  test("mizan_profiles.faculty_id تربط الطالب بكلية (مع فهرس)", () => {
    expect(MIGRATION_SQL).toMatch(
      /ALTER TABLE public\.mizan_profiles\s+ADD COLUMN IF NOT EXISTS faculty_id uuid REFERENCES public\.faculties\(id\) ON DELETE SET NULL/,
    );
    expect(MIGRATION_SQL).toContain("CREATE INDEX IF NOT EXISTS mizan_profiles_faculty_id_idx ON public.mizan_profiles (faculty_id)");
  });

  test("resumes: سيرة واحدة لكل بروفايل (unique) مع ON DELETE CASCADE", () => {
    expect(MIGRATION_SQL).toMatch(/profile_id uuid NOT NULL UNIQUE REFERENCES public\.mizan_profiles\(id\) ON DELETE CASCADE/);
    expect(MIGRATION_SQL).toContain("cv_file_path text");
    expect(MIGRATION_SQL).toMatch(/is_public boolean NOT NULL DEFAULT false/);
    expect(MIGRATION_SQL).toContain("education jsonb");
    expect(MIGRATION_SQL).toContain("experience jsonb");
  });

  test("applications: قيد واحد لكل (صاحب، إعلان) + قيود الحالة والنوع", () => {
    expect(MIGRATION_SQL).toMatch(
      /CONSTRAINT applications_one_per_annonce UNIQUE \(profile_id, annonce_type, annonce_id\)/,
    );
    expect(MIGRATION_SQL).toMatch(/annonce_type IN \('event'::text, 'seminar'::text, 'news'::text\)/);
    expect(MIGRATION_SQL).toMatch(
      /status IN \('pending'::text, 'viewed'::text, 'shortlisted'::text, 'rejected'::text\)/,
    );
    // resume_id مرتبط بالسيرة → حذف السيرة يمسح طلباتها
    expect(MIGRATION_SQL).toMatch(/resume_id uuid NOT NULL REFERENCES public\.resumes\(id\) ON DELETE CASCADE/);
  });
});

describe("الهجرة: سياسات RLS", () => {
  test("resumes: المالك (عبر owner_id) كامل الصلاحيات، والجمهور يقرأ المنشور فقط", () => {
    expect(MIGRATION_SQL).toContain("ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY");
    expect(MIGRATION_SQL).toMatch(
      /CREATE POLICY "resumes_owner_all"[\s\S]*?FOR ALL[\s\S]*?USING \(profile_id IN \(SELECT id FROM public\.mizan_profiles WHERE owner_id = \(SELECT auth\.uid\(\)\)\)/,
    );
    expect(MIGRATION_SQL).toMatch(
      /CREATE POLICY "resumes_public_read"[\s\S]*?FOR SELECT[\s\S]*?USING \(is_public = true\)/,
    );
  });

  test("applications: صاحب الطلب يملك، والطاقم (admin_god_mode) يقرأ ويحدّث الحالة", () => {
    expect(MIGRATION_SQL).toContain("ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY");
    expect(MIGRATION_SQL).toMatch(/CREATE POLICY "applications_owner_insert"[\s\S]*?FOR INSERT/);
    expect(MIGRATION_SQL).toMatch(/CREATE POLICY "applications_owner_select"[\s\S]*?FOR SELECT/);
    expect(MIGRATION_SQL).toMatch(/CREATE POLICY "applications_owner_delete"[\s\S]*?FOR DELETE/);
    // نفس نمط interaction_tracking: admin_god_mode وليس role (الذي فيه 'editor' افتراضية)
    expect(MIGRATION_SQL).toMatch(
      /CREATE POLICY "applications_staff_read"[\s\S]*?admin_god_mode FROM public\.profiles p WHERE p\.id = \(SELECT auth\.uid\(\)\)\) IS TRUE/,
    );
    expect(MIGRATION_SQL).toMatch(/CREATE POLICY "applications_staff_update"[\s\S]*?FOR UPDATE/);
  });

  test("وعاء cv-files: عام للقراءة، والرفع/الحذف للمالك داخل مجلده فقط", () => {
    expect(MIGRATION_SQL).toMatch(
      /INSERT INTO storage\.buckets \(id, name, public, file_size_limit, allowed_mime_types\)\s*VALUES \('cv-files', 'cv-files', true, 5242880, ARRAY\[/,
    );
    expect(MIGRATION_SQL).toContain("application/pdf");
    expect(MIGRATION_SQL).toContain("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(MIGRATION_SQL).toMatch(
      /CREATE POLICY "cv_files_owner_upload"[\s\S]*?WITH CHECK \(bucket_id = 'cv-files' AND \(storage\.foldername\(name\)\)\[1\] = \(SELECT auth\.uid\(\)\)::text\)/,
    );
    expect(MIGRATION_SQL).toMatch(/CREATE POLICY "cv_files_owner_delete"[\s\S]*?FOR DELETE/);
    expect(MIGRATION_SQL).toMatch(/CREATE POLICY "cv_files_public_read"[\s\S]*?FOR SELECT/);
  });
});

describe("TS ↔ SQL parity: البروفايل ↔ الكلية", () => {
  const service = read("src/lib/profiles/service.ts");
  const quizTypes = read("src/types/quiz.ts");

  test("faculty_id في أعمدة القراءة والحفظ", () => {
    expect(service).toMatch(/"occupation",\s*"faculty_id",\s*"share_location"/);
    expect(service).toContain("facultyId: row.faculty_id ?? null,");
    expect(service).toContain("faculty_id: profile.facultyId ?? null,");
  });

  test("النوع MizanProfile يحمل facultyId", () => {
    expect(quizTypes).toMatch(/facultyId\?: string \| null/);
  });

  test("MyProfilePage: حقل «كليتي» + تمريره في الحفظ", () => {
    const page = read("src/pages/public/MyProfilePage.tsx");
    expect(page).toContain('id="faculty"');
    expect(page).toContain('from("faculties")');
    expect(page).toContain("facultyId: facultyId || null,");
    expect(page).toContain('setFacultyId(profile.facultyId ?? "")');
  });
});

describe("خدمة السيرة (src/lib/resumes/service.ts)", () => {
  const service = read("src/lib/resumes/service.ts");

  test("سيرة واحدة لكل بروفايل (upsert on profile_id) ومسار CV صريح حتى null", () => {
    expect(service).toContain('.upsert(payload, { onConflict: "profile_id" })');
    expect(service).toMatch(/cv_file_path: input\.cv_file_path \?\? null/);
  });

  test("التقديم على إعلان + معالجة التكرار (23505)", () => {
    expect(service).toContain('from("applications")');
    expect(service).toMatch(/annonce_type: annonce\.type/);
    expect(service).toContain('msg.includes("23505")');
  });

  test("حماية رفع الـCV: حجم 5MB ونوع MIME ومجلد المالك", () => {
    expect(service).toContain('5 * 1024 * 1024');
    expect(service).toContain('const path = `${uid}/${name}`');
    expect(service).toContain("application/pdf");
    expect(service).toContain("cv-files");
  });

  test("حذف ملف CV محصور بمجلد المالك", () => {
    expect(service).toMatch(/if \(!path\.startsWith\(`\$\{uid\}\/`\)\) return/);
  });
});

describe("الواجهة: صفحة /annonces", () => {
  const page = read("src/pages/public/AnnoncesPage.tsx");

  test("تدمج المصادر الثلاثة (فعاليات محلية + ندوات + أخبار)", () => {
    expect(page).toContain('import eventsData from "../../data/events.json"');
    expect(page).toContain('from("seminars")');
    expect(page).toContain('from("news")');
    expect(page).toContain('type: "event"');
    expect(page).toContain('type: "seminar"');
    expect(page).toContain('type: "news"');
  });

  test("فلترة حسب الكلية (slug محلي أو faculty_id عبر faculties) والمدينة والنوع", () => {
    expect(page).toContain('from("faculties")');
    expect(page).toMatch(/facultySlug === schoolFilter/);
    expect(page).toMatch(/facultySlugById\.get\(a\.facultyId\) === schoolFilter/);
    expect(page).toContain('value={cityFilter}');
  });

  test("زر التقديم ينادي applyToAnnonce ويحترم «قدّمت سابقاً»", () => {
    expect(page).toContain("applyToAnnonce");
    expect(page).toContain("fetchMyApplications");
    expect(page).toContain("قدّمت ✓");
  });
});

describe("الواجهة: قسم إعلانات الكلية في SchoolPage", () => {
  const page = read("src/pages/public/SchoolPage.tsx");

  test("يجمع فعاليات محلية (facultySlug) وندوات/أخبار CMS (faculty_id)", () => {
    expect(page).toContain('import eventsData from "../../data/events.json"');
    expect(page).toMatch(/ev\.facultySlug === slug/);
    expect(page).toContain('.eq("faculty_id", facultyUuid)');
    expect(page).toContain('from("seminars")');
    expect(page).toContain('from("news")');
  });

  test("يظهر القسم مع رابط لكل الإعلانات مفلترة بالكلية", () => {
    expect(page).toContain("أحدث إعلانات الكلية");
    expect(page).toMatch(/\/annonces\?school=\$\{/);
  });
});

describe("الواجهة: محرر السيرة والصفحة العامة", () => {
  const editor = read("src/components/profile/ResumeEditor.tsx");
  const resumePage = read("src/pages/public/ResumePage.tsx");

  test("المحرر: رفع CV + حفظ + مفتاح النشر", () => {
    expect(editor).toContain("uploadCvFile");
    expect(editor).toContain("saveMyResume");
    expect(editor).toContain("isPublic");
    expect(editor).toContain("resume-skills");
    expect(editor).toContain("المسار التعليمي");
    expect(editor).toContain("الخبرة والممارسة");
  });

  test("MyProfilePage يتضمن محرر السيرة", () => {
    const profile = read("src/pages/public/MyProfilePage.tsx");
    expect(profile).toContain("<ResumeEditor />");
    expect(profile).toContain('import { ResumeEditor } from "@/components/profile/ResumeEditor"');
  });

  test("الصفحة العامة: canonical /resume/<username> + Schema Person", () => {
    expect(resumePage).toMatch(/canonicalFor\(`\/resume\/\$\{username\}`\)/);
    expect(resumePage).toContain('"@type": "Person"');
    expect(resumePage).toContain("fetchPublicResume");
  });
});

describe("لوحة الإدارة", () => {
  const seminars = read("src/pages/admin/seminars/SeminarsPage.tsx");
  const news = read("src/pages/admin/NewsManagementPage.tsx");
  const applications = read("src/pages/admin/ApplicationsPage.tsx");

  test("محرر الندوات: اختيار الكلية + faculty_id في الحمل", () => {
    expect(seminars).toContain('from("faculties")');
    expect(seminars).toMatch(/faculty_id: facultyId \|\| null/);
    expect(seminars).toContain('setFacultyId(seminar.faculty_id || "")');
    expect(seminars).toContain("الكلية المنظمة");
  });

  test("مدير الأخبار: اختيار الكلية + faculty_id في الحمل", () => {
    expect(news).toContain('from("faculties")');
    expect(news).toMatch(/faculty_id: facultyId \|\| null/);
    expect(news).toContain('setFacultyId(item.faculty_id || "")');
    expect(news).toContain("الكلية المرتبطة");
  });

  test("صفحة طلبات التقديم: جلب + تغيير الحالة", () => {
    expect(applications).toContain("fetchApplications");
    expect(applications).toContain("setApplicationStatus");
    expect(applications).toContain("shortlisted");
    expect(applications).toContain("عرض السيرة");
  });
});

describe("الروابط وSEO", () => {
  const routes = read("src/routes/AppRoutes.tsx");
  const sidebar = read("src/components/layout/AdminSidebar.tsx");
  const urlPolicy = read("shared/seo/url-policy.js");
  const sitemap = read("scripts/generate-sitemap.mjs");
  const prerender = read("scripts/prerender.mjs");

  test("المسارات المسجلة: /annonces و/resume/:username و/admin/applications", () => {
    expect(routes).toMatch(/path="\/annonces" element=\{<AnnoncesPage \/>}/);
    expect(routes).toMatch(/path="\/resume\/:username" element=\{<ResumeWrapper \/>}/);
    expect(routes).toMatch(/path="applications" element=\{<ApplicationsPage \/>}/);
  });

  test("قائمة جانبية: بند طلبات التقديم", () => {
    expect(sidebar).toMatch(/path: "\/admin\/applications"/);
  });

  test("سياسة الروابط: canonicalAnnonces + استثناء /resume من الفهرسة", () => {
    expect(urlPolicy).toMatch(/export const canonicalAnnonces = \(origin\) => canonicalUrl\("\/annonces", \{ origin \}\)/);
    expect(urlPolicy).toMatch(/path\.startsWith\("\/resume\/"\)\) return false/);
  });

  test("sitemap يتضمن /annonces", () => {
    expect(sitemap).toMatch(/path: "\/annonces"/);
  });

  test("prerender: صفحة /annonces ثابتة + روابط تنقل نحوها", () => {
    expect(prerender).toMatch(/path: "\/annonces"/);
    expect(prerender).toContain('<a href="/annonces">إعلانات الكليات</a>');
  });
});

describe("البيانات المحلية", () => {
  test("events.json: كل الفعاليات مرتبطة بكلية عبر facultySlug", () => {
    const events = JSON.parse(read("src/data/events.json")) as Array<{
      id: string;
      facultySlug?: string;
      organizer?: string;
    }>;
    expect(events.length).toBeGreaterThan(0);
    const schools = JSON.parse(read("src/data/schools.json")) as Array<{ slug?: string }>;
    const slugs = new Set(schools.map((s) => s.slug).filter(Boolean));
    for (const event of events) {
      expect(event.facultySlug, `فعالية ${event.id} بلا facultySlug`).toBeTruthy();
      expect(slugs.has(event.facultySlug!), `facultySlug غير موجود في schools.json: ${event.facultySlug}`).toBe(true);
    }
  });

  test("أنواع Resume/Application معرّفة وصادرة من types/resume", () => {
    const types = read("src/types/resume.ts");
    expect(types).toContain("export interface Resume");
    expect(types).toContain("export interface Application");
    expect(types).toContain("export type AnnonceType");
    expect(types).toContain("export interface AnnonceItem");
  });
});
