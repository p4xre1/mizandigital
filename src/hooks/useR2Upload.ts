import { useState } from "react";
import { storageService } from "../services/storageService";

export function useR2Upload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File, folder: string = "images") => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      const { uploadUrl, fileUrl, fileKey } = await storageService.getUploadUrl(file, folder);
      await storageService.uploadToPresignedUrl(uploadUrl, file, (pct) => setProgress(pct));
      return { fileUrl, fileKey };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, isUploading, progress, error };
}