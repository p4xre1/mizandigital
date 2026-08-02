"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  MessageSquare,
  Send,
  MessageSquareOff,
  Loader2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Lock,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import { useI18n, serifFont, sansFont, type Lang } from "../../lib/i18n";
import { sanitizeText, looksLikeSpam, throttle } from "../../lib/security";
import { useRole } from "@/hooks/useRole";

// Environment Configuration with Fallbacks
const SITE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_URL) ||
  "https://www.mizan.page";

const ADSENSE_CLIENT_ID =
  (typeof import.meta !== "undefined" &&
    import.meta.env?.VITE_GOOGLE_ADSENSE_CLIENT_ID) ||
  "ca-pub-1749032173858747";

const GTM_ID =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_GTM_ID) ||
  "GTM-PTT8P94G";

const GA_ID =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_GA_ID) ||
  "G-S52GPR2RWL";

// Supabase Client Initialization
const SUPABASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) || "";
const SUPABASE_ANON_KEY =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY) || "";

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

interface CommentItem {
  id: string;
  articleId: string;
  name: string;
  body: string;
  at: string;
}

// Multilingual Labels Matrix (AR, FR, EN, ES)
const LABELS = {
  heading: {
    ar: "التعليقات والآراء الأكاديمية",
    fr: "Commentaires & Analyses",
    en: "Comments & Discussions",
    es: "Comentarios y Debates",
  },
  name: {
    ar: "الاسم أو الصفة (اختياري)",
    fr: "Nom ou Titre (Optionnel)",
    en: "Name or Title (Optional)",
    es: "Nombre o Título (Opcional)",
  },
  write: {
    ar: "اكتب تعليقك أو استفسارك القانوني...",
    fr: "Écrire un commentaire ou analyse...",
    en: "Write your comment or analysis...",
    es: "Escribe tu comentario o análisis...",
  },
  submit: {
    ar: "نشر التعليق",
    fr: "Publier le commentaire",
    en: "Post Comment",
    es: "Publicar Comentario",
  },
  empty: {
    ar: "لا توجد تعليقات بعد. كن أول من يثري النقاش القانوني الأكاديمي.",
    fr: "Aucun commentaire pour le moment. Soyez le premier à contribuer.",
    en: "No comments yet. Be the first to join the academic discussion.",
    es: "No hay comentarios aún. Sé el primero en contribuir al debate académico.",
  },
  disabled: {
    ar: "التعليقات مغلقة حالياً لهذا المقال.",
    fr: "Les commentaires sont désactivés pour cet article.",
    en: "Comments are disabled for this article.",
    es: "Los comentarios están desactivados para este artículo.",
  },
  spam: {
    ar: "تم رفض المحتوى لمطابقته معايير تصفية النصوص المشبوهة.",
    fr: "Commentaire rejeté par le filtre anti-spam.",
    en: "Comment rejected by security and anti-spam filters.",
    es: "Comentario rechazado por el filtro anti-spam de seguridad.",
  },
  tooShort: {
    ar: "التعليق قصير جداً (المطلوب 3 أحرف على الأقل).",
    fr: "Le commentaire est trop court (min. 3 caractères).",
    en: "Comment is too short (min. 3 caractères).",
    es: "El comentario es demasiado corto (mín. 3 caracteres).",
  },
  guest: {
    ar: "باحث / زائر",
    fr: "Chercheur / Invité",
    en: "Researcher / Guest",
    es: "Investigador / Invitado",
  },
  staffBadge: {
    ar: "فريق الإشراف",
    fr: "Équipe Mizan",
    en: "Mizan Staff",
    es: "Equipo Mizan",
  },
  delete: {
    ar: "حذف",
    fr: "Supprimer",
    en: "Delete",
    es: "Eliminar",
  },
  verified: {
    ar: "مكفول أمنياً",
    fr: "SÉCURISÉ",
    en: "VERIFIED",
    es: "VERIFICADO",
  },
  charCount: {
    ar: "حرف",
    fr: "caractères",
    en: "chars",
    es: "caracteres",
  },
  adLabel: {
    ar: "إعلان مدعوم - منصة ميزان",
    fr: "Sponsorisé - Mizan Digital",
    en: "Sponsored - Mizan Digital",
    es: "Patrocinado - Mizan Digital",
  },
} as const;

function getLabel(key: keyof typeof LABELS, lang: Lang): string {
  const currentLang = (lang as string).toLowerCase();
  const entry = LABELS[key] as Record<string, string>;
  return entry[currentLang] || entry["ar"] || entry["en"] || "";
}

function safeIsoDate(dateStr: string): string {
  try {
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? dateStr : parsed.toISOString();
  } catch {
    return dateStr;
  }
}

interface ArticleCommentsProps {
  articleId: string;
  articleTitle?: string;
  enabled: boolean;
}

