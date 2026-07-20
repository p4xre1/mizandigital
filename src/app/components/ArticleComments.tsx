import { useState } from "react";
import { MessageSquare, Send, MessageSquareOff } from "lucide-react";
import { useI18n, serifFont, sansFont, type Lang } from "../lib/i18n";
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

function getLabel(key: keyof typeof LABELS, lang: Lang): string {
  return LABELS[key][lang] || LABELS[key].en;
}

function safeIsoDate(dateStr: string): string {
  try {
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? dateStr : parsed.toISOString();
  } catch {
    return dateStr;
  }
}

export default function ArticleComments({
  articleId,
  enabled,
}: {
  articleId: string;
  enabled: boolean;
}) {
  const { lang, dir } = useI18n();
  const cms = useCms();
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  // Honeypot field to trap spam bots
  const [botTrap, setBotTrap] = useState("");
  const [err, setErr] = useState("");

  const comments = cms.comments.filter((c) => c.articleId === articleId);

  if (!enabled) {
    return (
      <div
        className="mt-10 pt-6 border-t border-border flex items-center gap-2 text-sm text-muted-foreground"
        dir={dir}
        style={{ fontFamily: sansFont(lang) }}
      >
        <MessageSquareOff size={16} aria-hidden="true" />
        <span>{getLabel("disabled", lang)}</span>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    // Honeypot check: drop silently if bot filled out the hidden field
    if (botTrap) return;

    const n = sanitizeText(name, 60) || (lang === "ar" ? "زائر" : "Guest");
    const b = sanitizeText(body, 1000);

    if (b.length < 2) return;
    if (looksLikeSpam(`${n} ${b}`)) {
      setErr(getLabel("spam", lang));
      return;
    }

    const wait = throttle("comment", 20_000);
    if (wait) {
      setErr(`⏳ ${wait}s`);
      return;
    }

    addComment(articleId, n, b);
    setBody("");
  };

  return (
    <section
      className="mt-10 pt-8 border-t border-border"
      dir={dir}
      aria-labelledby="comments-heading"
    >
      <h2
        id="comments-heading"
        className="flex items-center gap-2 text-lg font-bold text-foreground mb-5"
        style={{ fontFamily: serifFont(lang) }}
      >
        <MessageSquare size={18} aria-hidden="true" />
        {getLabel("heading", lang)} ({comments.length})
      </h2>

      <form
        onSubmit={submit}
        className="mb-6 space-y-2"
        style={{ fontFamily: sansFont(lang) }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={getLabel("name", lang)}
          aria-label={getLabel("name", lang)}
          maxLength={60}
          className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-card outline-none focus:border-primary focus:ring-1 focus:ring-primary ltr:text-left rtl:text-right"
        />

        {/* Honeypot field — invisible to screen readers and humans */}
        <input
          type="text"
          name="website_url"
          value={botTrap}
          onChange={(e) => setBotTrap(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute -left-[9999px] w-px h-px opacity-0 pointer-events-none"
        />

        <div className="flex gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={getLabel("write", lang)}
            aria-label={getLabel("write", lang)}
            rows={2}
            maxLength={1000}
            className="flex-1 text-sm px-3 py-2 rounded-lg border border-border bg-card outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none ltr:text-left rtl:text-right"
            required
          />
          <button
            type="submit"
            aria-label={getLabel("submit", lang)}
            className="px-4 self-end py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-opacity"
          >
            <Send size={14} aria-hidden="true" />
            {getLabel("submit", lang)}
          </button>
        </div>

        {/* Live region for instant screen reader error announcements */}
        <div aria-live="polite">
          {err && <p className="text-xs text-destructive mt-1">{err}</p>}
        </div>
      </form>

      <div className="space-y-3" role="feed" aria-busy="false">
        {comments.length === 0 && (
          <p
            className="text-sm text-muted-foreground"
            style={{ fontFamily: sansFont(lang) }}
          >
            {getLabel("empty", lang)}
          </p>
        )}

        {comments.map((c) => (
          <article
            key={c.id}
            className="flex gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/20 transition-colors"
          >
            <div
              className="w-9 h-9 rounded-full bg-accent text-primary flex items-center justify-center text-sm font-bold shrink-0 uppercase"
              aria-hidden="true"
            >
              {Array.from(c.name)[0] || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <header className="flex items-center gap-2">
                <span
                  className="text-sm font-semibold text-foreground"
                  style={{ fontFamily: sansFont(lang) }}
                >
                  {c.name}
                </span>
                <time
                  dateTime={safeIsoDate(c.at)}
                  className="text-[11px] text-muted-foreground font-mono"
                >
                  {c.at}
                </time>
              </header>
              <p
                className="text-sm text-foreground/80 mt-0.5 break-words"
                style={{ fontFamily: sansFont(lang) }}
              >
                {c.body}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}