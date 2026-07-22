"use client";

import { useRef, useEffect, useState, ReactNode } from "react";
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

interface Props {
  value: string;
  onChange: (html: string) => void;
  dir: "rtl" | "ltr";
}

type PromptType = "link" | "image" | "video" | null;

export default function RichTextEditor({ value, onChange, dir }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [showColor, setShowColor] = useState(false);

  // Custom Inline Prompt State for Mobile (replaces blocking native window.prompt)
  const [promptType, setPromptType] = useState<PromptType>(null);
  const [promptUrl, setPromptUrl] = useState("");

  // Load initial value once
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = sanitizeHtml(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => {
    if (ref.current) onChange(sanitizeHtml(ref.current.innerHTML));
  };

  const exec = (cmd: string, val?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, val);
    emit();
  };

  const handlePromptSubmit = () => {
    if (!promptUrl.trim()) {
      setPromptType(null);
      return;
    }

    const url = promptUrl.trim();

    if (promptType === "link") {
      if (url.startsWith("https://") || url.startsWith("http://")) {
        exec("createLink", url);
      }
    } else if (promptType === "image") {
      if (url.startsWith("https://") || url.startsWith("http://")) {
        exec("insertImage", url);
      }
    } else if (promptType === "video") {
      const embed = toEmbedUrl(url);
      if (embed) {
        ref.current?.focus();
        document.execCommand(
          "insertHTML",
          false,
          `<figure className="my-2"><iframe src="${embed}" width="100%" height="240" allowfullscreen title="video"></iframe></figure><p><br/></p>`
        );
        emit();
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
      className="p-2 sm:p-2.5 rounded-lg text-foreground/80 hover:bg-muted hover:text-primary active:scale-90 transition-transform touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center shrink-0 cursor-pointer"
    >
      {children}
    </button>
  );

  const Sep = () => (
    <span className="w-px h-5 bg-border/60 mx-0.5 shrink-0 self-center" />
  );

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all shadow-xs">
      {/* Mobile-Optimized Scrollable Toolbar */}
      <div className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-border">
        <div
          className="flex items-center gap-0.5 p-1.5 overflow-x-auto whitespace-nowrap scrollbar-none touch-manipulation select-none"
          dir="ltr"
        >
          <select
            onChange={(e) => exec("fontName", e.target.value)}
            title="Font"
            aria-label="Select Font"
            className="text-xs border border-border rounded-lg px-2 py-1.5 bg-card outline-none max-w-[110px] sm:max-w-[130px] shrink-0 font-medium"
          >
            <option value="">Font</option>
            {FONTS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <select
            onChange={(e) => exec("fontSize", e.target.value)}
            title="Size"
            aria-label="Select Font Size"
            className="text-xs border border-border rounded-lg px-2 py-1.5 bg-card outline-none shrink-0 font-medium"
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
            <Bold size={16} />
          </Btn>
          <Btn onClick={() => exec("italic")} title="Italic">
            <Italic size={16} />
          </Btn>
          <Btn onClick={() => exec("underline")} title="Underline">
            <Underline size={16} />
          </Btn>
          <Btn onClick={() => exec("strikeThrough")} title="Strikethrough">
            <Strikethrough size={16} />
          </Btn>
          <Btn
            onClick={() => exec("hiliteColor", "#fde68a")}
            title="Highlight"
          >
            <Highlighter size={16} />
          </Btn>

          {/* Quick Color Swatches Popover */}
          <div className="relative shrink-0">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowColor((v) => !v)}
              title="Text color"
              aria-label="Text color picker"
              className="p-2 sm:p-2.5 rounded-lg text-foreground/80 hover:bg-muted active:scale-90 transition-transform touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
            >
              <span className="w-4 h-4 rounded-full bg-gradient-to-br from-red-500 via-green-500 to-blue-500 block shadow-xs" />
            </button>

            {showColor && (
              <div className="absolute top-10 left-0 z-20 bg-card border border-border p-2 rounded-xl shadow-xl flex items-center gap-1.5 animate-in fade-in zoom-in-95">
                {QUICK_COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => {
                      exec("foreColor", col);
                      setShowColor(false);
                    }}
                    className="w-6 h-6 rounded-full border border-black/10 active:scale-90 transition-transform cursor-pointer"
                    style={{ backgroundColor: col }}
                    aria-label={`Color ${col}`}
                  />
                ))}
              </div>
            )}
          </div>

          <Sep />

          <Btn onClick={() => exec("formatBlock", "<h2>")} title="Heading 2">
            <Heading2 size={16} />
          </Btn>
          <Btn onClick={() => exec("formatBlock", "<h3>")} title="Heading 3">
            <Heading3 size={16} />
          </Btn>
          <Btn onClick={() => exec("formatBlock", "<blockquote>")} title="Quote">
            <Quote size={16} />
          </Btn>
          <Btn onClick={() => exec("insertUnorderedList")} title="Bullet list">
            <List size={16} />
          </Btn>
          <Btn onClick={() => exec("insertOrderedList")} title="Numbered list">
            <ListOrdered size={16} />
          </Btn>

          <Sep />

          <Btn onClick={() => exec("justifyRight")} title="Align right">
            <AlignRight size={16} />
          </Btn>
          <Btn onClick={() => exec("justifyCenter")} title="Align center">
            <AlignCenter size={16} />
          </Btn>
          <Btn onClick={() => exec("justifyLeft")} title="Align left">
            <AlignLeft size={16} />
          </Btn>

          <Sep />

          {/* Trigger Inline Prompt Controls */}
          <Btn
            onClick={() => {
              setPromptType("link");
              setPromptUrl("");
            }}
            title="Insert link"
          >
            <Link2 size={16} />
          </Btn>
          <Btn
            onClick={() => {
              setPromptType("image");
              setPromptUrl("");
            }}
            title="Insert image"
          >
            <ImageIcon size={16} />
          </Btn>
          <Btn
            onClick={() => {
              setPromptType("video");
              setPromptUrl("");
            }}
            title="Embed video"
          >
            <Video size={16} />
          </Btn>

          <Sep />

          <Btn onClick={() => exec("removeFormat")} title="Clear formatting">
            <Eraser size={16} />
          </Btn>
          <Btn onClick={() => exec("undo")} title="Undo">
            <Undo size={16} />
          </Btn>
          <Btn onClick={() => exec("redo")} title="Redo">
            <Redo size={16} />
          </Btn>
        </div>

        {/* Mobile Fast Action URL Input Bar */}
        {promptType && (
          <div className="p-2 bg-slate-100 dark:bg-slate-800 border-t border-border flex items-center gap-2 animate-in slide-in-from-top-1">
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
              className="flex-1 text-xs px-3 py-2 rounded-lg border border-border bg-card outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            <button
              type="button"
              onClick={handlePromptSubmit}
              className="p-2 rounded-lg bg-blue-600 text-white active:scale-95 transition-transform"
              title="Apply"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              onClick={() => setPromptType(null)}
              className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-foreground active:scale-95 transition-transform"
              title="Cancel"
            >
              <X size={14} />
            </button>
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
        aria-label="Rich Text Editor Content"
        className="rte-content min-h-[220px] sm:min-h-[320px] max-h-[500px] overflow-y-auto p-3 sm:p-4 text-sm leading-relaxed text-foreground outline-none touch-manipulation"
        style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}
      />
    </div>
  );
}