export default function ArticleComments({
  articleId,
  articleTitle = "المقال القانوني",
  enabled,
}: ArticleCommentsProps) {
  const { lang, dir } = useI18n();
  const { isStaff, canManageUsers } = useRole();

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [name, setName] = useState("");
  const [body, setBody] = useState("");

  // Honeypot field to catch spam bots silently
  const [botTrap, setBotTrap] = useState("");
  const [err, setErr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMounted = useRef(true);

  // Fetch comments from Supabase
  const fetchComments = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("comments")
        .select("id, article_id, name, body, created_at")
        .eq("article_id", articleId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading comments from Supabase:", error.message);
        return;
      }

      if (data && isMounted.current) {
        const formatted: CommentItem[] = data.map((item) => ({
          id: item.id,
          articleId: item.article_id,
          name: item.name,
          body: item.body,
          at: new Date(item.created_at).toLocaleDateString(
            lang === "ar" ? "ar-MA" : "fr-FR",
            { year: "numeric", month: "short", day: "numeric" }
          ),
        }));
        setComments(formatted);
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [articleId, lang]);

  useEffect(() => {
    isMounted.current = true;
    fetchComments();
    return () => {
      isMounted.current = false;
    };
  }, [fetchComments]);

  // Safe Google AdSense Script Injection
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch (err) {
      console.warn("Google AdSense safely handled in ArticleComments:", err);
    }
  }, []);

  // Handle Comment Submission
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    // Honeypot check
    if (botTrap) return;

    const trimmedBody = sanitizeText(body, 1000);
    if (trimmedBody.length < 3) {
      setErr(getLabel("tooShort", lang));
      return;
    }

    const defaultGuest = getLabel("guest", lang);
    const authorName = sanitizeText(name, 60) || defaultGuest;

    if (looksLikeSpam(`${authorName} ${trimmedBody}`)) {
      setErr(getLabel("spam", lang));
      return;
    }

    // Rate Limiting Protection (20-second throttle)
    const wait = throttle("comment", 20_000);
    if (wait) {
      setErr(`⏳ ${wait}s`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (supabase) {
        const { error } = await supabase.from("comments").insert([
          {
            article_id: articleId,
            name: authorName,
            body: trimmedBody,
            is_approved: true,
          },
        ]);

        if (error) throw error;
        await fetchComments();
      } else {
        // Fallback local state if Supabase is not yet configured
        const newComment: CommentItem = {
          id: Date.now().toString(),
          articleId,
          name: authorName,
          body: trimmedBody,
          at: new Date().toLocaleDateString(),
        };
        setComments((prev) => [newComment, ...prev]);
      }

      // Tracking Event
      if (typeof window !== "undefined") {
        const dataLayer = (window as any).dataLayer || [];
        dataLayer.push({
          event: "comment_submitted",
          article_id: articleId,
          comment_length: trimmedBody.length,
          gtm_id: GTM_ID,
          ga_id: GA_ID,
          site_domain: SITE_URL,
          timestamp: new Date().toISOString(),
        });
      }

      if (isMounted.current) {
        setBody("");
        setName("");
      }
    } catch (error) {
      console.error("Submission failed:", error);
      if (isMounted.current) {
        setErr(getLabel("spam", lang));
      }
    } finally {
      if (isMounted.current) {
        setIsSubmitting(false);
      }
    }
  };

  // Staff Moderation Delete Handler
  const handleDeleteComment = async (commentId: string) => {
    if (!canManageUsers && !isStaff) return;

    try {
      if (supabase) {
        const { error } = await supabase.from("comments").delete().eq("id", commentId);
        if (error) throw error;
      }
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  // Schema.org Structured Data for Comments
  const commentsSchema = useMemo(() => {
    return {
      "@context": "https://schema.org",
      "@type": "DiscussionForumPosting",
      "@id": `${SITE_URL}/article/${articleId}#comments`,
      headline: articleTitle,
      url: `${SITE_URL}/article/${articleId}`,
      interactionStatistic: {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: comments.length,
      },
      comment: comments.map((c) => ({
        "@type": "Comment",
        "@id": `${SITE_URL}/comment/${c.id}`,
        text: c.body,
        dateCreated: safeIsoDate(c.at),
        author: {
          "@type": "Person",
          name: c.name,
        },
      })),
    };
  }, [articleId, articleTitle, comments]);

  // Disabled State View
  if (!enabled) {
    return (
      <div
        className="mt-10 p-4 rounded-2xl bg-muted/30 border border-border flex items-center justify-between text-xs sm:text-sm text-muted-foreground select-none font-sans"
        dir={dir}
        style={{ fontFamily: sansFont(lang) }}
      >
        <div className="flex items-center gap-2">
          <MessageSquareOff size={18} aria-hidden="true" className="shrink-0 text-muted-foreground" />
          <span>{getLabel("disabled", lang)}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
          <Lock size={12} />
          <span>Comments Closed</span>
        </div>
      </div>
    );
  }

  return (
    <section
      className="mt-10 pt-8 border-t border-border select-none font-sans space-y-6"
      dir={dir}
      aria-labelledby="comments-heading"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(commentsSchema) }}
      />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <h2
          id="comments-heading"
          className="flex items-center gap-2 text-base sm:text-lg font-black text-foreground"
          style={{ fontFamily: serifFont(lang) }}
        >
          <MessageSquare size={20} aria-hidden="true" className="shrink-0 text-primary" />
          <span>
            {getLabel("heading", lang)} ({comments.length})
          </span>
        </h2>

        <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
          <ShieldCheck size={12} />
          <span>{getLabel("verified", lang)}</span>
        </div>
      </div>

      {/* Comment Input Form */}
      <form
        onSubmit={submit}
        className="space-y-3 bg-card border border-border p-4 sm:p-5 rounded-3xl shadow-xs"
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
            className="w-full text-xs sm:text-sm px-3.5 py-3 rounded-2xl border border-border bg-muted/20 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ltr:text-left rtl:text-right disabled:opacity-50 min-h-[48px] touch-manipulation"
          />
        </div>

        {/* Anti-Spam Honeypot Field */}
        <input
          type="text"
          name="website_url_trap"
          value={botTrap}
          onChange={(e) => setBotTrap(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute -left-[9999px] w-px h-px opacity-0 pointer-events-none"
        />

        <div className="space-y-2">
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
            className="w-full text-xs sm:text-sm p-3.5 rounded-2xl border border-border bg-muted/20 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none transition-all ltr:text-left rtl:text-right disabled:opacity-50 min-h-[90px] touch-manipulation"
            required
          />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-mono">
                {body.length}/1000 {getLabel("charCount", lang)}
              </span>
              <div aria-live="polite" className="min-h-[16px]">
                {err && (
                  <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    <span>{err}</span>
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !body.trim()}
              aria-label={getLabel("submit", lang)}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-2xl text-xs sm:text-sm font-bold hover:opacity-90 active:scale-95 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-50 disabled:pointer-events-none touch-manipulation min-h-[48px] cursor-pointer shadow-xs"
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

      {/* Sponsored Section */}
      <div className="w-full bg-card border border-border rounded-2xl p-3 text-center overflow-hidden shadow-xs">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1 px-1 font-mono">
          <span className="flex items-center gap-1 text-primary font-bold">
            <Sparkles size={11} />
            <span>{getLabel("adLabel", lang)}</span>
          </span>
          <span>Google AdSense</span>
        </div>
        <div className="min-h-[60px] flex items-center justify-center bg-muted/20 rounded-xl border border-dashed border-border">
          <ins
            className="adsbygoogle"
            style={{ display: "block", width: "100%", minHeight: "60px" }}
            data-ad-client={ADSENSE_CLIENT_ID}
            data-ad-slot="5544332211"
            data-ad-format="horizontal"
            data-full-width-responsive="true"
          />
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-3" role="feed" aria-busy={isLoading || isSubmitting}>
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        )}

        {!isLoading && comments.length === 0 && (
          <div className="text-center py-8 bg-card border border-dashed border-border rounded-3xl p-6">
            <MessageSquare size={32} className="mx-auto text-muted-foreground/40 mb-2" />
            <p
              className="text-xs sm:text-sm text-muted-foreground leading-relaxed"
              style={{ fontFamily: sansFont(lang) }}
            >
              {getLabel("empty", lang)}
            </p>
          </div>
        )}

        {!isLoading &&
          comments.map((c) => {
            const authorInitial = Array.from(c.name.trim())[0] || "?";

            return (
              <article
                key={c.id}
                className="group relative flex gap-3 p-4 sm:p-5 rounded-3xl border border-border bg-card hover:border-primary/40 transition-all shadow-xs"
              >
                <div className="shrink-0">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-sm font-black uppercase select-none shadow-xs">
                    {authorInitial}
                  </div>
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <header className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs sm:text-sm font-bold text-foreground truncate"
                        style={{ fontFamily: sansFont(lang) }}
                      >
                        {c.name}
                      </span>

                      {(isStaff || canManageUsers) && (
                        <span className="text-[9px] font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <UserCheck size={10} />
                          <span>{getLabel("staffBadge", lang)}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <time
                        dateTime={safeIsoDate(c.at)}
                        className="text-[10px] sm:text-[11px] text-muted-foreground font-mono"
                      >
                        {c.at}
                      </time>

                      {(isStaff || canManageUsers) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(c.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title={getLabel("delete", lang)}
                          aria-label={getLabel("delete", lang)}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </header>

                  <p
                    className="text-xs sm:text-sm text-foreground/90 leading-relaxed break-words"
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