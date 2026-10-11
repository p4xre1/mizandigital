import { supabase } from '@/lib/supabase/client';
import { parseCheck, type CheckResult, type LegalCase, type PublicCase } from './model';

// الجداول الجديدة معزولة هنا حتى يُعاد توليد أنواع Supabase (كما في pro-tools).
const db = supabase as any;

async function result<T>(request: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await request;
  if (error) throw new Error(error.message);
  return data;
}

export const casesService = {
  /** قائمة الحالات المنشورة للزوار. */
  publicList: () => result<PublicCase[]>(db.from('legal_cases_public').select('*').order('title')),
  publicOne: async (slug: string): Promise<PublicCase | null> =>
    result<PublicCase | null>(db.from('legal_cases_public').select('*').eq('slug', slug).maybeSingle()),
  /** يرسل الاختيار للخادم، ويعيد الجواب الكامل فقط عند الصواب. */
  check: async (slug: string, choice: number): Promise<CheckResult> =>
    parseCheck(await result<unknown>(db.rpc('legal_case_check', { p_slug: slug, p_choice: choice }))),

  // ---- الإدارة فقط (تفرض سياسة RLS ذلك) ----
  adminList: () => result<LegalCase[]>(db.from('legal_cases').select('*').order('updated_at', { ascending: false })),
  adminSave: (payload: Record<string, unknown>) => result<LegalCase>(db.from('legal_cases').upsert(payload).select().single()),
  adminDelete: (id: string) => result(db.from('legal_cases').delete().eq('id', id)),
  slugTaken: async (slug: string, ownId?: string): Promise<boolean> => {
    const row = await result<{ id: string } | null>(db.from('legal_cases').select('id').eq('slug', slug).maybeSingle());
    return Boolean(row && row.id !== ownId);
  },
};
