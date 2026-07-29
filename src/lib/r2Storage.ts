// src/lib/r2Storage.ts
import { S3Client } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = "ee904e2761241bc2da27615d3c818b4f";

const r2Client = new S3Client({
  region: "auto",
  
  // ── 🎯 ENDPOINT LOCATION GOES HERE ─────────────────────────────────────────
  
  // 1️⃣ STANDARD ENDPOINT (Use this for your mizan-storage bucket):
  endpoint: `https://ee904e2761241bc2da27615d3c818b4f.r2.cloudflarestorage.com`,

  // 2️⃣ IF EU JURISDICTION (Only if created with strict EU jurisdiction):
   endpoint: `https://ee904e2761241bc2da27615d3c818b4f.eu.r2.cloudflarestorage.com`,

  // 3️⃣ IF FEDRAMP JURISDICTION:
  // endpoint: `https://${R2_ACCOUNT_ID}.fedramp.r2.cloudflarestorage.com`,

  credentials: {
    accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY,
  },
});