// functions/_shared/r2sign.js
//
// توليد رابط موقّع (Presigned URL) للتخزين على Cloudflare R2 عبر AWS
// SigV4 يدوياً، بلا الاعتماد على @aws-sdk (الحزمة ثقيلة ولا تعمل بشكل
// موثوق في بيئة Cloudflare Pages Functions/Workers). كل شيء هنا مبني
// على Web Crypto API المتوفرة أصلاً فـ بيئة Workers.
//
// مرجع الخوارزمية: AWS Signature Version 4 — Query string (presigned URL).
// https://docs.aws.amazon.com/general/latest/gr/sigv4-query-string-auth.html
// R2 متوافق مع نفس البروتوكول (S3-compatible)، مع region = "auto".

const encoder = new TextEncoder()

async function sha256Hex(message) {
  const data = typeof message === "string" ? encoder.encode(message) : message
  const digest = await crypto.subtle.digest("SHA-256", data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

async function hmac(key, message) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    typeof key === "string" ? encoder.encode(key) : key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message)))
}

function toHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")
}

function amzDate(date) {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "")
  return { amzDate: iso, dateStamp: iso.slice(0, 8) }
}

/**
 * يبني رابط PUT موقّعاً مؤقتاً (presigned) لكتابة كائن واحد على R2.
 * لا يخرج أي سرّ من هذه الدالة — الرابط الناتج صالح فقط لمدة `expiresIn`
 * ثانية ولمسار الكائن المحدد.
 */
export async function presignR2PutUrl({
  accountId,
  accessKeyId,
  secretAccessKey,
  bucket,
  key,
  contentType,
  expiresIn = 900,
}) {
  const host = `${accountId}.r2.cloudflarestorage.com`
  const region = "auto"
  const service = "s3"
  const now = new Date()
  const { amzDate: xAmzDate, dateStamp } = amzDate(now)

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const canonicalUri = `/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`

  const queryParams = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKeyId}/${credentialScope}`,
    "X-Amz-Date": xAmzDate,
    "X-Amz-Expires": String(expiresIn),
    "X-Amz-SignedHeaders": "host",
  }

  const canonicalQueryString = Object.keys(queryParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
    .join("&")

  const canonicalHeaders = `host:${host}\n`
  const signedHeaders = "host"
  const payloadHash = "UNSIGNED-PAYLOAD"

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n")

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    xAmzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n")

  const kDate = await hmac(`AWS4${secretAccessKey}`, dateStamp)
  const kRegion = await hmac(kDate, region)
  const kService = await hmac(kRegion, service)
  const kSigning = await hmac(kService, "aws4_request")
  const signatureBytes = await hmac(kSigning, stringToSign)
  const signature = toHex(signatureBytes)

  const url = `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`
  return { url, contentType }
}

/** يحذف كائناً من R2 عبر طلب DELETE موقّع بنفس آلية SigV4 (بدون presigned URL — توقيع مباشر بترويسة Authorization). */
export async function deleteR2Object({ accountId, accessKeyId, secretAccessKey, bucket, key }) {
  const host = `${accountId}.r2.cloudflarestorage.com`
  const region = "auto"
  const service = "s3"
  const now = new Date()
  const { amzDate: xAmzDate, dateStamp } = amzDate(now)
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const canonicalUri = `/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`
  const payloadHash = await sha256Hex("")

  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${xAmzDate}\n`
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date"

  const canonicalRequest = ["DELETE", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n")
  const stringToSign = ["AWS4-HMAC-SHA256", xAmzDate, credentialScope, await sha256Hex(canonicalRequest)].join("\n")

  const kDate = await hmac(`AWS4${secretAccessKey}`, dateStamp)
  const kRegion = await hmac(kDate, region)
  const kService = await hmac(kRegion, service)
  const kSigning = await hmac(kService, "aws4_request")
  const signature = toHex(await hmac(kSigning, stringToSign))

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const response = await fetch(`https://${host}${canonicalUri}`, {
    method: "DELETE",
    headers: {
      host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": xAmzDate,
      Authorization: authorization,
    },
  })

  if (!response.ok && response.status !== 404) {
    throw new Error(`R2 delete failed with status ${response.status}`)
  }
}
