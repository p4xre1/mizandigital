import { useState } from "react";
import { Share2, Link2, Check } from "lucide-react";
import { useI18n, sansFont } from "../lib/i18n";
import { SHARE_TARGETS, withUtm } from "../lib/referral";
import { trackEvent } from "../lib/analytics";

const LABELS = {
  share: { ar: "مشاركة", fr: "Partager", en: "Share", es: "Compartir" },
  copy: { ar: "نسخ الرابط", fr: "Copier le lien", en: "Copy Link", es: "Copiar enlace" },
  copied: { ar: "تم النسخ!", fr: "Copié !", en: "Copied!", es: "¡Copiado!" },
} as const;

/** Share buttons. Each target gets a UTM-tagged link so inbound clicks are
 *  attributed back to the source in the admin traffic report. */
export default function ShareBar({ url, title, campaign }: { url: string; title: string; campaign: string }) {
  const { lang } = useI18n();
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(withUtm(url, "copy_link", campaign));
    setCopied(true);
    trackEvent("share", { method: "copy_link", campaign });
    setTimeout(() => setCopied(false), 2000);
  };

  const open = (key: string, href: string) => {
    trackEvent("share", { method: key, campaign });
    window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4" style={{ fontFamily: sansFont(lang) }}>
      <h4 className="flex items-center gap-1.5 text-xs font-bold text-foreground mb-3">
        <Share2 size={13} />{LABELS.share[lang]}
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {SHARE_TARGETS.map(t => (
          <button key={t.key} onClick={() => open(t.key, t.build(withUtm(url, t.key, campaign), title))}
            className="text-xs py-2 rounded-lg border border-border text-foreground/80 hover:border-primary hover:text-primary transition-colors">
            {t.label}
          </button>
        ))}
      </div>
      <button onClick={copy}
        className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
        {copied ? <Check size={13} /> : <Link2 size={13} />}{copied ? LABELS.copied[lang] : LABELS.copy[lang]}
      </button>
    </div>
  );
}
