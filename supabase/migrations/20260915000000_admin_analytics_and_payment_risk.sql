-- supabase/migrations/20260911050000_admin_analytics_and_payment_risk.sql
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ثلاثة أعمدة: إدارة المستخدمين · مراقبة الحصص · منع الاحتيال
-- ─────────────────────────────────────────────────────────────────────────────
--
-- ── قرار 1: الرتبة مشتقّة لا مخزّنة ────────────────────────────────────────
-- rank كلمة محجوزة في SQL (دالة النافذة RANK) فكل استعمال لها يحتاج تنصيصاً،
-- والأخطر: عمود مخزّن يحتاج trigger ليبقى متزامناً مع xp، وأي مسار كتابة ينسى
-- الـ trigger يُنتج رتبة كاذبة في لوحة التحكّم.
-- لذلك xp هو المخزّن، والرتبة تُحسب في get_user_rank(xp). لا يمكن أن تتقادم.
--
-- ── قرار 2: لا يوجد سجل استهلاك تاريخي ─────────────────────────────────────
-- daily_credits/bonus_credits كانت تُزاد في مكانها دون أي سجل (تحقّق: لا يوجد
-- جدول credit/usage/ledger في المخطط). لذلك credit_transactions يبدأ فارغاً
-- ولا يمكن تعبئته رجعياً. أي رقم "استهلاك أمس" قبل نشر هذه الهجرة = صفر، وهو
-- صفر صادق لا خطأ.
--
-- ── قرار 3: ما الذي نستطيع رصده فعلاً في الاحتيال؟ ─────────────────────────
-- الدفع يمر عبر صفحة Stripe مستضافة، ف Mizan لا يرى محاولات البطاقة أبداً.
-- عدد المحاولات الفاشلة لكل بطاقة/IP موجود لدى Stripe Radar
-- (declines_per_ip_hourly وأمثالها) وهو المكان الصحيح له.
-- ما نرصده نحن فعلاً:
--   أ) أحداث payment_intent.payment_failed القادمة عبر webhook (فيها
--      last_payment_error.decline_code).
--   ب) سرعة إنشاء جلسات Checkout عندنا — وهو سطح anti-carding الحقيقي
--      الذي نتحكّم فيه.
--   ج) تعارض بلد البطاقة (من Stripe) مع بلد IP (من CF-IPCountry مجاناً).
-- البناء على غير ذلك سيكون نظاماً وهمياً يعدّ أحداثاً لا تصله.

-- ============================================================================
-- 1) الرتبة والخبرة
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
                  WHERE t.typname='user_rank' AND n.nspname='public') THEN
    CREATE TYPE public.user_rank AS ENUM ('D','C','B','A','S','SS','SSS');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
                  WHERE t.typname='credit_direction' AND n.nspname='public') THEN
    CREATE TYPE public.credit_direction AS ENUM ('spend','earn','grant','revoke','expire');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
                  WHERE t.typname='risk_event_type' AND n.nspname='public') THEN
    CREATE TYPE public.risk_event_type AS ENUM (
      'payment_failed',        -- رفض من المُصدِر
      'checkout_velocity',     -- إنشاء جلسات دفع متكرر
      'geo_mismatch',          -- بلد البطاقة ≠ بلد IP
      'card_testing',          -- نمط اختبار بطاقات
      'manual_review'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
                  WHERE t.typname='lock_reason' AND n.nspname='public') THEN
    CREATE TYPE public.lock_reason AS ENUM (
      'payment_velocity', 'suspected_carding', 'geo_mismatch', 'manual', 'other'
    );
  END IF;
END $$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0
  CHECK (xp >= 0);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS security_locked_until timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS security_lock_reason public.lock_reason;

COMMENT ON COLUMN public.profiles.xp IS 'نقاط الخبرة. الرتبة مشتقّة منه عبر get_user_rank() ولا تُخزَّن.';

/**
 * عتبات الرتبة في مكان واحد. تغييرها هنا يغيّر كل اللوحات معاً.
 * immutable لأن الدالة تُستعمل داخل فهارس/استعلامات مكثّفة.
 */
