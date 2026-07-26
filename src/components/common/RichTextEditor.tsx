"use client";

import React, { useRef, useEffect, useState, ReactNode } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  AlignRight,
  AlignCenter,
  AlignLeft,
  Link2,
  Image as ImageIcon,
  Video,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Eraser,
  Highlighter,
  Check,
  X,
  ShieldCheck,
  Sparkles,
  Lock,
  FileEdit,
} from "lucide-react";
import { sanitizeHtml, toEmbedUrl } from "../../lib/security";

const FONTS = [
  { label: "Noto Serif Arabic", value: "'Noto Serif Arabic', serif" },
  { label: "Noto Sans Arabic", value: "'Noto Sans Arabic', sans-serif" },
  { label: "Playfair Display", value: "'Playfair Display', serif" },
  { label: "Inter", value: "'Inter', sans-serif" },
  { label: "JetBrains Mono", value: "'JetBrains Mono', monospace" },
];

const SIZES = [
  { label: "12", value: "2" },
  { label: "14", value: "3" },
  { label: "16", value: "4" },
  { label: "18", value: "5" },
  { label: "24", value: "6" },
  { label: "32", value: "7" },
];

const QUICK_COLORS = [
  "#000000",
  "#1e3a8a",
  "#047857",
  "#b91c1c",
  "#d97706",
  "#6b21a8",
];

// Legal & Academic Drafting Keywords for SEO Optimization
const DRAFTING_KEYWORDS = [
  "صياغة_المذكرات",
  "الاجتهاد_القضائي",
  "تحرير_قانوني",
  "Droit_Marocain",
  "Legal_Drafting",
];

interface Props {
  value: string;
  onChange: (html: string) => void;
  dir: "rtl" | "ltr";
}

type PromptType = "link" | "image" | "video" | null;

/**
 * Military-Grade Security: Validate URL protocols to prevent XSS (javascript: / data:)
 */
function isSafeHttpUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function RichTextEditor({ value, onChange, dir }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [showColor, setShowColor] = useState(false);

  // Custom Inline Prompt State for Mobile (replaces blocking native window.prompt)
  const [promptType, setPromptType] = useState<PromptType>(null);
  const [promptUrl, setPromptUrl] = useState("");
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);

  // AdSense Client ID resolution from environment variables
  const adsenseClientId =
    import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT_ID || "ca-pub-1749032173858747";

  // Safe Google AdSense Loader
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch (err) {
      console.warn("Google AdSense safely handled in RichTextEditor:", err);
    }
  }, []);

  // Load initial value once with DOMPurify sanitization
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = sanitizeHtml(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => {
    if (ref.current) {
      onChange(sanitizeHtml(ref.current.innerHTML));
    }
  };

  const exec = (cmd: string, val?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, val);
    emit();
  };

  const handlePromptSubmit = () => {
    setSecurityWarning(null);
    if (!promptUrl.trim()) {
      setPromptType(null);
      return;
    }

    const url = promptUrl.trim();

    if (!isSafeHttpUrl(url)) {
      setSecurityWarning("بروتوكول الرابط غير آمن. يرجى استخدام HTTP/HTTPS فقط.");
      return;
    }

    if (promptType === "link") {
      exec("createLink", url);
    } else if (promptType === "image") {
      exec("insertImage", url);
    } else if (promptType === "video") {
      const embed = toEmbedUrl(url);
      if (embed && isSafeHttpUrl(embed)) {
        ref.current?.focus();
        document.execCommand(
          "insertHTML",
          false,
          `<figure className="my-3"><iframe src="${embed}" width="100%" height="280" allowfullscreen title="embedded-video" className="rounded-2xl border border-slate-200 dark:border-slate-800"></iframe></figure><p><br/></p>`
        );
        emit();
      } else {
        setSecurityWarning("رابط الفيديو غير يدعم التضمين المباشر.");
        return;
      }
    }

    setPromptUrl("");
    setPromptType(null);
  };

  const Btn = ({
    onClick,
    title,
    children,
  }: {
    onClick: () => void;
    title: string;
    children: ReactNode;
  }) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      aria-label={title}
      className="p-2.5 rounded-xl text-foreground/80 hover:bg-muted hover:text-primary active:scale-90 transition-all touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 cursor-pointer"
    >
      {children}
    </button>
  );

  const Sep = () => (
    <span className="w-px h-6 bg-border/60 mx-1 shrink-0 self-center" />
  );

  return (
    <div className="border border-border rounded-3xl overflow-hidden bg-card focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all shadow-xs font-sans">
      {/* Editor Header & Security Indicator */}
      <div className="px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b border-border flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
        <div className="flex items-center gap-1.5 text-primary">
          <FileEdit size={14} />
          <span>محرر النصوص والأبحاث الأكاديمية</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">
          <ShieldCheck size={12} />
          <span>Sanitized Output</span>
        </div>
      </div>

      {/* Mobile-Optimized Touch-First Toolbar */}
      <div className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-border">
        <div
          className="flex items-center gap-1 p-2 overflow-x-auto whitespace-nowrap scrollbar-none touch-manipulation select-none"
          dir="ltr"
        >
          {/* Font Selector */}
          <select
            onChange={(e) => exec("fontName", e.target.value)}
            title="Font Family"
            aria-label="Select Font"
            className="text-xs border border-border rounded-xl px-2.5 py-2 bg-card outline-none max-w-[120px] sm:max-w-[140px] shrink-0 font-medium min-h-[44px]"
          >
            <option value="">Font</option>
            {FONTS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          {/* Font Size Selector */}
          <select
            onChange={(e) => exec("fontSize", e.target.value)}
            title="Font Size"
            aria-label="Select Font Size"
            className="text-xs border border-border rounded-xl px-2.5 py-2 bg-card outline-none shrink-0 font-medium min-h-[44px]"
          >
            <option value="">Size</option>
            {SIZES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <Sep />

          <Btn onClick={() => exec("bold")} title="Bold">
            <Bold size={18} />
          </Btn>
          <Btn onClick={() => exec("italic")} title="Italic">
            <Italic size={18} />
          </Btn>
          <Btn onClick={() => exec("underline")} title="Underline">
            <Underline size={18} />
          </Btn>
          <Btn onClick={() => exec("strikeThrough")} title="Strikethrough">
            <Strikethrough size={18} />
          </Btn>
          <Btn onClick={() => exec("hiliteColor", "#fde68a")} title="Highlight">
            <Highlighter size={18} />
          </Btn>

          {/* Quick Color Picker */}
          <div className="relative shrink-0">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowColor((v) => !v)}
              title="Text Color"
              aria-label="Text color picker"
              className="p-2.5 rounded-xl text-foreground/80 hover:bg-muted active:scale-90 transition-transform touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
            >
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-red-500 via-green-500 to-blue-500 block shadow-xs" />
            </button>

            {showColor && (
              <div className="absolute top-12 left-0 z-20 bg-card border border-border p-2 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in zoom-in-95">
                {QUICK_COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => {
                      exec("foreColor", col);
                      setShowColor(false);
                    }}
                    className="w-7 h-7 rounded-full border border-black/10 active:scale-90 transition-transform cursor-pointer"
                    style={{ backgroundColor: col }}
                    aria-label={`Color ${col}`}
                  />
                ))}
              </div>
            )}
          </div>

          <Sep />

          <Btn onClick={() => exec("formatBlock", "<h2>")} title="Heading 2">
            <Heading2 size={18} />
          </Btn>
          <Btn onClick={() => exec("formatBlock", "<h3>")} title="Heading 3">
            <Heading3 size={18} />
          </Btn>
          <Btn onClick={() => exec("formatBlock", "<blockquote>")} title="Quote">
            <Quote size={18} />
          </Btn>
          <Btn onClick={() => exec("insertUnorderedList")} title="Bullet List">
            <List size={18} />
          </Btn>
          <Btn onClick={() => exec("insertOrderedList")} title="Numbered List">
            <ListOrdered size={18} />
          </Btn>

          <Sep />

          <Btn onClick={() => exec("justifyRight")} title="Align Right">
            <AlignRight size={18} />
          </Btn>
          <Btn onClick={() => exec("justifyCenter")} title="Align Center">
            <AlignCenter size={18} />
          </Btn>
          <Btn onClick={() => exec("justifyLeft")} title="Align Left">
            <AlignLeft size={18} />
          </Btn>

          <Sep />

          {/* Trigger Inline Prompt Controls */}
          <Btn
            onClick={() => {
              setPromptType("link");
              setPromptUrl("");
              setSecurityWarning(null);
            }}
            title="Insert Link"
          >
            <Link2 size={18} />
          </Btn>
          <Btn
            onClick={() => {
              setPromptType("image");
              setPromptUrl("");
              setSecurityWarning(null);
            }}
            title="Insert Image"
          >
            <ImageIcon size={18} />
          </Btn>
          <Btn
            onClick={() => {
              setPromptType("video");
              setPromptUrl("");
              setSecurityWarning(null);
            }}
            title="Embed Video"
          >
            <Video size={18} />
          </Btn>

          <Sep />

          <Btn onClick={() => exec("removeFormat")} title="Clear Formatting">
            <Eraser size={18} />
          </Btn>
          <Btn onClick={() => exec("undo")} title="Undo">
            <Undo size={18} />
          </Btn>
          <Btn onClick={() => exec("redo")} title="Redo">
            <Redo size={18} />
          </Btn>
        </div>

        {/* Mobile Fast Action Security-Checked URL Input Bar */}
        {promptType && (
          <div className="p-3 bg-slate-100 dark:bg-slate-800/80 border-t border-border space-y-2 animate-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              <input
                type="url"
                placeholder={
                  promptType === "link"
                    ? "https://example.com"
                    : promptType === "image"
                    ? "Image URL (https://...)"
                    : "Video URL (YouTube/Vimeo)"
                }
                value={promptUrl}
                onChange={(e) => setPromptUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePromptSubmit()}
                className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-border bg-card outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                autoFocus
              />
              <button
                type="button"
                onClick={handlePromptSubmit}
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white active:scale-95 transition-transform flex items-center justify-center cursor-pointer"
                title="Apply"
              >
                <Check size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setPromptType(null);
                  setSecurityWarning(null);
                }}
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-foreground active:scale-95 transition-transform flex items-center justify-center cursor-pointer"
                title="Cancel"
              >
                <X size={16} />
              </button>
            </div>

            {securityWarning && (
              <p className="text-[11px] text-rose-500 font-semibold px-1">
                {securityWarning}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Editable Area */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        dir={dir}
        aria-label="Rich Text Content Editor"
        className="rte-content min-h-[240px] sm:min-h-[340px] max-h-[550px] overflow-y-auto p-4 text-sm leading-relaxed text-foreground outline-none touch-manipulation"
        style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}
      />

      {/* Footer SEO & Academic Writing Bar */}
      <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-border flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-amber-500" />
          <span className="font-semibold">وسوم التحرير الأكاديمي:</span>
          {DRAFTING_KEYWORDS.map((kw, i) => (
            <span key={i} className="bg-muted px-1.5 py-0.5 rounded font-mono">
              #{kw}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground">
          <Lock size={10} />
          <span>Strict XSS Protection Enabled</span>
        </div>
      </div>

      {/* Google AdSense Academic Tools Banner */}
      <div className="w-full bg-muted/20 border-t border-border p-2 text-center overflow-hidden">
        <div className="min-h-[60px] flex items-center justify-center">
          <ins
            className="adsbygoogle"
            style={{ display: "block", width: "100%", minHeight: "60px" }}
            data-ad-client={adsenseClientId}
            data-ad-slot="1122334455"
            data-ad-format="horizontal"
            data-full-width-responsive="true"
          />
        </div>
      </div>
    </div>
  );
}

export default RichTextEditor;