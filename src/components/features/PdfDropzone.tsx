import React, { useCallback } from "react"
import { UploadCloud, FileText, X } from "lucide-react"
import { useR2Upload } from "../../hooks/useR2Upload"
import { ProgressBar } from "../ui/ProgressBar"

export interface PdfDropzoneProps {
  file?: File | null
  onFileSelect?: (file: File | null) => void
  onUploadComplete?: (result: { fileUrl: string; fileKey: string }) => void
}

export const PdfDropzone: React.FC<PdfDropzoneProps> = ({
  file,
  onFileSelect,
  onUploadComplete,
}) => {
  const { upload, isUploading, progress, error } = useR2Upload()

  const handleProcessFile = useCallback(
    async (selectedFile: File | null) => {
      if (!selectedFile) return

      if (onFileSelect) {
        onFileSelect(selectedFile)
      }

      if (onUploadComplete) {
        try {
          const result = await upload(selectedFile)
          onUploadComplete(result)
        } catch {
          // Handled by hook
        }
      }
    },
    [onFileSelect, onUploadComplete, upload]
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null
    handleProcessFile(selected)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files?.[0] || null
    handleProcessFile(droppedFile)
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onFileSelect) {
      onFileSelect(null)
    }
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="relative border-2 border-dashed border-border rounded-xl p-5 text-center hover:border-primary transition bg-background/50"
    >
      <input
        type="file"
        accept="application/pdf,.doc,.docx"
        onChange={handleInputChange}
        disabled={isUploading}
        className="hidden"
        id="pdf-upload-input"
      />

      {file ? (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-card p-3 border border-border text-right">
          <div className="flex items-center gap-2 overflow-hidden">
            <FileText className="size-5 text-primary shrink-0" />
            <span className="text-xs font-semibold text-foreground truncate">
              {file.name}
            </span>
            <span className="text-[10px] text-muted-foreground shrink-0">
              ({(file.size / (1024 * 1024)).toFixed(2)} MB)
            </span>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-destructive transition"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <label htmlFor="pdf-upload-input" className="cursor-pointer block space-y-2">
          <UploadCloud className="size-8 mx-auto text-muted-foreground" />
          <p className="text-xs font-medium text-foreground">
            {isUploading ? "جاري الرفع..." : "انقر أو اسحب المستندات القانونية (PDF, DOCX)"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            يقبل المستندات والصيغ المعتمدة
          </p>
        </label>
      )}

      {isUploading && (
        <div className="mt-3">
          <ProgressBar progress={progress} label="جاري التحميل..." />
        </div>
      )}

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  )
}

export default PdfDropzone