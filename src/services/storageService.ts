import { createPresignedUploadUrl, deleteFileFromR2 } from "../lib/r2/upload";

export const storageService = {
  async getUploadUrl(file: File) {
    return await createPresignedUploadUrl(file.name, file.type);
  },

  async uploadToPresignedUrl(uploadUrl: string, file: File, onProgress?: (pct: number) => void) {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", file.type);

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed with status ${xhr.status}`));
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(file);
    });
  },

  async deleteFile(fileKey: string) {
    return await deleteFileFromR2(fileKey);
  },
};