CREATE OR REPLACE FUNCTION public.get_user_rank(p_xp integer)
RETURNS public.user_rank
LANGUAGE sql IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    -- العتبات مطابقة لـ src/lib/quiz/ranks.ts (مصدر الحقيقة المنشور).
    -- كانت مختلفة سابقاً (C=500/B=1500/A=4000/S=8000/SS=15000/SSS=30000) لأن
    -- هذه الدالة كُتبت دون رؤية ranks.ts، فكانت اللوحة ستعرض رتبة مخالفة
    -- لرتبة الواجهة لنفس عدد النقاط.
    WHEN coalesce(p_xp, 0) >= 4000 THEN 'SSS'::public.user_rank
    WHEN p_xp >= 2200 THEN 'SS'::public.user_rank
    WHEN p_xp >= 1200 THEN 'S'::public.user_rank
    WHEN p_xp >=  650 THEN 'A'::public.user_rank
    WHEN p_xp >=  300 THEN 'B'::public.user_rank
    WHEN p_xp >=  120 THEN 'C'::public.user_rank
    ELSE 'D'::public.user_rank
  END;
$$;

ALTER FUNCTION public.get_user_rank(integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_user_rank(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_rank(integer) TO authenticated;

/** XP المطلوب للرتبة التالية — لعرض شريط التقدّم في الواجهة. */
CREATE OR REPLACE FUNCTION public.get_next_rank_threshold(p_xp integer)
RETURNS integer
LANGUAGE sql IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN coalesce(p_xp,0) <   500 THEN   500
    WHEN p_xp <  1500 THEN  1500
    WHEN p_xp <  4000 THEN  4000
    WHEN p_xp <  8000 THEN  8000
    WHEN p_xp < 15000 THEN 15000
    WHEN p_xp < 30000 THEN 30000
    ELSE 30000            -- SSS: لا رتبة تالية
  END;
$$;

ALTER FUNCTION public.get_next_rank_threshold(integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_next_rank_threshold(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_next_rank_threshold(integer) TO authenticated;

-- ============================================================================
-- 2) سجل الرصيد (يبدأ فارغاً — انظر قرار 2 في الأعلى)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  direction    public.credit_direction NOT NULL,
  amount       integer NOT NULL CHECK (amount > 0),

  -- أي رصيد تأثّر: اليومي المجاني أم الممنوح/المشترى
  wallet       text NOT NULL DEFAULT 'daily' CHECK (wallet IN ('daily','bonus')),

  -- سبب الحركة — هو ما يجعل اللوحة قابلة للتفسير
  reason       text NOT NULL CHECK (char_length(reason) BETWEEN 2 AND 80),
  feature      text CHECK (feature IS NULL OR char_length(feature) BETWEEN 2 AND 60),

  -- الرصيد بعد الحركة. يُملأ من التطبيق؛ مفيد للتسوية.
  balance_after integer CHECK (balance_after IS NULL OR balance_after >= 0),

  created_at   timestamptz NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.credit_transactions IS
  'سجل حركات الرصيد. يبدأ فارغاً: الرصيد القديم كان يُزاد في مكانه بلا سجل، فلا يمكن تعبئته رجعياً.';

CREATE INDEX IF NOT EXISTS credit_transactions_user_created_idx
  ON public.credit_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS credit_transactions_created_idx
  ON public.credit_transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS credit_transactions_daily_idx
  ON public.credit_transactions (created_at, direction)
  WHERE direction = 'spend';

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- المالك يرى حركاته. الكتابة من الخادم فقط (service_role).
DROP POLICY IF EXISTS "owner reads own credit transactions" ON public.credit_transactions;
CREATE POLICY "owner reads own credit transactions"
  ON public.credit_transactions FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- 3) أحداث تحديد المعدل
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  visitor_id  text CHECK (visitor_id IS NULL OR char_length(visitor_id) BETWEEN 8 AND 128),

  bucket      text NOT NULL CHECK (char_length(bucket) BETWEEN 2 AND 60),
  ip_hash     text CHECK (ip_hash IS NULL OR char_length(ip_hash) = 64),

  denied      boolean NOT NULL DEFAULT false,
  limit_value integer CHECK (limit_value IS NULL OR limit_value > 0),
  is_pro      boolean NOT NULL DEFAULT false,

  created_at  timestamptz NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.rate_limit_events IS
  'متى اصطدم مستخدم بسقف. denied=true يعني أن الطلب رُفض فعلاً.';

CREATE INDEX IF NOT EXISTS rate_limit_events_created_idx
  ON public.rate_limit_events (created_at DESC);
CREATE INDEX IF NOT EXISTS rate_limit_events_denied_idx
  ON public.rate_limit_events (bucket, created_at DESC) WHERE denied;

ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;
-- لا سياسات ⇒ لا وصول للعميل. القراءة للمسؤول عبر RPC فقط.
REVOKE ALL ON public.rate_limit_events FROM anon, authenticated;

-- ============================================================================
-- 4) أحداث المخاطر وأقفال الأمان
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payment_risk_events (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  event_type    public.risk_event_type NOT NULL,

  -- معرّفات Stripe إن وُجدت
  stripe_customer_id     text CHECK (stripe_customer_id IS NULL OR char_length(stripe_customer_id) BETWEEN 5 AND 100),
  stripe_payment_intent_id text CHECK (stripe_payment_intent_id IS NULL OR char_length(stripe_payment_intent_id) BETWEEN 5 AND 150),

  -- كود الرفض من المُصدِر (do_not_honor, stolen_card, ...) — هو أقوى إشارة
  decline_code  text CHECK (decline_code IS NULL OR char_length(decline_code) BETWEEN 2 AND 60),

  -- تعارض جغرافي: بلد البطاقة من Stripe، وبلد IP من CF-IPCountry
  card_country  text CHECK (card_country IS NULL OR char_length(card_country) = 2),
  ip_country    text CHECK (ip_country IS NULL OR char_length(ip_country) = 2),

  -- لا IP خام (نفس نهج comments.client_ip_hash في SECURITY.md)
  ip_hash       text CHECK (ip_hash IS NULL OR char_length(ip_hash) = 64),

  risk_score    numeric(5,2) CHECK (risk_score IS NULL OR (risk_score >= 0 AND risk_score <= 100)),
  detail        jsonb,

  created_at    timestamptz NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.payment_risk_events IS
  'إشارات مخاطر الدفع التي نستطيع رصدها فعلاً. محاولات البطاقة نفسها تراها Stripe Radar لا نحن.';

CREATE INDEX IF NOT EXISTS payment_risk_events_user_created_idx
  ON public.payment_risk_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_risk_events_ip_created_idx
  ON public.payment_risk_events (ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_risk_events_type_created_idx
  ON public.payment_risk_events (event_type, created_at DESC);

ALTER TABLE public.payment_risk_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_risk_events FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.security_locks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason       public.lock_reason NOT NULL,
  triggered_by text NOT NULL DEFAULT 'system' CHECK (char_length(triggered_by) BETWEEN 2 AND 60),
  detail       jsonb,
  created_at   timestamptz NOT NULL DEFAULT timezone('utc', now()),
  expires_at   timestamptz NOT NULL,
  released_at  timestamptz,
  CONSTRAINT security_locks_window CHECK (expires_at > created_at)
);

COMMENT ON TABLE public.security_locks IS
  'أقفال الحساب. القفل الفعّال = expires_at في المستقبل و released_at فارغ.';

CREATE INDEX IF NOT EXISTS security_locks_active_idx
  ON public.security_locks (user_id, expires_at DESC) WHERE released_at IS NULL;

ALTER TABLE public.security_locks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.security_locks FROM anon, authenticated;

-- ============================================================================
-- 5) قفل الحساب عند تكرار فشل الدفع
-- ============================================================================
/**
 * يسجّل فشل دفع، ويقيّم السرعة، ويقفل الحساب إن تجاوزت الحدّ.
 *
-- ─ لماذا دالة واحدة ذرّية بدل منطق في JavaScript؟
--   الفحص-ثم-الكتابة من طرف العميل فيه سباق: طلبان متزامنان قد يمرّا معاً قبل
--   أن يرى أيٌّ منهما الآخر. داخل دالة PL/pgSQL واحدة، العدّ والقفل يريان
--   نفس اللقطة، فلا يتسرّب مهاجم بين الخطوتين.
 *
 * @param p_threshold عدد الإخفاقات الذي يُطلق القفل (افتراضي 3)
 * @param p_window    النافذة الزمنية (افتراضي 15 دقيقة)
 * @param p_lock_for  مدة القفل (افتراضي 6 ساعات)
 * @returns الجدول يعيد ما إذا تم القفل وسببه
 */
CREATE OR REPLACE FUNCTION public.record_payment_failure(
  p_user_id       uuid,
  p_decline_code  text        DEFAULT NULL,
  p_ip_hash       text        DEFAULT NULL,
  p_card_country  text        DEFAULT NULL,
  p_ip_country    text        DEFAULT NULL,
  p_intent_id     text        DEFAULT NULL,
  p_customer_id   text        DEFAULT NULL,
  p_threshold     integer     DEFAULT 3,
  p_window        interval    DEFAULT interval '15 minutes',
  p_lock_for      interval    DEFAULT interval '6 hours'
)
RETURNS TABLE (locked boolean, failure_count bigint, lock_until timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
declare
  v_count   bigint;
  v_locked  boolean := false;
  v_until   timestamptz := null;
  v_thresh  integer := greatest(coalesce(p_threshold, 3), 1);
begin
  -- 1) سجّل الحدث أولاً حتى لو لم يُطلق قفلاً — الرصد منفصل عن الإنفاذ
  INSERT INTO public.payment_risk_events (
    user_id, event_type, decline_code, ip_hash,
    card_country, ip_country, stripe_payment_intent_id, stripe_customer_id, detail
  ) VALUES (
    p_user_id, 'payment_failed', p_decline_code, p_ip_hash,
    p_card_country, p_ip_country, p_intent_id, p_customer_id,
    jsonb_build_object('threshold', v_thresh, 'window', p_window::text)
  );

  -- 2) تعارض جغرافي كإشارة مستقلة (لا يقفل وحده — يُراجَع)
  IF p_card_country IS NOT NULL AND p_ip_country IS NOT NULL
     AND upper(p_card_country) <> upper(p_ip_country) THEN
    INSERT INTO public.payment_risk_events (
      user_id, event_type, card_country, ip_country, ip_hash, detail
    ) VALUES (
      p_user_id, 'geo_mismatch', p_card_country, p_ip_country, p_ip_hash,
      jsonb_build_object('note', 'card issuing country differs from IP country')
    );
  END IF;

  -- 3) عدّ الإخفاقات داخل النافذة — حسب المستخدم أو حسب IP
  --    (OR لأن المهاجم قد يدوّر الحسابات على IP واحد)
  SELECT count(*) INTO v_count
    FROM public.payment_risk_events e
   WHERE e.event_type = 'payment_failed'
     AND e.created_at >= timezone('utc', now()) - coalesce(p_window, interval '15 minutes')
     AND (
       (p_user_id IS NOT NULL AND e.user_id = p_user_id)
       OR (p_ip_hash IS NOT NULL AND e.ip_hash = p_ip_hash)
     );

  -- 4) إن تجاوز الحدّ: قفل + سجل تدقيق
  IF v_count >= v_thresh THEN
    v_until := timezone('utc', now()) + coalesce(p_lock_for, interval '6 hours');
    v_locked := true;

    IF p_user_id IS NOT NULL THEN
      -- لا نكدّس أقفالاً متطابقة فعّالة.
      --
      -- النسخة الأولى كانت INSERT ... ON CONFLICT DO NOTHING، وهذا لا يعمل:
      -- security_locks ليس عليه قيد UNIQUE، فـ ON CONFLICT بلا هدف لا يلتقط
      -- شيئاً ويُدرج صفّاً جديداً في كل إخفاق يتجاوز الحدّ. الجدول كان يمتلئ
      -- واللوحة تعرض أقفالاً مكررة لنفس الحساب. الفحص الصريح هو الصحيح.
      IF NOT EXISTS (
        SELECT 1 FROM public.security_locks s
         WHERE s.user_id = p_user_id
           AND s.released_at IS NULL
           AND s.expires_at > timezone('utc', now())
      ) THEN
        INSERT INTO public.security_locks (user_id, reason, triggered_by, detail, expires_at)
        VALUES (p_user_id, 'payment_velocity', 'system',
                jsonb_build_object('failure_count', v_count, 'window', p_window::text),
                v_until);
      END IF;

      UPDATE public.profiles
         SET security_locked_until = v_until,
             security_lock_reason  = 'payment_velocity'
       WHERE id = p_user_id
         AND (security_locked_until IS NULL OR security_locked_until < timezone('utc', now()));
    END IF;

    -- audit_logs موجود أصلاً في المخطط
    INSERT INTO public.audit_logs (user_id, action, table_name, new_data, ip_address)
    VALUES (p_user_id, 'security_lock:payment_velocity', 'profiles',
            jsonb_build_object('failure_count', v_count, 'lock_until', v_until,
                               'decline_code', p_decline_code),
            NULL);
  END IF;

  RETURN QUERY SELECT v_locked, v_count, v_until;
