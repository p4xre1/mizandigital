import { useState } from "react";
import { Copy, Check, Bookmark, Share2 } from "lucide-react";
import { toast } from "sonner";

interface LegalArticle {
  id: string;
  num: number;
  titleAr: string;
  contentAr: string;
  contentFr?: string;
  codeName: string;
}

export function CodeReader({ article }: { article: LegalArticle }) {
  const [copied, setCopied] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const handleCopy = () => {
    const textToCopy = `المادة ${article.num} من ${article.codeName}:\n${article.contentAr}\n\nالمصدر: منصة ميزان الرقمية (${window.location.href})`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success("تم نسخ المادة بنجاح مع المصدر القانوني");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `الفصل ${article.num} - ${article.codeName}`,
          text: article.contentAr.slice(0, 100) + "...",
          url: window.location.href,
        });
      } catch (e) {
        console.error("Share failed", e);
      }
    } else {
      handleCopy();
    }
  };

  return (
    <article className="bg-card border border-border rounded-2xl p-5 shadow-sm text-right space-y-4 font-serif">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <span className="text-xs font-sans font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
          {article.codeName}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setBookmarked(!bookmarked)}
            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
            title="حفظ في المفضلة"
          >
            <Bookmark className={`w-4 h-4 ${bookmarked ? "fill-amber-500 text-amber-500" : ""}`} />
          </button>
          <button
            onClick={handleShare}
            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
            title="مشاركة المادة"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleCopy}
            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
            title="نسخ المادة"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Article Number Title */}
      <h2 className="text-xl font-bold text-foreground font-serif">
        الفصل {article.num}: {article.titleAr}
      </h2>

      {/* Main Arabic Content */}
      <p className="text-base md:text-lg leading-relaxed text-foreground/90 font-serif tracking-wide whitespace-pre-line">
        {article.contentAr}
      </p>

      {/* Optional French Legal Content */}
      {article.contentFr && (
        <div className="mt-4 pt-3 border-t border-border/40 text-left dir-ltr">
          <p className="text-xs font-mono text-muted-foreground mb-1">Version Française:</p>
          <p className="text-sm text-muted-foreground italic font-sans leading-relaxed">
            {article.contentFr}
          </p>
        </div>
      )}
    </article>
  );
}