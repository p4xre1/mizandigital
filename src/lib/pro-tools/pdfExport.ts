import type { Note } from './model';

const PAGE_WIDTH = 1240;
const PAGE_HEIGHT = 1754;
const MARGIN = 92;
const CONTENT_BOTTOM = 1570;
const TEXT_WIDTH = PAGE_WIDTH - MARGIN * 2;

/** Render Arabic text with the browser's shaping engine, then package each page as an image in a PDF. */
export function createResearchPdf(notes: Note[]): Blob {
  if (!notes.length) throw new Error('لا توجد ملاحظات لتصديرها.');

  const pages: HTMLCanvasElement[] = [];
  let canvas: HTMLCanvasElement;
  let context: CanvasRenderingContext2D;
  let y = 0;

  function newPage() {
    canvas = document.createElement('canvas');
    canvas.width = PAGE_WIDTH;
    canvas.height = PAGE_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('تعذر تجهيز صفحة PDF في هذا المتصفح.');
    context = ctx;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    context.direction = 'rtl';
    context.textAlign = 'right';
    context.fillStyle = '#172554';
    context.font = 'bold 42px Arial, sans-serif';
    context.fillText('ملف البحث القانوني', PAGE_WIDTH - MARGIN, 92);
    context.fillStyle = '#64748b';
    context.font = '24px Arial, sans-serif';
    context.fillText(`تاريخ التصدير: ${new Date().toLocaleDateString('ar-MA')}`, PAGE_WIDTH - MARGIN, 137);
    context.strokeStyle = '#cbd5e1';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(MARGIN, 166);
    context.lineTo(PAGE_WIDTH - MARGIN, 166);
    context.stroke();
    y = 220;
    pages.push(canvas);
  }

  function writeLine(line: string, font: string, color: string, lineHeight: number) {
    if (y + lineHeight > CONTENT_BOTTOM) newPage();
    context.font = font;
    context.fillStyle = color;
    context.fillText(line, PAGE_WIDTH - MARGIN, y, TEXT_WIDTH);
    y += lineHeight;
  }

  function writeParagraph(value: string, font: string, color: string, lineHeight: number) {
    for (const paragraph of value.replace(/\r/g, '').split('\n')) {
      if (!paragraph.trim()) {
        y += Math.round(lineHeight * 0.45);
        if (y > CONTENT_BOTTOM) newPage();
        continue;
      }
      let line = '';
      for (const word of paragraph.trim().split(/\s+/)) {
        const candidate = line ? `${line} ${word}` : word;
        context.font = font;
        if (line && context.measureText(candidate).width > TEXT_WIDTH) {
          writeLine(line, font, color, lineHeight);
          line = word;
        } else {
          line = candidate;
        }
      }
      if (line) writeLine(line, font, color, lineHeight);
    }
  }

  newPage();
  notes.forEach((note, index) => {
    if (index > 0) {
      y += 22;
      if (y > CONTENT_BOTTOM) newPage();
      context.strokeStyle = '#cbd5e1';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(MARGIN, y);
      context.lineTo(PAGE_WIDTH - MARGIN, y);
      context.stroke();
      y += 30;
    }
    writeParagraph(note.title || 'ملاحظة بلا عنوان', 'bold 34px Arial, sans-serif', '#0f172a', 48);
    y += 10;
    writeParagraph(note.body || 'لا توجد ملاحظات مكتوبة.', '28px Arial, sans-serif', '#1e293b', 43);
    y += 8;
    writeParagraph(`المرجع: ${note.citation?.trim() || 'غير محدد'}`, '26px Arial, sans-serif', '#475569', 40);
  });

  pages.forEach((page, index) => {
    const ctx = page.getContext('2d');
    if (!ctx) throw new Error('تعذر تجهيز تذييل صفحة PDF.');
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748b';
    ctx.font = '22px Arial, sans-serif';
    ctx.fillText(`${index + 1} / ${pages.length}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 48);
  });

  return packagePdf(pages);
}

function packagePdf(pages: HTMLCanvasElement[]): Blob {
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let byteLength = 0;
  const encoder = new TextEncoder();
  const append = (chunk: Uint8Array) => { chunks.push(chunk); byteLength += chunk.length; };
  const appendText = (text: string) => append(encoder.encode(text));
  const beginObject = (id: number) => { offsets[id] = byteLength; appendText(`${id} 0 obj\n`); };
  const endObject = () => appendText('endobj\n');
  const pageIds = pages.map((_, index) => 3 + index * 3);
  const objectCount = 2 + pages.length * 3;

  append(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
  beginObject(1);
  appendText('<< /Type /Catalog /Pages 2 0 R >>\n');
  endObject();
  beginObject(2);
  appendText(`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>\n`);
  endObject();

  pages.forEach((page, index) => {
    const pageId = pageIds[index];
    const contentId = pageId + 1;
    const imageId = pageId + 2;
    const jpegUrl = page.toDataURL('image/jpeg', 0.88);
    const encoded = jpegUrl.slice(jpegUrl.indexOf(',') + 1);
    const binary = atob(encoded);
    const jpeg = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) jpeg[i] = binary.charCodeAt(i);
    const stream = 'q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n';

    beginObject(pageId);
    appendText(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>\n`);
    endObject();
    beginObject(contentId);
    appendText(`<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}endstream\n`);
    endObject();
    beginObject(imageId);
    appendText(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
    append(jpeg);
    appendText('\nendstream\n');
    endObject();
  });

  const xrefOffset = byteLength;
  appendText(`xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`);
  for (let id = 1; id <= objectCount; id++) appendText(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  appendText(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const result = new Uint8Array(byteLength);
  let position = 0;
  for (const chunk of chunks) { result.set(chunk, position); position += chunk.length; }
  return new Blob([result.buffer], { type: 'application/pdf' });
}