end;
$$;

ALTER FUNCTION public.record_payment_failure(uuid, text, text, text, text, text, text, integer, interval, interval)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public.record_payment_failure(uuid, text, text, text, text, text, text, integer, interval, interval)
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.record_payment_failure IS
  'يسجّل فشل دفع ويقيّم السرعة ذرّياً. service_role فقط.';

/** هل الحساب مقفول الآن؟ تُستعمل في مسار الدفع قبل إنشاء أي جلسة. */
CREATE OR REPLACE FUNCTION public.is_account_locked(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
     WHERE p.id = p_user_id
       AND p.security_locked_until IS NOT NULL
       AND p.security_locked_until > timezone('utc', now())
  );
$$;

ALTER FUNCTION public.is_account_locked(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_account_locked(uuid) FROM PUBLIC, anon, authenticated;

/** فكّ قفل يدوياً (مسؤول). يُبقي السجل للتدقيق. */
CREATE OR REPLACE FUNCTION public.release_security_lock(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
begin
  UPDATE public.security_locks
     SET released_at = timezone('utc', now())
   WHERE user_id = p_user_id AND released_at IS NULL;

  UPDATE public.profiles
     SET security_locked_until = NULL, security_lock_reason = NULL
   WHERE id = p_user_id;

  INSERT INTO public.audit_logs (user_id, action, table_name, new_data)
  VALUES (p_user_id, 'security_lock:released', 'profiles',
          jsonb_build_object('released_by', auth.uid()));
end;
$$;

ALTER FUNCTION public.release_security_lock(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.release_security_lock(uuid) FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- 6) بوابة المسؤولين المشتركة
-- ============================================================================
-- بوابة واحدة بدل تكرار الشرط: admin_god_mode وليس get_auth_role().
-- (get_auth_role() يُرجع role وقيمته الافتراضية 'editor'، فكل مستخدم كان يمرّ.
--  انظر التصحيح في 20260911040000.)
CREATE OR REPLACE FUNCTION public.is_admin_requester()
RETURNS boolean
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
     WHERE p.id = auth.uid() AND p.admin_god_mode IS TRUE
  );
$$;

ALTER FUNCTION public.is_admin_requester() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_admin_requester() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_requester() TO authenticated;

-- ============================================================================
-- 7) لوحة إدارة المستخدمين
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_kpis()
RETURNS TABLE (
  total_users       bigint,
  pro_subscribers   bigint,
  new_last_24h      bigint,
  active_7d         bigint,
  locked_now        bigint,
  with_city         bigint,
  pro_share         numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    count(*),
    count(*) FILTER (WHERE p.is_pro),
    count(*) FILTER (WHERE p.created_at >= timezone('utc', now()) - interval '24 hours'),
    count(*) FILTER (WHERE p.updated_at >= timezone('utc', now()) - interval '7 days'),
    count(*) FILTER (WHERE p.security_locked_until > timezone('utc', now())),
    count(*) FILTER (WHERE p.city IS NOT NULL AND btrim(p.city) <> ''),
    round(100.0 * count(*) FILTER (WHERE p.is_pro) / nullif(count(*), 0), 1)
  FROM public.profiles p
  WHERE public.is_admin_requester();
$$;

ALTER FUNCTION public.get_user_kpis() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_user_kpis() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_kpis() TO authenticated;

/** توزيع الرتب. يُرجع كل الرتب السبع حتى الفارغة، فالرسم البياني لا يكذب. */
CREATE OR REPLACE FUNCTION public.get_rank_distribution()
RETURNS TABLE (rank public.user_rank, users bigint, share numeric, avg_xp numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH all_ranks AS (
    SELECT unnest(enum_range(NULL::public.user_rank)) AS rank
  ),
  grouped AS (
    -- الرتبة المخزّنة في mizan_profiles هي مصدر الحقيقة؛ يُديرها كود الاختبارات
    -- في src/lib/quiz/ranks.ts. إعادة اشتقاقها هنا كانت ستعارضه.
    SELECT coalesce(mp.rank::public.user_rank, 'D'::public.user_rank) AS rank,
           count(*) AS users,
           avg(coalesce(mp.xp, 0)) AS avg_xp
      FROM public.profiles p
      LEFT JOIN public.mizan_profiles mp ON mp.owner_id = p.id
     WHERE public.is_admin_requester()
     GROUP BY 1
  )
  SELECT
    a.rank,
    coalesce(g.users, 0),
    round(100.0 * coalesce(g.users, 0) / nullif(sum(coalesce(g.users,0)) OVER (), 0), 1),
    round(coalesce(g.avg_xp, 0), 1)
  FROM all_ranks a
  LEFT JOIN grouped g ON g.rank = a.rank
  ORDER BY array_position(enum_range(NULL::public.user_rank), a.rank);
$$;

ALTER FUNCTION public.get_rank_distribution() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_rank_distribution() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_rank_distribution() TO authenticated;

/** شبكة المستخدمين القابلة للترشيح (بريد / مدينة / صفة / رتبة). */
CREATE OR REPLACE FUNCTION public.search_profiles(
  p_query    text    DEFAULT NULL,
  p_city     text    DEFAULT NULL,
  p_audience public.audience_type DEFAULT NULL,
  p_rank     public.user_rank     DEFAULT NULL,
  p_pro_only boolean DEFAULT NULL,
  p_limit    integer DEFAULT 25,
  p_offset   integer DEFAULT 0
)
RETURNS TABLE (
  id uuid, email text, full_name text, city text,
  audience public.audience_type, rank public.user_rank, xp integer,
  is_pro boolean, credits integer, created_at timestamptz, locked boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    p.id, p.email, p.full_name, p.city, p.audience_type,
    coalesce(mp.rank::public.user_rank, 'D'::public.user_rank),
    coalesce(mp.xp, 0), p.is_pro,
    coalesce(p.daily_credits,0) + coalesce(p.bonus_credits,0),
    p.created_at,
    (p.security_locked_until IS NOT NULL AND p.security_locked_until > timezone('utc', now()))
  FROM public.profiles p
  -- LATERAL مع LIMIT 1: owner_id ليس UNIQUE في mizan_profiles، فـ LEFT JOIN
  -- عادي كان سيضاعف الصفوف (ويُظهر المستخدم مرتين) لو وُجد أكثر من بروفايل.
  LEFT JOIN LATERAL (
    SELECT m.rank, m.xp
      FROM public.mizan_profiles m
     WHERE m.owner_id = p.id
     ORDER BY m.created_at DESC
     LIMIT 1
  ) mp ON true
  WHERE public.is_admin_requester()
    AND (p_query IS NULL OR btrim(p_query) = ''
         OR p.email ILIKE '%' || btrim(p_query) || '%'
         OR p.full_name ILIKE '%' || btrim(p_query) || '%')
    AND (p_city IS NULL OR btrim(p_city) = '' OR btrim(p.city) ILIKE '%' || btrim(p_city) || '%')
    AND (p_audience IS NULL OR p.audience_type = p_audience)
    AND (p_rank IS NULL OR coalesce(mp.rank::public.user_rank, 'D'::public.user_rank) = p_rank)
    AND (p_pro_only IS NULL OR p.is_pro = p_pro_only)
  ORDER BY p.created_at DESC
  LIMIT least(greatest(coalesce(p_limit, 25), 1), 100)
  OFFSET greatest(coalesce(p_offset, 0), 0);
$$;

ALTER FUNCTION public.search_profiles(text, text, public.audience_type, public.user_rank, boolean, integer, integer)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public.search_profiles(text, text, public.audience_type, public.user_rank, boolean, integer, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_profiles(text, text, public.audience_type, public.user_rank, boolean, integer, integer)
  TO authenticated;

-- ============================================================================
-- 8) لوحة الحصص
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_credit_consumption(p_days integer DEFAULT 7)
RETURNS TABLE (
  day date, cohort text, spent integer, transactions bigint, users bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    (timezone('utc', c.created_at))::date                        AS day,
    CASE WHEN p.is_pro THEN 'pro' ELSE 'free' END                AS cohort,
    coalesce(sum(c.amount) FILTER (WHERE c.direction = 'spend'), 0)::integer,
    count(*) FILTER (WHERE c.direction = 'spend'),
    count(DISTINCT c.user_id)
  FROM public.credit_transactions c
  JOIN public.profiles p ON p.id = c.user_id
  WHERE public.is_admin_requester()
    AND c.created_at >= timezone('utc', now()) - (least(greatest(coalesce(p_days,7),1),90) || ' days')::interval
  GROUP BY 1, 2
  ORDER BY 1 DESC, 2;
$$;

ALTER FUNCTION public.get_credit_consumption(integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_credit_consumption(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_credit_consumption(integer) TO authenticated;

/** حمل الاختبارات حسب الوضع والفصل (Concours مقابل S1–S6). */
-- مكتوبة ضد مخطط quiz_attempts الحقيقي (20260914000000): mode نصّي لا enum،
-- و label بدل semester، و user_ref بدل user_id/visitor_id، و score بدل
-- score_percent. المسودة الأولى كانت تقرأ أعمدة غير موجودة لأن كُتبت قبل رؤية
-- ذلك المخطط.
CREATE OR REPLACE FUNCTION public.get_quiz_load(p_days integer DEFAULT 7)
RETURNS TABLE (
  mode text, label text, attempts bigint,
  unique_users bigint, avg_score numeric, xp_earned bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    a.mode,
    a.label,
    count(*)                                    AS attempts,
    -- user_ref اختياري (المحاولات المجهولة بلا مرجع)، و COUNT DISTINCT يتجاهل
    -- NULL، فمحاولات الزائر غير المسجّل تُحتسب في attempts لا في unique_users.
    count(DISTINCT a.user_ref)                  AS unique_users,
    round(avg(a.score), 1)                      AS avg_score,
    coalesce(sum(a.xp_earned), 0)               AS xp_earned
  FROM public.quiz_attempts a
  WHERE public.is_admin_requester()
    AND a.created_at >= timezone('utc', now()) - (least(greatest(coalesce(p_days,7),1),90) || ' days')::interval
  GROUP BY a.mode, a.label
  ORDER BY attempts DESC;
$$;

ALTER FUNCTION public.get_quiz_load(integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_quiz_load(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_quiz_load(integer) TO authenticated;

/** كم مرة اصطدم المستخدمون بالسقوف — مقسّماً مجاني/Pro. */
CREATE OR REPLACE FUNCTION public.get_rate_limit_metrics(p_days integer DEFAULT 7)
RETURNS TABLE (
  bucket text, cohort text, hits bigint, denied bigint, denial_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    r.bucket,
    CASE WHEN r.is_pro THEN 'pro' ELSE 'free' END             AS cohort,
    count(*)                                                  AS hits,
    count(*) FILTER (WHERE r.denied)                          AS denied,
    round(100.0 * count(*) FILTER (WHERE r.denied) / nullif(count(*), 0), 1) AS denial_rate
  FROM public.rate_limit_events r
  WHERE public.is_admin_requester()
    AND r.created_at >= timezone('utc', now()) - (least(greatest(coalesce(p_days,7),1),90) || ' days')::interval
  GROUP BY 1, 2
  ORDER BY denied DESC, hits DESC;
$$;

ALTER FUNCTION public.get_rate_limit_metrics(integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_rate_limit_metrics(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_rate_limit_metrics(integer) TO authenticated;

-- ============================================================================
-- 9) لوحة الاحتيال
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_risk_overview(p_days integer DEFAULT 7)
RETURNS TABLE (
  metric text, value bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH win AS (
    -- الحارس داخل CTE: إن لم يكن الطالب مسؤولاً تُصبح النافذة NULL فترجع كل
    -- الفروع صفراً بدل أن تُسرب بيانات عبر SECURITY DEFINER.
    SELECT CASE WHEN public.is_admin_requester()
                THEN (least(greatest(coalesce(p_days,7),1),90) || ' days')::interval
           END AS i
  )
  SELECT 'failed_payments', count(*) FROM public.payment_risk_events, win
   WHERE event_type='payment_failed' AND created_at >= timezone('utc',now()) - win.i
  UNION ALL
  SELECT 'geo_mismatches', count(*) FROM public.payment_risk_events, win
   WHERE event_type='geo_mismatch' AND created_at >= timezone('utc',now()) - win.i
  UNION ALL
  SELECT 'checkout_velocity_flags', count(*) FROM public.payment_risk_events, win
   WHERE event_type='checkout_velocity' AND created_at >= timezone('utc',now()) - win.i
  UNION ALL
  SELECT 'distinct_ips_flagged', count(DISTINCT ip_hash) FROM public.payment_risk_events, win
   WHERE created_at >= timezone('utc',now()) - win.i AND ip_hash IS NOT NULL
  UNION ALL
  SELECT 'active_locks', count(*) FROM public.security_locks, win
   WHERE win.i IS NOT NULL AND released_at IS NULL
     AND expires_at > timezone('utc', now());
$$;

ALTER FUNCTION public.get_risk_overview(integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_risk_overview(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_risk_overview(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_risk_events(p_limit integer DEFAULT 50)
RETURNS TABLE (
  id bigint, event_type public.risk_event_type, user_email text,
  decline_code text, card_country text, ip_country text,
  risk_score numeric, created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    e.id, e.event_type, p.email, e.decline_code, e.card_country, e.ip_country,
    e.risk_score, e.created_at
  FROM public.payment_risk_events e
  LEFT JOIN public.profiles p ON p.id = e.user_id
  WHERE public.is_admin_requester()
  ORDER BY e.created_at DESC
  LIMIT least(greatest(coalesce(p_limit, 50), 1), 500);
$$;

ALTER FUNCTION public.get_risk_events(integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_risk_events(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_risk_events(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_locked_accounts()
RETURNS TABLE (
  user_id uuid, email text, reason public.lock_reason,
  locked_at timestamptz, expires_at timestamptz, active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    s.user_id, p.email, s.reason, s.created_at, s.expires_at,
    (s.released_at IS NULL AND s.expires_at > timezone('utc', now()))
  FROM public.security_locks s
  LEFT JOIN public.profiles p ON p.id = s.user_id
  WHERE public.is_admin_requester()
  ORDER BY s.created_at DESC
  LIMIT 200;
$$;

ALTER FUNCTION public.get_locked_accounts() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_locked_accounts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_locked_accounts() TO authenticated;
