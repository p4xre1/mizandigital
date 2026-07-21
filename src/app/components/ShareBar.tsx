"use client";

import React, { useState, useEffect } from "react";
import { Share2, Link2, Check, Smartphone } from "lucide-react";
import { useI18n, sansFont } from "../lib/i18n";
import { SHARE_TARGETS, withUtm } from "../lib/referral";
import { trackEvent } from "../lib/analytics";

const LABELS = {
  share: { ar: "مشاركة", fr: "Partager", en: "Share", es: "Compartir" },
  nativeShare: {
    ar: "مشاركة عبر الهاتف",
    fr: "Partager via l'appareil",
    en: "Share via Device",
    es: "Compartir en el dispositivo",
  },
  copy: { ar: "نسخ الرابط", fr: "Copier le lien", en: "Copy Link", es: "Copiar enlace" },
  copied: { ar: "تم النسخ!", fr: "Copié !", en: "Copied!", es: "¡Copiado!" },
} as const;

/** Share buttons optimized for instant mobile interactions with native Web Share API support. */
export default function ShareBar({
  url,
  title,
  campaign,
}: {
  url: string;
  title: string;
  campaign: string;
}) {
  const { lang } = useI18n();
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  // Check Web Share API support on mount (iOS / Android phones)
  useEffect(() => {
    if (typeof navigator !== "undefined" && !!navigator.share) {
      setCanNativeShare(true);
    }
  }, []);

  const copy = async () => {
    const shareUrl = withUtm(url, "copy_link", campaign);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // Legacy fallback for older mobile browsers / webviews
        const textarea = document.createElement("textarea");
        textarea.value = shareUrl;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      trackEvent("share", { method: "copy_link", campaign });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text to clipboard:", err);
    }
  };

  const handleNativeShare = async () => {
    const shareUrl = withUtm(url, "native_share", campaign);
    try {
      await navigator.share({
        title: title,
        url: shareUrl,
      });
      trackEvent("share", { method: "native_share", campaign });
    } catch (err) {
      // User dismissed native share sheet
    }
  };

  const open = (key: string, href: string) => {
    trackEvent("share", { method: key, campaign });
    window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <section
      className="bg-card border border-border rounded-xl p-3.5 sm:p-4 select-none shadow-xs"
      style={{ fontFamily: sansFont(lang) }}
      aria-labelledby="share-heading"
    >
      <h4 id="share-heading" className="flex items-center gap-1.5 text-xs font-bold text-foreground mb-3">
        <Share2 size={14} aria-hidden="true" />
        {LABELS.share[lang]}
      </h4>

      {/* Primary Native Mobile Share Button (Appears automatically on phones) */}
      {canNativeShare && (
        <button
          type="button"
          onClick={handleNativeShare}
          className="w-full flex items-center justify-center gap-2 mb-2.5 min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-900 dark:bg-blue-600 text-white font-bold text-xs shadow-xs active:scale-[0.98] transition-transform touch-manipulation cursor-pointer"
        >
          <Smartphone size={15} aria-hidden="true" />
          <span>{LABELS.nativeShare[lang]}</span>
        </button>
      )}

      {/* Social Media Target Grid */}
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Social media sharing options">
        {SHARE_TARGETS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => open(t.key, t.build(withUtm(url, t.key, campaign), title))}
            aria-label={`${LABELS.share[lang]} on ${t.label}`}
            className="min-h-[44px] text-xs py-2.5 px-3 rounded-xl border border-border bg-card text-foreground/90 font-medium hover:border-primary hover:text-primary active:scale-[0.97] transition-all touch-manipulation flex items-center justify-center text-center cursor-pointer"
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Copy Link Action Button */}
      <div aria-live="polite" className="mt-2">
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? LABELS.copied[lang] : LABELS.copy[lang]}
          className="w-full min-h-[44px] flex items-center justify-center gap-1.5 text-xs py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-foreground font-bold hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] transition-all touch-manipulation cursor-pointer"
        >
          {copied ? (
            <Check size={14} className="text-green-600 dark:text-green-400" aria-hidden="true" />
          ) : (
            <Link2 size={14} aria-hidden="true" />
          )}
          <span>{copied ? LABELS.copied[lang] : LABELS.copy[lang]}</span>
        </button>
      </div>
    </section>
  );
}