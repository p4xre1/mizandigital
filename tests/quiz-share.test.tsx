import React from "react"
import { renderToString } from "react-dom/server"
import { test, expect, describe } from "vitest"
import {
  buildLinkedInShareUrl,
  buildProfileShare,
  buildShareText,
  buildWhatsAppShareUrl,
  copyToClipboard,
  downloadBlob,
  openExternalShare,
  type ShareCardInput,
} from "../src/lib/quiz/shareCard"
import { ShareDialog } from "../src/components/quiz/ShareDialog"

const input: ShareCardInput = {
  title: "القانون المدني — S2",
  score: 80,
  correct: 8,
  total: 10,
  rank: "B",
  username: "abdo_law",
  xpEarned: 95,
}

describe("روابط المشاركة", () => {
  test("نص المشاركة يحتوي النتيجة والرتبة ورابط البروفايل", () => {
    const text = buildShareText(input)
    expect(text).toContain("8 من 10")
    expect(text).toContain("80 من 100")
    expect(text).toContain("رتبتي الحالية: B")
    expect(text).toContain("القانون المدني — S2")
    expect(text).toContain("https://www.mizan.page/u/abdo_law")
    // لا نسبة مئوية خام تتسبب في تشفير مزدوج عند encodeURIComponent
    expect(text).not.toContain("%80")
  })

  test("رابط واتساب يستخدم api.whatsapp.com ويشفر النص", () => {
    const url = buildWhatsAppShareUrl(input)
    expect(url.startsWith("https://api.whatsapp.com/send?text=")).toBe(true)
    expect(url).not.toContain("%25") // لا تشفير مزدوج
    expect(decodeURIComponent(url.split("text=")[1])).toContain("ميزان الرقمية")
  })

  test("رابط لينكد إن يستخدم نقطة النهاية الرسمية للمشاركة", () => {
    expect(buildLinkedInShareUrl()).toContain("linkedin.com/sharing/share-offsite/")
    expect(buildLinkedInShareUrl("https://www.mizan.page/u/abdo_law")).toContain(
      encodeURIComponent("https://www.mizan.page/u/abdo_law")
    )
  })

  test("مشاركة البروفايل لا تحتوي نتيجة اختبار (لا %0)", () => {
    const share = buildProfileShare({ displayName: "عبد الرحمن", username: "abdo_law", rank: "A" })
    expect(share.url).toBe("https://www.mizan.page/u/abdo_law")
    expect(share.text).toContain("عبد الرحمن")
    expect(share.text).not.toContain("%0")
    expect(share.text).not.toContain("من 100")
    expect(share.whatsappUrl).toContain("api.whatsapp.com/send?text=")
    expect(share.linkedinUrl).toContain("share-offsite")
  })
})

describe("بدائل المشاركة عند الحجب", () => {
  test("فتح نافذة خارجية يبلغ عن الحجب بدل أن يفشل بصمت", () => {
    // بيئة الاختبار بلا window → يجب أن ترجع "blocked" بلا استثناء
    expect(openExternalShare("https://example.com")).toBe("blocked")
  })

  test("النسخ والتنزيل يرجعان false/blocked بلا استثناء في بيئة بلا DOM", async () => {
    expect(await copyToClipboard("نص")).toBe(false)
    expect(downloadBlob(new Blob(["x"]), "x.png")).toBe("blocked")
  })
})

describe("نافذة المشاركة", () => {
  test("تُصاغ بلا أخطاء وتحتوي خيارات المشاركة والنسخ", () => {
    const html = renderToString(<ShareDialog open onClose={() => {}} input={input} />)
    expect(html).toContain("شارك نتيجتك")
    expect(html).toContain("واتساب")
    expect(html).toContain("لينكد إن")
    expect(html).toContain("تحميل الصورة")
    expect(html).toContain("نسخ النص")
    expect(html).toContain("https://www.mizan.page/u/abdo_law")
  })

  test("لا تُصاغ شيئاً حين تكون مغلقة", () => {
    expect(renderToString(<ShareDialog open={false} onClose={() => {}} input={input} />)).toBe("")
  })
})
