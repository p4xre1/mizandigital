-- 20260921000000_payments_and_credits.sql
-- نظام المدفوعات والكريدتس — Monetization
-- يدعم شراء حزم الكريدتس، تتبع المدفوعات، وسجل المعاملات

BEGIN;

-- حزم الكريدتس المتاحة للشراء
CREATE TABLE IF NOT EXISTS "public"."credit_packages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "description" text NULL,
  "credits" integer NOT NULL CHECK (credits > 0 AND credits <= 100000),
  "price_mad" numeric(10,2) NOT NULL CHECK (price_mad >= 0),
  "price_usd" numeric(10,2) NULL CHECK (price_usd IS NULL OR price_usd >= 0),
  "bonus_credits" integer NOT NULL DEFAULT 0 CHECK (bonus_credits >= 0),
  "is_popular" boolean NOT NULL DEFAULT false,
  "is_active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE "public"."credit_packages" OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."set_credit_packages_updated_at"()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN NEW.updated_at := timezone('utc'::text, now()); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS "set_credit_packages_updated_at" ON "public"."credit_packages";
CREATE TRIGGER "set_credit_packages_updated_at" BEFORE UPDATE ON "public"."credit_packages" FOR EACH ROW EXECUTE FUNCTION "public"."set_credit_packages_updated_at"();

-- جدول المدفوعات
CREATE TABLE IF NOT EXISTS "public"."payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_ref" text NULL, -- Clerk user_xxx أو Supabase uuid
  "clerk_user_id" text NULL,
  "package_id" uuid NULL REFERENCES "public"."credit_packages"("id") ON DELETE SET NULL,
  "amount_mad" numeric(10,2) NOT NULL CHECK (amount_mad >= 0),
  "amount_usd" numeric(10,2) NULL,
  "credits_purchased" integer NOT NULL CHECK (credits_purchased > 0),
  "bonus_credits" integer NOT NULL DEFAULT 0,
  "provider" text NOT NULL DEFAULT 'manual' CHECK (provider IN ('manual','stripe','paypal','mopay','wafacash','cmi','other')),
  "provider_payment_id" text NULL,
  "status" text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded','cancelled')),
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "completed_at" timestamp with time zone NULL
);

ALTER TABLE "public"."payments" OWNER TO "postgres";
CREATE INDEX IF NOT EXISTS "payments_user_ref_idx" ON "public"."payments" USING btree ("user_ref");
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "public"."payments" USING btree ("status");
CREATE INDEX IF NOT EXISTS "payments_created_at_idx" ON "public"."payments" USING btree ("created_at" DESC);

-- سجل معاملات الكريدتس (ledger) — كل زيادة أو نقصان موثق
CREATE TABLE IF NOT EXISTS "public"."credit_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_ref" text NOT NULL,
  "clerk_user_id" text NULL,
  "type" text NOT NULL CHECK (type IN ('earn','spend','purchase','refund','bonus','admin_grant','admin_revoke')),
  "amount" integer NOT NULL CHECK (amount != 0),
  "balance_after" integer NULL,
  "reason" text NULL,
  "reference_id" text NULL, -- معرف العملية المرتبطة (attempt_id, payment_id, إلخ)
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE "public"."credit_transactions" OWNER TO "postgres";
CREATE INDEX IF NOT EXISTS "credit_transactions_user_ref_idx" ON "public"."credit_transactions" USING btree ("user_ref");
CREATE INDEX IF NOT EXISTS "credit_transactions_type_idx" ON "public"."credit_transactions" USING btree ("type");
CREATE INDEX IF NOT EXISTS "credit_transactions_created_at_idx" ON "public"."credit_transactions" USING btree ("created_at" DESC);

-- RLS
ALTER TABLE "public"."credit_packages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."credit_transactions" ENABLE ROW LEVEL SECURITY;

-- Packages: قراءة عامة للحزم النشطة، كتابة للإدارة فقط
DROP POLICY IF EXISTS "credit_packages_public_read" ON "public"."credit_packages";
CREATE POLICY "credit_packages_public_read" ON "public"."credit_packages" FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "credit_packages_admin_write" ON "public"."credit_packages";
CREATE POLICY "credit_packages_admin_write" ON "public"."credit_packages" FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Payments: المستخدم يرى مدفوعاته فقط، الإدارة ترى الكل
DROP POLICY IF EXISTS "payments_user_read" ON "public"."payments";
CREATE POLICY "payments_user_read" ON "public"."payments" FOR SELECT TO authenticated USING (user_ref = (SELECT auth.uid())::text OR clerk_user_id = (SELECT auth.jwt())::jsonb->>'sub' OR public.is_admin());

DROP POLICY IF EXISTS "payments_admin_write" ON "public"."payments";
CREATE POLICY "payments_admin_write" ON "public"."payments" FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- لا يمكن للمستخدم إنشاء payment مباشرة إلا عبر RPC
DROP POLICY IF EXISTS "payments_no_direct_insert" ON "public"."payments";
CREATE POLICY "payments_no_direct_insert" ON "public"."payments" FOR INSERT TO anon, authenticated WITH CHECK (false);

-- Transactions: المستخدم يرى معاملاته، الإدارة ترى الكل
DROP POLICY IF EXISTS "credit_transactions_user_read" ON "public"."credit_transactions";
CREATE POLICY "credit_transactions_user_read" ON "public"."credit_transactions" FOR SELECT USING (true); -- مؤقتاً عامة للعرض، سيتم تقييدها لاحقاً حسب الحاجة

DROP POLICY IF EXISTS "credit_transactions_admin_write" ON "public"."credit_transactions";
CREATE POLICY "credit_transactions_admin_write" ON "public"."credit_transactions" FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- دالة لإنشاء عملية شراء (يستدعيها الـ Edge Function بعد تأكيد الدفع)
CREATE OR REPLACE FUNCTION "public"."complete_payment_and_grant_credits"(
  p_payment_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment record;
BEGIN
  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id AND status = 'pending' LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found or not pending';
  END IF;

  -- تحديث حالة الدفع
  UPDATE public.payments SET status = 'completed', completed_at = timezone('utc'::text, now()) WHERE id = p_payment_id;

  -- إدراج معاملة الكريدتس
  INSERT INTO public.credit_transactions (user_ref, clerk_user_id, type, amount, reason, reference_id, metadata)
  VALUES (
    v_payment.user_ref,
    v_payment.clerk_user_id,
    'purchase',
    v_payment.credits_purchased + v_payment.bonus_credits,
    'شراء حزمة ' || COALESCE(v_payment.package_id::text,''),
    v_payment.id::text,
    jsonb_build_object('package_id', v_payment.package_id, 'amount_mad', v_payment.amount_mad)
  );

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION "public"."complete_payment_and_grant_credits"(uuid) TO authenticated;

-- بذور أولية لحزم الكريدتس
INSERT INTO "public"."credit_packages" (slug, title, description, credits, price_mad, bonus_credits, is_popular, sort_order)
VALUES
  ('starter', 'الباقة التجريبية', 'لتجاوز اختبار تحديد المستوى وفتح المزايا الأساسية', 100, 19.00, 0, false, 1),
  ('student', 'باقة الطالب', 'الأكثر مبيعاً — تكفي لشهر كامل من التدريب المكثف', 350, 49.00, 50, true, 2),
  ('pro', 'باقة المحترف', 'للمقبلين على المباريات — نقاط كافية لكل المسارات', 800, 99.00, 150, false, 3),
  ('elite', 'باقة النخبة', 'للمدربين والأساتذة — دعم المنصة والوصول الكامل', 2000, 199.00, 500, false, 4)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
