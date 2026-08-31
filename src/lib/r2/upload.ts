import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${import.meta.env.VITE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID || "",
    secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY || "",
  },
});

export const BUCKET_NAME = import.meta.env.VITE_R2_BUCKET_NAME || "mizan-cms-storage";
export const PUBLIC_DOMAIN = import.meta.env.VITE_R2_PUBLIC_DOMAIN || "";

export async function createPresignedUploadUrl(fileName: string, contentType: string, folder: string = "images") {
  const safeFolder = folder.replace(/^\/+|\/+$/g, "") || "images";
  const fileKey = `${safeFolder}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 900 });
  const fileUrl = `${PUBLIC_DOMAIN}/${fileKey}`;

  return { uploadUrl, fileUrl, fileKey };
}

export async function deleteFileFromR2(fileKey: string) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });
  return await r2Client.send(command);
}
