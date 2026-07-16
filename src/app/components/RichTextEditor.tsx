import { useRef, useEffect, useState } from "react";
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, Quote,
  AlignRight, AlignCenter, AlignLeft, Link2, Image as ImageIcon, Video,
  Heading2, Heading3, Undo, Redo, Eraser, Highlighter,
} from "lucide-react";
import { sanitizeHtml, toEmbedUrl } from "../lib/security";

const FONTS = [
  { label: "Noto Serif Arabic", value: "'Noto Serif Arabic', serif" },
  { label: "Noto Sans Arabic", value: "'Noto Sans Arabic', sans-serif" },
  { label: "Playfair Display", value: "'Playfair Display', serif" },
  { label: "Inter", value: "'Inter', sans-serif" },
  { label: "JetBrains Mono", value: "'JetBrains Mono', monospace" },
];

const SIZES = [
  { label: "12", value: "2" }, { label: "14", value: "3" }, { label: "16", value: "4" },
  { label: "18", value: "5" }, { label: "24", value: "6" }, { label: "32", value: "7" },
];

interface Props {
  value: string;
  onChange: (html: string) => void;
  dir: "rtl" | "ltr";
}

export default function RichTextEditor({ value, onChange, dir }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [showColor, setShowColor] = useState(false);

  // Load initial value once (avoid clobbering caret on every keystroke).
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = sanitizeHtml(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => { if (ref.current) onChange(sanitizeHtml(ref.current.innerHTML)); };

  const exec = (cmd: string, val?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, val);
    emit();
  };

  const addLink = () => {
    const url = window.prompt("URL (https://...)");
    // Ensure the URL is basic-sanitized before insertion to prevent javascript: payloads
    if (url && (url.startsWith('https://') || url.startsWith('http://'))) exec("createLink", url);
  };
  
  const addImage = () => {
    const url = window.prompt("Image URL (https://... or upload elsewhere)");
    if (url && (url.startsWith('https://') || url.startsWith('http://'))) exec("insertImage", url);
  };
  
  const addVideo = () => {
    const url = window.prompt("YouTube / Vimeo / Dailymotion URL");
    if (!url) return;
    const embed = toEmbedUrl(url);
    if (!embed) { window.alert("Unsupported video URL"); return; }
    ref.current?.focus();
    document.execCommand("insertHTML", false,
      `<figure><iframe src="${embed}" width="100%" height="360" allowfullscreen title="video"></iframe></figure><p><br/></p>`);
    emit();
  };

  // Enterprise UI: Added aria-label and focus states for Web Accessibility (WCAG compliant)
  const Btn = ({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) => (
    <button type="button" onMouseDown={e => e.preventDefault()} onClick={onClick} title={title} aria-label={title}
      className="p-2 rounded-md text-foreground/70 hover:bg-muted hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary">
      {children}
    </button>
  );
  
  const Sep = () => <span className="w-px h-6 bg-border mx-0.5" />;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-border bg-muted/40" dir="ltr">
        <select onChange={e => exec("fontName", e.target.value)} title="Font" aria-label="Select Font"
          className="text-xs border border-border rounded-md px-1.5 py-1.5 bg-card outline-none max-w-[130px] focus:ring-2 focus:ring-primary">
          <option value="">Font</option>
          {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <select onChange={e => exec("fontSize", e.target.value)} title="Size" aria-label="Select Font Size"
          className="text-xs border border-border rounded-md px-1.5 py-1.5 bg-card outline-none focus:ring-2 focus:ring-primary">
          <option value="">Size</option>
          {SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <Sep />
        <Btn onClick={() => exec("bold")} title="Bold"><Bold size={15} /></Btn>
        <Btn onClick={() => exec("italic")} title="Italic"><Italic size={15} /></Btn>
        <Btn onClick={() => exec("underline")} title="Underline"><Underline size={15} /></Btn>
        <Btn onClick={() => exec("strikeThrough")} title="Strikethrough"><Strikethrough size={15} /></Btn>
        <Btn onClick={() => exec("hiliteColor", "#fde68a")} title="Highlight"><Highlighter size={15} /></Btn>
        <div className="relative">
          <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setShowColor(v => !v)} title="Text color" aria-label="Text color picker"
            className="p-2 rounded-md text-foreground/70 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary">
            <span className="w-4 h-4 rounded-sm bg-gradient-to-br from-red-500 via-green-500 to-blue-500 block" />
          </button>
          {showColor && (
            <input type="color" aria-label="Choose color" className="absolute top-9 left-0 z-10 cursor-pointer" onChange={e => { exec("foreColor", e.target.value); setShowColor(false); }} />
          )}
        </div>
        <Sep />
        <Btn onClick={() => exec("formatBlock", "<h2>")} title="Heading 2"><Heading2 size={15} /></Btn>
        <Btn onClick={() => exec("formatBlock", "<h3>")} title="Heading 3"><Heading3 size={15} /></Btn>
        <Btn onClick={() => exec("formatBlock", "<blockquote>")} title="Quote"><Quote size={15} /></Btn>
        <Btn onClick={() => exec("insertUnorderedList")} title="Bullet list"><List size={15} /></Btn>
        <Btn onClick={() => exec("insertOrderedList")} title="Numbered list"><ListOrdered size={15} /></Btn>
        <Sep />
        <Btn onClick={() => exec("justifyRight")} title="Align right"><AlignRight size={15} /></Btn>
        <Btn onClick={() => exec("justifyCenter")} title="Align center"><AlignCenter size={15} /></Btn>
        <Btn onClick={() => exec("justifyLeft")} title="Align left"><AlignLeft size={15} /></Btn>
        <Sep />
        <Btn onClick={addLink} title="Insert link"><Link2 size={15} /></Btn>
        <Btn onClick={addImage} title="Insert image"><ImageIcon size={15} /></Btn>
        <Btn onClick={addVideo} title="Embed video"><Video size={15} /></Btn>
        <Sep />
        <Btn onClick={() => exec("removeFormat")} title="Clear formatting"><Eraser size={15} /></Btn>
        <Btn onClick={() => exec("undo")} title="Undo"><Undo size={15} /></Btn>
        <Btn onClick={() => exec("redo")} title="Redo"><Redo size={15} /></Btn>
      </div>

      {/* Editable area */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        dir={dir}
        aria-label="Rich Text Editor Content"
        className="rte-content min-h-[320px] max-h-[520px] overflow-y-auto p-4 text-sm leading-relaxed text-foreground outline-none"
        style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}
      />
    </div>
  );
}