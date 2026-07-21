"use client";

import React, { useState } from "react";
import { MessageSquare, Send, MessageSquareOff, Loader2 } from "lucide-react";
import { useI18n, serifFont, sansFont, type Lang } from "../lib/i18n";
import { useCms, addComment } from "../lib/adminStore";
import { sanitizeText, looksLikeSpam, throttle } from "../lib/security";

const LABELS = {
  heading: { ar: "التعليقات", fr: "Commentaires", en: "Comments", es: "Comentarios" },
  name: { ar: "الاسم (اختياري)", fr: "Nom (Optionnel)", en: "Name (Optional)", es: "Nombre (Opcional)" },
  write: { ar: "اكتب تعليقاً...", fr: "Écrire un commentaire...", en: "Write a comment...", es: "Escribe un comentario..." },
  submit: { ar: "نشر", fr: "Publier", en: "Post", es: "Publicar" },
  empty: { ar: "كن أول من يعلّق.", fr: "Soyez le premier à commenter.", en: "Be the first to comment.", es: "Sé el primero en comentar." },
  disabled: { ar: "التعليقات مغلقة على هذه المقالة.", fr: "Les commentaires sont désactivés.", en: "Comments are turned off for this article.", es: "Los comentarios están desactivados." },
  spam: { ar: "تم رفض التعليق (محتوى مشبوه).", fr: "Commentaire rejeté (spam).", en: "Comment rejected (looks like spam).", es: "Comentario rechazado (spam)." },
  tooShort: { ar: "التعليق قصير جداً.", fr: "Le commentaire est trop court.", en: "Comment is too short.", es: "El comentario es demasiado corto." },
  guest: { ar: "زائر", fr: "Invité", en: "Guest", es: "Invitado" },
} as const;

function getLabel(key: keyof typeof LABELS, lang: Lang): string {
  return LABELS[key]?.[lang] || LABELS[key]?.en || "";
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const comments = cms.comments.filter((c) => c.articleId === articleId);

  if (!enabled) {
    return (
      <div
        className="mt-10 pt-6 border-t border-border flex items-center gap-2 text-sm text-muted-foreground select-none"
        dir={dir}
        style={{ fontFamily: sansFont(lang) }}
      >
        <MessageSquareOff size={16} aria-hidden="true" className="shrink-0" />
        <span>{getLabel("disabled", lang)}</span>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    // Honeypot check: silently drop if bot filled out hidden input
    if (botTrap) return;

    const trimmedBody = sanitizeText(body, 1000);
    if (trimmedBody.length < 2) {
      setErr(getLabel("tooShort", lang));
      return;
    }

    const defaultGuest = getLabel("guest", lang);
    const authorName = sanitizeText(name, 60) || defaultGuest;

    if (looksLikeSpam(`${authorName} ${trimmedBody}`)) {
      setErr(getLabel("spam", lang));
      return;
    }

    const wait = throttle("comment", 20_000);
    if (wait) {
      setErr(`⏳ ${wait}s`);
      return;
    }

    setIsSubmitting(true);
    try {
      await addComment(articleId, authorName, trimmedBody);
      setBody("");
    } catch {
      setErr(getLabel("spam", lang));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      className="mt-10 pt-8 border-t border-border select-none"
      dir={dir}
      aria-labelledby="comments-heading"
    >
      <h2
        id="comments-heading"
        className="flex items-center gap-2 text-base sm:text-lg font-bold text-foreground mb-5"
        style={{ fontFamily: serifFont(lang) }}
      >
        <MessageSquare size={18} aria-hidden="true" className="shrink-0 text-primary" />
        <span>
          {getLabel("heading", lang)} ({comments.length})
        </span>
      </h2>

      <form
        onSubmit={submit}
        className="mb-8 space-y-3"
        style={{ fontFamily: sansFont(lang) }}
      >
        <div>
          <label htmlFor={`comment-name-${articleId}`} className="sr-only">
            {getLabel("name", lang)}
          </label>
          <input
            id={`comment-name-${articleId}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={getLabel("name", lang)}
            maxLength={60}
            disabled={isSubmitting}
            className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-border bg-card outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ltr:text-left rtl:text-right disabled:opacity-50 min-h-[44px]"
          />
        </div>

        {/* Honeypot field — invisible to screen readers and human users */}
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

        <div className="flex flex-col gap-2">
          <label htmlFor={`comment-body-${articleId}`} className="sr-only">
            {getLabel("write", lang)}
          </label>
          <textarea
            id={`comment-body-${articleId}`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={getLabel("write", lang)}
            rows={3}
            maxLength={1000}
            disabled={isSubmitting}
            className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-border bg-card outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none transition-all ltr:text-left rtl:text-right disabled:opacity-50"
            required
          />

          <div className="flex items-center justify-between pt-1">
            <div aria-live="polite" className="min-h-[20px]">
              {err && <p className="text-xs font-medium text-destructive">{err}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !body.trim()}
              aria-label={getLabel("submit", lang)}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs sm:text-sm font-semibold hover:opacity-90 active:scale-95 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-50 disabled:pointer-events-none touch-manipulation min-h-[44px]"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin shrink-0" />
              ) : (
                <Send size={15} className="shrink-0 rtl:-scale-x-100" aria-hidden="true" />
              )}
              <span>{getLabel("submit", lang)}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Comment Feed */}
      <div className="space-y-3" role="feed" aria-busy={isSubmitting}>
        {comments.length === 0 && (
          <p
            className="text-xs sm:text-sm text-muted-foreground italic py-2"
            style={{ fontFamily: sansFont(lang) }}
          >
            {getLabel("empty", lang)}
          </p>
        )}

        {comments.map((c) => {
          const initial = Array.from(c.name.trim())[0] || "?";
          return (
            <article
              key={c.id}
              className="flex gap-3 p-3.5 sm:p-4 rounded-2xl border border-border/80 bg-card/60 hover:bg-card transition-colors"
            >
              <div
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs sm:text-sm font-bold shrink-0 uppercase select-none"
                aria-hidden="true"
              >
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <header className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className="text-xs sm:text-sm font-bold text-foreground truncate"
                    style={{ fontFamily: sansFont(lang) }}
                  >
                    {c.name}
                  </span>
                  <time
                    dateTime={safeIsoDate(c.at)}
                    className="text-[10px] sm:text-[11px] text-muted-foreground font-mono shrink-0"
                  >
                    {c.at}
                  </time>
                </header>
                <p
                  className="text-xs sm:text-sm text-foreground/80 leading-relaxed break-words"
                  style={{ fontFamily: sansFont(lang) }}
                >
                  {c.body}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}