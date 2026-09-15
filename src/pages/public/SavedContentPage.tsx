import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AEOHead } from "@/components/seo/AEOHead";
import { Bookmark, Trash2, BookOpen, Scale, FileText } from "lucide-react";

type SavedItem = {
  id: string;
  type: "article" | "news" | "lexicon_term" | "law" | "quiz_question";
  title: string;
  slug: string;
  savedAt: string;
};

const STORAGE_KEY = "mizan:saved:content:v1";

function readSaved(): SavedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSaved(items: SavedItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export function SavedContentPage() {
  const [items, setItems] = useState<SavedItem[]>(() => readSaved());

  const remove = (id: string) => {
    const next = items.filter((i) => i.id !== id);
    setItems(next);
    writeSaved(next);
  };

  const clearAll = () => {
    setItems([]);
    writeSaved([]);
  };

  return (
    <main className="container-wide py-10" dir="rtl">
      <AEOHead title="المحتوى المحفوظ — ميزان الرقمية" description="مقالاتك، مصطلحاتك، وقوانينك المحفوظة للقراءة لاحقاً."
        directAnswer="المحتوى المحفوظ في ميزان الرقمية: مقالات وأخبار ومصطلحات محفوظة محلياً في المتصفح."
        breadcrumbs={[{ name: "الرئيسية", url: "https://www.mizan.page/" }, { name: "المحتوى المحفوظ — ميزان الرقمية", url: "https://www.mizan.page/savedcontentpage" }]} canonicalUrl="https://www.mizan.page/saved" />

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
            <Bookmark className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-black text-foreground">المحفوظات</h1>
            <p className="text-[12px] text-muted-foreground">{items.length} عنصر محفوظ</p>
          </div>
        </div>
        {items.length > 0 && (
          <button onClick={clearAll} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground">
            <Trash2 className="size-3.5" /> مسح الكل
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Bookmark className="mx-auto mb-3 size-6 text-muted-foreground" />
          <p className="text-sm font-bold text-foreground">لا يوجد محتوى محفوظ بعد</p>
          <p className="mt-1 text-[12px] text-muted-foreground">استعمل زر الحفظ 🔖 في المقالات والمصطلحات</p>
          <Link to="/articles" className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-[12px] font-bold text-primary-foreground">تصفح المقالات</Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground">
                  {item.type === "article" ? <FileText className="size-4" /> : item.type === "lexicon_term" ? <BookOpen className="size-4" /> : <Scale className="size-4" />}
                </span>
                <div>
                  <Link to={`/${item.type === "article" ? "articles" : item.type === "news" ? "news" : item.type === "lexicon_term" ? "lexicon" : "archive"}/${item.slug}`} className="text-[13px] font-bold text-foreground hover:text-primary">
                    {item.title}
                  </Link>
                  <p className="text-[10px] text-muted-foreground">{new Date(item.savedAt).toLocaleDateString("ar-MA")} • {item.type}</p>
                </div>
              </div>
              <button onClick={() => remove(item.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

// Helper to save from anywhere
export function saveContent(item: Omit<SavedItem, "savedAt">) {
  const existing = readSaved();
  if (existing.some((i) => i.id === item.id)) return;
  const next = [...existing, { ...item, savedAt: new Date().toISOString() }].slice(-100);
  writeSaved(next);
}

export function unsaveContent(id: string) {
  const existing = readSaved();
  const next = existing.filter((i) => i.id !== id);
  writeSaved(next);
}

export function isSaved(id: string): boolean {
  return readSaved().some((i) => i.id === id);
}
