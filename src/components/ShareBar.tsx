import { useState } from "react";
import { Share2, Check, Copy, Facebook, Twitter, Linkedin } from "lucide-react";
import { useI18n, sansFont } from "@/lib/i18n";

interface ShareBarProps {
  url: string;
  title: string;
  campaign?: string;
}

export default function ShareBar({ url, title }: ShareBarProps) {
  const { lang } = useI18n();
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is restricted
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
        <Share2 size={14} className="text-primary" />
        <span style={{ fontFamily: sansFont(lang) }}>
          {lang === "ar" ? "مشاركة المقال" : "Share Article"}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center p-2.5 rounded-lg border border-border hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 transition-colors"
          title="Facebook"
        >
          <Facebook size={16} />
        </a>
        <a
          href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center p-2.5 rounded-lg border border-border hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-500 transition-colors"
          title="X (Twitter)"
        >
          <Twitter size={16} />
        </a>
        <a
          href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center p-2.5 rounded-lg border border-border hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 transition-colors"
          title="LinkedIn"
        >
          <Linkedin size={16} />
        </a>
        <button
          onClick={handleCopy}
          className="flex items-center justify-center p-2.5 rounded-lg border border-border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={lang === "ar" ? "نسخ الرابط" : "Copy Link"}
        >
          {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
}