/**
 * Reads the first pages of a PDF as plain text, for the law-drop algorithm
 * (shared/laws/drop-publish.js). Law numbers, gazette numbers and publication
 * dates are normally printed on the first page of an official text.
 *
 * pdfjs-dist is loaded on demand, so the admin bundle does not pay for it
 * until a PDF is actually dropped. The worker loading follows the same
 * candidate list as PdfToMarkdownTool, because the packaged worker file name
 * changed between pdfjs-dist releases.
 */

const DEFAULT_MAX_PAGES = 2

async function loadWorkerSrc(): Promise<string> {
  const candidates = [
    () => import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    () => import("pdfjs-dist/build/pdf.worker.mjs?url"),
  ]
  for (const load of candidates) {
    try {
      const mod = (await load()) as { default?: string }
      if (mod.default) return mod.default
    } catch {
      // try the next candidate
    }
  }
  throw new Error("تعذّر تحميل ملف worker الخاص بـ pdfjs-dist")
}

interface TextItemLike {
  str?: string
  hasEOL?: boolean
  transform?: number[]
}

/** Rebuilds lines from text items: a change in vertical position starts a new line. */
function linesFromItems(items: TextItemLike[]): string {
  let out = ""
  let lastY: number | null = null
  for (const item of items) {
    if (typeof item.str !== "string") continue
    const y = Array.isArray(item.transform) ? Math.round(item.transform[5]) : null
    if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) out += "\n"
    else if (out && !out.endsWith("\n") && item.str) out += " "
    out += item.str
    if (item.hasEOL) out += "\n"
    if (y !== null) lastY = y
  }
  return out
}

/**
 * First pages of a PDF as text. Throws on unreadable files; callers should
 * catch and fall back to the file name alone.
 */
export async function extractFirstPagesText(file: File, maxPages = DEFAULT_MAX_PAGES): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist")
  pdfjsLib.GlobalWorkerOptions.workerSrc = await loadWorkerSrc()

  // destroy() belongs to the loading task in pdf.js, not to the document proxy.
  const loadingTask = pdfjsLib.getDocument({ data: await file.arrayBuffer() })
  try {
    const doc = await loadingTask.promise
    const pages = Math.min(doc.numPages, maxPages)
    let text = ""
    for (let i = 1; i <= pages; i += 1) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      text += linesFromItems(content.items as TextItemLike[]) + "\n"
    }
    return text
  } finally {
    await loadingTask.destroy()
  }
}
