import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
// 1. تم تحديث الامتداد ليتوافق مع الملف الذي أصلحناه سابقاً
import * as kv from "./kv_store.ts"; 

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// 2. تنظيف المسافات الخفية وإصلاح إعدادات الـ CORS لتعمل بشكل صحيح مع موقعك
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-a14cca9e/health", (c) => {
  return c.json({ status: "ok" });
});

// 💡 ملاحظة: إذا كنت تريد استخدام الـ kv store لاحقاً لجلب البيانات للموقع، يمكنك إضافة المسارات هنا.

Deno.serve(app.fetch);