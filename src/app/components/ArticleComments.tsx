import { useState } from "react";
import { MessageSquare, Send, MessageSquareOff } from "lucide-react";
import { useI18n, serifFont, sansFont } from "../lib/i18n";
import { useCms, addComment } from "../lib/adminStore";
import { sanitizeText, looksLikeSpam, throttle } from "../lib/security";

const LABELS = {
  heading: { ar: "التعليقات", fr: "Commentaires", en: "Comments", es: "Comentarios" },
  name: { ar: "الاسم", fr: "Nom", en: "Name", es: "Nombre" },
  write: { ar: "اكتب تعليقاً...", fr: "Écrire un commentaire...", en: "Write a comment...", es: "Escribe un comentario..." },
  submit: { ar: "نشر", fr: "Publier", en: "Post", es: "Publicar" },
  empty: { ar: "كن أول من يعلّق.", fr: "Soyez le premier à commenter.", en: "Be the first to comment.", es: "Sé el primero en comentar." },
  disabled: { ar: "التعليقات مغلقة على هذه المقالة.", fr: "Les commentaires sont désactivés.", en: "Comments are turned off for this article.", es: "Los comentarios están desactivados." },
  spam: { ar: "تم رفض التعليق (محتوى مشبوه).", fr: "Commentaire rejeté (spam).", en: "Comment rejected (looks like spam).", es: "Comentario rechazado (spam)." },
} as const;

export default function ArticleComments({ articleId, enabled }: { articleId: string; enabled: boolean }) {
  const { lang, dir } = useI18n();
  const cms = useCms();
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [hp, setHp] = useState(""); // honeypot
  const [err, setErr] = useState("");

  const comments = cms.comments.filter(c => c.articleId === articleId);

  if (!enabled) {
    return (
      <div className="mt-10 pt-6 border-t border-border flex items-center gap-2 text-sm text-muted-foreground" dir={dir} style={{ fontFamily: sansFont(lang) }}>
        <MessageSquareOff size={16} />{LABELS.disabled[lang]}
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (hp) return; // bot filled honeypot
    const n = sanitizeText(name, 60) || (lang === "ar" ? "زائر" : "Guest");
    const b = sanitizeText(body, 1000);
    if (b.length < 2) return;
    if (looksLikeSpam(`${n} ${b}`)) { setErr(LABELS.spam[lang]); return; }
    const wait = throttle("comment", 20_000);
    if (wait) { setErr(`⏳ ${wait}s`); return; }
    addComment(articleId, n, b);
    setBody("");
  };

  return (
    <section className="mt-10 pt-8 border-t border-border" dir={dir}>
      <h2 className="flex items-center gap-2 text-lg font-bold text-foreground mb-5" style={{ fontFamily: serifFont(lang) }}>
        <MessageSquare size={18} />{LABELS.heading[lang]} ({comments.length})
      </h2>

      <form onSubmit={submit} className="mb-6 space-y-2" style={{ fontFamily: sansFont(lang) }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder={LABELS.name[lang]} maxLength={60}
          className={`w-full text-sm px-3 py-2 rounded-lg border border-border bg-card outline-none focus:border-primary ${dir === "rtl" ? "text-right" : "text-left"}`} />
        {/* Honeypot — hidden from humans, catches bots */}
        <input value={hp} onChange={e => setHp(e.target.value)} tabIndex={-1} autoComplete="off"
          className="absolute -left-[9999px] w-px h-px opacity-0" aria-hidden="true" />
        <div className="flex gap-2">
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder={LABELS.write[lang]} rows={2} maxLength={1000}
            className={`flex-1 text-sm px-3 py-2 rounded-lg border border-border bg-card outline-none focus:border-primary resize-none ${dir === "rtl" ? "text-right" : "text-left"}`} />
          <button type="submit" className="px-4 self-end py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 flex items-center gap-1.5">
            <Send size={14} />{LABELS.submit[lang]}
          </button>
        </div>
        {err && <p className="text-xs text-destructive">{err}</p>}
      </form>

      <div className="space-y-3">
        {comments.length === 0 && <p className="text-sm text-muted-foreground" style={{ fontFamily: sansFont(lang) }}>{LABELS.empty[lang]}</p>}
        {comments.map(c => (
          <div key={c.id} className="flex gap-3 p-4 rounded-xl border border-border bg-card">
            <div className="w-9 h-9 rounded-full bg-accent text-primary flex items-center justify-center text-sm font-bold shrink-0">
              {c.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground" style={{ fontFamily: sansFont(lang) }}>{c.name}</span>
                <span className="text-[11px] text-muted-foreground font-mono">{c.at}</span>
              </div>
              <p className="text-sm text-foreground/80 mt-0.5 break-words" style={{ fontFamily: sansFont(lang) }}>{c.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
