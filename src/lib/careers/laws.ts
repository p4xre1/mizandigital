/**
 * ربط المسارات المهنية بأرشيف القوانين في ميزان (public.laws عبر اللقطة
 * المولَّدة src/data/laws.client.json).
 *
 * القواعد المثبتة هنا:
 *   • معرّف القانون في بيانات المسار نصّي (law_slugs) وليس UUID قاعدة البيانات:
 *     الملفات التحريرية لا تعرف معرّفات الصفوف، والكتابة بـ UUID تعني أن أي
 *     إعادة بناء للأرشيف تُنتج روابط ميتة.
 *   • لا رابط إلا لسجل موجود فعلاً في الأرشيف. غياب السجل ⇒ لا رابط، ويُعرض
 *     النصّ الصريح «النص القانوني لم يضف بعد إلى أرشيف ميزان».
 *   • حالة التحقق تُعرض كما هي في الأرشيف؛ ولا نكتب تاريخ تحقق لم يوثّقه أحد.
 */

import snapshot from "@/data/laws.client.json";

export interface LawArchiveRecord {
  /** معرّف الأرشيف (نفس معرّف صفحة الأرشيف /pdf/<slug>). */
  slug: string;
  /** الرابط العام الفعلي — يُحسب وقت البناء بنفس أدوات prerender. */
  public_path: string | null;
  db_slug: string | null;
  title: string;
  law_number: string | null;
  official_gazette_number: string | null;
  publication_date: string | null;
  source_verified_at: string | null;
}

interface LawSnapshot {
  generated_at: string;
  count: number;
  laws: LawArchiveRecord[];
}

const SNAPSHOT = snapshot as unknown as LawSnapshot;

export const LAW_ARCHIVE_GENERATED_AT = SNAPSHOT.generated_at;
export const LAW_ARCHIVE = Array.isArray(SNAPSHOT.laws) ? SNAPSHOT.laws : [];

const BY_SLUG = new Map(LAW_ARCHIVE.map((record) => [record.slug, record]));

/** سجل الأرشيف حسب معرّف النص (slug) — undefined إن لم يكن في الأرشيف. */
export function getLawBySlug(slug: string | null | undefined): LawArchiveRecord | undefined {
  if (!slug) return undefined;
  return BY_SLUG.get(slug);
}

/**
 * الرابط الداخلي النصّ القانوني، أو null.
 *
 * ملاحظة معمارية: الموقع لا يقدّم مساراً عاماً باسم `/laws/:slug`؛ أرشيف
 * القوانين المنشور (CMS/public.laws) يُعرض في صفحة الأرشيف `/pdf/<slug>`
 * المولَّدة في prerender. لذلك يُستعمل هنا `public_path` المحسوب وقت البناء
 * ولا يُبنى رابط `/laws/...` أبداً (رابط لا مقابل له = 404).
 */
export function lawHref(record: LawArchiveRecord | undefined | null): string | null {
  if (!record) return null;
  if (!record.public_path) return null;
  return record.public_path;
}

export interface ResolvedLegalFramework {
  law_slug: string | null;
  label_ar: string;
  relationship_type: string;
  relationship_ar: string;
  verification_status: string;
  last_verified: string | null;
  /** سجل الأرشيف إن وُجد فعلاً، أو null. */
  archive: LawArchiveRecord | null;
  /** رابط داخلي حقيقي، أو null — لا رابط مُفترض. */
  href: string | null;
}

export interface CareerLawInput {
  law_slugs?: string[];
  legal_framework?: Array<{
    law_slug: string | null;
    label_ar: string;
    relationship_type: string;
    relationship_ar: string;
    verification_status: string;
    last_verified: string | null;
  }>;
}

/**
 * يحلّ إطار مسار واحد: كل عنصر يعرف هل له سجل في الأرشيف أم لا.
 * العناصر التي تحمل slug غير موجود في الأرشيف تُعامَل كغير مؤرشفة — لا رابط.
 */
export function resolveCareerLaws(career: CareerLawInput): ResolvedLegalFramework[] {
  const framework = career.legal_framework ?? [];
  if (framework.length) {
    return framework.map((entry) => {
      const archive = getLawBySlug(entry.law_slug) ?? null;
      return {
        ...entry,
        archive,
        href: lawHref(archive),
      };
    });
  }

  // مسار بلا إطار مفصّل لكن بـ law_slugs فقط: نستخرج العنوان من الأرشيف نفسه.
  return (career.law_slugs ?? []).map((slug) => {
    const archive = getLawBySlug(slug) ?? null;
    return {
      law_slug: slug,
      label_ar: archive?.title ?? slug,
      relationship_type: "governing_framework",
      relationship_ar: "القانون المنظم للمهنة",
      verification_status: archive ? "verified" : "needs_archive_entry",
      last_verified: archive?.source_verified_at ?? null,
      archive,
      href: lawHref(archive),
    };
  });
}

/** عدد عناصر الإطار التي لها سجل في الأرشيف — للأرقام التعليمية في الواجهة. */
export function archivedLawCount(career: CareerLawInput): number {
  return resolveCareerLaws(career).filter((entry) => entry.archive !== null).length;
}
