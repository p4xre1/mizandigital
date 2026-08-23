


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."content_status" AS ENUM (
    'draft',
    'published',
    'under_review',
    'archived'
);


ALTER TYPE "public"."content_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'super_admin',
    'editor'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_bonus_credits"("user_id" "uuid", "amount" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_daily int;
  current_bonus int;
begin
  if amount < 1 then
    raise exception 'amount must be positive';
  end if;

  update public.profiles
  set bonus_credits = bonus_credits + amount
  where id = user_id;

  select daily_credits, bonus_credits into current_daily, current_bonus
  from public.profiles
  where id = user_id;

  return jsonb_build_object(
    'success', true,
    'daily_credits', current_daily,
    'bonus_credits', current_bonus,
    'total', current_daily + current_bonus
  );
end;
$$;


ALTER FUNCTION "public"."add_bonus_credits"("user_id" "uuid", "amount" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_freeze_user"("target_user_id" "uuid", "freeze_status" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Verify executioner is root or admin
  IF public.get_auth_role() NOT IN ('root', 'admin', 'security_admin') THEN
    RAISE EXCEPTION 'Access Denied: Only root or admin can freeze accounts.';
  END IF;

  UPDATE public.profiles
  SET is_frozen = freeze_status,
      last_updated_at = now()
  WHERE id = target_user_id;
END;
$$;


ALTER FUNCTION "public"."admin_freeze_user"("target_user_id" "uuid", "freeze_status" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_referral_code"("referred_user" "uuid", "referral_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  inviter_id uuid;
  inviter_referral_count int;
begin
  select id, referral_count into inviter_id, inviter_referral_count
  from public.profiles
  where referral_code = referral_code
  limit 1;

  if inviter_id is null or inviter_id = referred_user then
    return jsonb_build_object('success', false, 'reason', 'invalid_referral_code');
  end if;

  update public.profiles
  set bonus_credits = bonus_credits + 2,
      referred_by = inviter_id
  where id = referred_user;

  if inviter_referral_count < 10 then
    update public.profiles
    set bonus_credits = bonus_credits + 5,
        referral_count = referral_count + 1
    where id = inviter_id;
  end if;

  return jsonb_build_object('success', true);
end;
$$;


ALTER FUNCTION "public"."apply_referral_code"("referred_user" "uuid", "referral_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."deduct_credit"("user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_daily int;
  current_bonus int;
  used text;
begin
  select daily_credits, bonus_credits into current_daily, current_bonus
  from public.profiles
  where id = user_id
  for update;

  if current_daily is null then
    return jsonb_build_object('success', false, 'reason', 'profile_not_found', 'daily_credits', 0, 'bonus_credits', 0);
  end if;

  if current_daily + current_bonus <= 0 then
    return jsonb_build_object('success', false, 'reason', 'insufficient_credits', 'daily_credits', current_daily, 'bonus_credits', current_bonus);
  end if;

  if current_daily > 0 then
    update public.profiles
    set daily_credits = daily_credits - 1
    where id = user_id;
    used := 'daily';
  else
    update public.profiles
    set bonus_credits = bonus_credits - 1
    where id = user_id;
    used := 'bonus';
  end if;

  select daily_credits, bonus_credits into current_daily, current_bonus
  from public.profiles
  where id = user_id;

  return jsonb_build_object(
    'success', true,
    'used', used,
    'daily_credits', current_daily,
    'bonus_credits', current_bonus
  );
end;
$$;


ALTER FUNCTION "public"."deduct_credit"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_profile_rate_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    -- Check if user is updating faster than once every 2 seconds
    IF (OLD.last_updated_at IS NOT NULL AND (NOW() - OLD.last_updated_at) < INTERVAL '2 seconds') THEN
        RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED: You are making changes too fast. Please wait a moment.';
    END IF;

    NEW.last_updated_at := NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_profile_rate_limit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."force_comment_unapproved"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  new.is_approved := false;
  return new;
end;
$$;


ALTER FUNCTION "public"."force_comment_unapproved"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_referral_code"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  code text;
begin
  loop
    code := substring(md5(random()::text || clock_timestamp()::text), 1, 12);
    exit when not exists (select 1 from public.profiles where referral_code = code);
  end loop;
  return code;
end;
$$;


ALTER FUNCTION "public"."generate_referral_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_auth_role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_auth_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_my_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_audit_log"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, table_name, old_data, new_data, ip_address)
  VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, to_jsonb(OLD), to_jsonb(NEW), inet_client_addr());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_audit_log"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  extracted_name TEXT;
BEGIN
  -- Extract full_name passed from frontend via supabase.auth.signUp({ options: { data: { full_name } } })
  extracted_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role
  )
  VALUES (
    NEW.id,
    NEW.email,
    extracted_name,
    'member'::public.user_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_tenant_binding"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    detected_domain TEXT;
    matching_tenant_id UUID;
BEGIN
    -- Extract domain from the registering user's email
    detected_domain := split_part(new.email, '@', 2);
    
    -- Check if we have an institutional tenant matching this domain
    SELECT id INTO matching_tenant_id 
    FROM public.tenants 
    WHERE domain_wildcard = detected_domain;
    
    -- Insert profile mapping the user to their matching tenant or free tier
    IF matching_tenant_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, tenant_id, tier)
        VALUES (new.id, matching_tenant_id, 'enterprise');
    ELSE
        INSERT INTO public.profiles (id, tenant_id, tier)
        VALUES (new.id, NULL, 'free');
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user_tenant_binding"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_safe_account_deletion"("target_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  DELETE FROM public.user_bookmarks WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;


ALTER FUNCTION "public"."handle_safe_account_deletion"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_article_views"("p_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  new_count integer;
begin
  update public.articles
    set views_count = coalesce(views_count, 0) + 1
    where id = p_id
    returning views_count into new_count;
  return new_count;
end;
$$;


ALTER FUNCTION "public"."increment_article_views"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_content_views"("p_type" "text", "p_slug" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  new_count integer;
begin
  insert into public.content_stats (source_type, source_slug, views_count)
  values (p_type, p_slug, 1)
  on conflict (source_type, source_slug)
  do update set views_count = public.content_stats.views_count + 1
  returning views_count into new_count;

  return new_count;
end;
$$;


ALTER FUNCTION "public"."increment_content_views"("p_type" "text", "p_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_document_downloads"("target_doc_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.documents_library
  SET download_count = COALESCE(download_count, 0) + 1
  WHERE id = target_doc_id;
END;
$$;


ALTER FUNCTION "public"."increment_document_downloads"("target_doc_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."increment_document_downloads"("target_doc_id" "uuid") IS '@supabase-linter-ignore 0028_anon_security_definer_function_executable
   @supabase-linter-ignore 0029_authenticated_security_definer_function_executable';



CREATE OR REPLACE FUNCTION "public"."increment_news_views"("p_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  new_count integer;
begin
  update public.news
    set views_count = coalesce(views_count, 0) + 1
    where id = p_id
    returning views_count into new_count;
  return new_count;
end;
$$;


ALTER FUNCTION "public"."increment_news_views"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_pdf_downloads"("p_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  new_count integer;
begin
  update public.pdf_summaries
    set download_count = coalesce(download_count, 0) + 1
    where id = p_id
    returning download_count into new_count;
  return new_count;
end;
$$;


ALTER FUNCTION "public"."increment_pdf_downloads"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_active_user"("user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_uuid 
    AND (is_frozen IS FALSE OR is_frozen IS NULL)
  );
END;
$$;


ALTER FUNCTION "public"."is_active_user"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'root')
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_or_dev"() RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role IN ('Admin', 'Developer')
  );
END;
$$;


ALTER FUNCTION "public"."is_admin_or_dev"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_staff"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = (SELECT auth.uid())
      AND role = ANY (ARRAY[
        'writer'::user_role, 
        'marketer'::user_role, 
        'admin'::user_role, 
        'security_admin'::user_role, 
        'root'::user_role
      ])
  );
$$;


ALTER FUNCTION "public"."is_staff"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_cms_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, old_data)
    VALUES (auth.uid(), 'DELETE', TG_TABLE_NAME, to_jsonb(OLD));
    RETURN OLD;

  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, old_data, new_data)
    VALUES (auth.uid(), 'UPDATE', TG_TABLE_NAME, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;

  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, new_data)
    VALUES (auth.uid(), 'INSERT', TG_TABLE_NAME, to_jsonb(NEW));
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."log_cms_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_profile_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    INSERT INTO public.audit_logs (user_id, action, table_name, old_data, new_data)
    VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_profile_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_profile_column_tampering"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    -- Check sensitive columns (without checking non-existent NEW.role)
    IF (NEW.admin_god_mode IS DISTINCT FROM OLD.admin_god_mode) OR 
       (NEW.bonus_credits IS DISTINCT FROM OLD.bonus_credits) OR 
       (NEW.daily_credits IS DISTINCT FROM OLD.daily_credits) OR 
       (NEW.is_frozen IS DISTINCT FROM OLD.is_frozen) THEN
       
       -- Allow service_role or admin overrides, block regular anon/authenticated users
       IF (auth.role() = 'authenticated' OR auth.role() = 'anon') THEN
           RAISE EXCEPTION 'Unauthorized column modification on profiles';
       END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_profile_column_tampering"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_role_self_escalation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    -- Protect admin_god_mode from being toggled by regular users
    IF (OLD.admin_god_mode IS DISTINCT FROM NEW.admin_god_mode) THEN
        IF (auth.role() = 'authenticated' OR auth.role() = 'anon') THEN
            RAISE EXCEPTION 'Privilege escalation blocked: Cannot alter admin_god_mode directly.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_role_self_escalation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_profile_sensitive_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  caller_role text;
BEGIN
  SELECT role::text INTO caller_role FROM public.profiles WHERE id = auth.uid();

  IF caller_role NOT IN ('root', 'admin', 'security_admin') THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Unauthorized: You cannot modify your own role.';
    END IF;
    IF NEW.admin_god_mode IS DISTINCT FROM OLD.admin_god_mode THEN
      RAISE EXCEPTION 'Unauthorized: You cannot modify admin_god_mode.';
    END IF;
    IF NEW.is_frozen IS DISTINCT FROM OLD.is_frozen THEN
      RAISE EXCEPTION 'Unauthorized: You cannot modify account freeze status.';
    END IF;
    IF NEW.tier IS DISTINCT FROM OLD.tier THEN
      RAISE EXCEPTION 'Unauthorized: You cannot modify your subscription tier.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."protect_profile_sensitive_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_daily_credits"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  update public.profiles
  set daily_credits = 3;
end;
$$;


ALTER FUNCTION "public"."reset_daily_credits"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_cms_created_by"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_cms_created_by"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_laws_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_laws_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_trending_topics_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_trending_topics_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_article_revision"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF (OLD.content IS DISTINCT FROM NEW.content) OR (OLD.title IS DISTINCT FROM NEW.title) THEN
    INSERT INTO public.article_revisions (article_id, title, content, edited_by)
    VALUES (NEW.id, OLD.title, OLD.content, COALESCE(auth.uid(), OLD.author_id));
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."track_article_revision"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_honeypot_trap"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    IF NEW.admin_god_mode = true THEN
        -- Log critical breach attempt to audit logs
        INSERT INTO public.audit_logs (user_id, action, table_name, new_data)
        VALUES (
            auth.uid(),
            'CRITICAL_SECURITY_BREACH_ATTEMPT',
            'profiles',
            jsonb_build_object('warning', 'User attempted to toggle honeypot column admin_god_mode!')
        );

        -- Raise fatal exception to abort transaction instantly
        RAISE EXCEPTION 'SECURITY BREACH DETECTED: This incident has been logged and your session flagged.';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_honeypot_trap"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "content" "text" NOT NULL,
    "excerpt" "text",
    "category_id" "uuid",
    "faculty_id" "uuid",
    "semester" "text",
    "meta_title" "text",
    "meta_description" "text",
    "target_keyword" "text",
    "canonical_url" "text",
    "json_ld" "jsonb" DEFAULT '{}'::"jsonb",
    "views_count" integer DEFAULT 0,
    "is_featured" boolean DEFAULT false,
    "status" "public"."content_status" DEFAULT 'draft'::"public"."content_status",
    "author_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "cover_image" "text",
    "published_at" timestamp with time zone,
    CONSTRAINT "articles_semester_check" CHECK (("semester" = ANY (ARRAY['S1'::"text", 'S2'::"text", 'S3'::"text", 'S4'::"text", 'S5'::"text", 'S6'::"text"])))
);


ALTER TABLE "public"."articles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "table_name" "text",
    "new_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "old_data" "jsonb",
    "ip_address" "inet"
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "count" integer DEFAULT 0,
    "name_fr" "text"
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "article_id" "uuid",
    "pdf_id" "uuid",
    "author_name" "text" DEFAULT 'باحث / زائر'::"text" NOT NULL,
    "body" "text" NOT NULL,
    "is_approved" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "news_id" "uuid",
    "source_type" "text",
    "source_slug" "text",
    CONSTRAINT "comments_body_length" CHECK ((("char_length"("body") >= 1) AND ("char_length"("body") <= 2000))),
    CONSTRAINT "comments_source_type_check" CHECK (("source_type" = ANY (ARRAY['articles'::"text", 'news'::"text"])))
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_stats" (
    "source_type" "text" NOT NULL,
    "source_slug" "text" NOT NULL,
    "views_count" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "content_stats_source_type_check" CHECK (("source_type" = ANY (ARRAY['articles'::"text", 'news'::"text"])))
);


ALTER TABLE "public"."content_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."faculties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "city" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "founded_year" integer,
    "logo_url" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."faculties" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."laws" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "law_number" "text",
    "description" "text",
    "official_gazette_number" "text",
    "publication_date" "date",
    "pdf_url" "text",
    "slug" "text" NOT NULL,
    "category_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."laws" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lexicon_terms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "term_ar" "text" NOT NULL,
    "definition" "text" NOT NULL,
    "category" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "term_fr" "text",
    "legal_sources" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."lexicon_terms" OWNER TO "postgres";


COMMENT ON COLUMN "public"."lexicon_terms"."legal_sources" IS 'شجرة قانونية: مصفوفة كائنات { code_ar, code_short?, code_fr?, articles: [{ number, phrase }] }';



CREATE TABLE IF NOT EXISTS "public"."news" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "summary" "text",
    "content" "text",
    "source" "text",
    "source_url" "text",
    "image_url" "text",
    "is_published" boolean DEFAULT true,
    "published_at" timestamp with time zone DEFAULT "now"(),
    "slug" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "views_count" integer DEFAULT 0,
    "target_keyword" "text",
    "meta_title" "text",
    "meta_description" "text"
);


ALTER TABLE "public"."news" OWNER TO "postgres";


COMMENT ON COLUMN "public"."news"."target_keyword" IS 'الكلمة المفتاحية المستهدفة لتحسين محركات البحث لهذا الخبر';



COMMENT ON COLUMN "public"."news"."meta_title" IS 'عنوان السيو (Meta Title) المخصص لهذا الخبر — إن ترك فارغاً يُستخدم العنوان الأساسي';



COMMENT ON COLUMN "public"."news"."meta_description" IS 'وصف السيو (Meta Description) المخصص لهذا الخبر — إن ترك فارغاً يُستخدم الموجز';



CREATE TABLE IF NOT EXISTS "public"."pdf_summaries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "semester" "text" NOT NULL,
    "professor" "text",
    "faculty_id" "uuid",
    "file_url" "text" NOT NULL,
    "file_size_bytes" bigint,
    "download_count" integer DEFAULT 0,
    "status" "public"."content_status" DEFAULT 'published'::"public"."content_status",
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "pdf_summaries_semester_check" CHECK (("semester" = ANY (ARRAY['S1'::"text", 'S2'::"text", 'S3'::"text", 'S4'::"text", 'S5'::"text", 'S6'::"text"])))
);


ALTER TABLE "public"."pdf_summaries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "bonus_credits" integer DEFAULT 5 NOT NULL,
    "referred_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "referral_code" "text" DEFAULT "substring"("md5"(("gen_random_uuid"())::"text"), 1, 12),
    "referral_count" integer DEFAULT 0,
    "daily_credits" integer DEFAULT 3,
    "full_name" "text" DEFAULT ''::"text",
    "progress" "jsonb" DEFAULT '{"S1": 0, "S2": 0, "S3": 0, "S4": 0, "S5": 0, "S6": 0}'::"jsonb",
    "bio" "text" DEFAULT ''::"text",
    "avatar_url" "text" DEFAULT ''::"text",
    "admin_god_mode" boolean DEFAULT false,
    "last_updated_at" timestamp with time zone DEFAULT "now"(),
    "is_frozen" boolean DEFAULT false,
    "ads_exempt" boolean DEFAULT false,
    "preferred_lang" "text" DEFAULT 'ar'::"text",
    "last_ip_address" "inet",
    "ban_reason" "text",
    "banned_at" timestamp with time zone,
    "banned_by" "uuid",
    CONSTRAINT "check_positive_credits" CHECK (("bonus_credits" >= 0)),
    CONSTRAINT "profiles_daily_credits_check" CHECK (("daily_credits" >= 0)),
    CONSTRAINT "profiles_preferred_lang_check" CHECK (("preferred_lang" = 'ar'::"text")),
    CONSTRAINT "profiles_referral_count_check" CHECK (("referral_count" >= 0))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schools" (
    "id" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "university" "text" NOT NULL,
    "city" "text" NOT NULL,
    "official_url" "text",
    "map_location" "jsonb",
    "synopsis" "text",
    "study_areas" "text"[],
    "verified_at" "date",
    "registration_info" "jsonb",
    "useful_links" "jsonb",
    "body" "text"[],
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."schools" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."seminars" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "speaker" "text" NOT NULL,
    "speaker_title" "text",
    "video_url" "text" NOT NULL,
    "event_date" "date",
    "event_time" time without time zone,
    "agenda" "text",
    "attachment_url" "text",
    "status" "public"."content_status" DEFAULT 'published'::"public"."content_status",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."seminars" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trending_topics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "topic" "text" NOT NULL,
    "notes" "text",
    "category" "text",
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "priority" "text" DEFAULT 'medium'::"text" NOT NULL,
    "source_note" "text",
    "linked_article_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "trending_topics_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text"]))),
    CONSTRAINT "trending_topics_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'in_progress'::"text", 'published'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."trending_topics" OWNER TO "postgres";


ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_stats"
    ADD CONSTRAINT "content_stats_pkey" PRIMARY KEY ("source_type", "source_slug");



ALTER TABLE ONLY "public"."faculties"
    ADD CONSTRAINT "faculties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."faculties"
    ADD CONSTRAINT "faculties_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."laws"
    ADD CONSTRAINT "laws_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."laws"
    ADD CONSTRAINT "laws_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."lexicon_terms"
    ADD CONSTRAINT "lexicon_terms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news"
    ADD CONSTRAINT "news_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news"
    ADD CONSTRAINT "news_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."pdf_summaries"
    ADD CONSTRAINT "pdf_summaries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pdf_summaries"
    ADD CONSTRAINT "pdf_summaries_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_referral_code_key" UNIQUE ("referral_code");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."seminars"
    ADD CONSTRAINT "seminars_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trending_topics"
    ADD CONSTRAINT "trending_topics_pkey" PRIMARY KEY ("id");



CREATE INDEX "comments_article_id_idx" ON "public"."comments" USING "btree" ("article_id");



CREATE INDEX "comments_news_id_idx" ON "public"."comments" USING "btree" ("news_id");



CREATE INDEX "comments_source_idx" ON "public"."comments" USING "btree" ("source_type", "source_slug");



CREATE INDEX "laws_category_id_idx" ON "public"."laws" USING "btree" ("category_id");



CREATE INDEX "laws_slug_idx" ON "public"."laws" USING "btree" ("slug");



CREATE INDEX "trending_topics_priority_idx" ON "public"."trending_topics" USING "btree" ("priority");



CREATE INDEX "trending_topics_status_idx" ON "public"."trending_topics" USING "btree" ("status");



CREATE OR REPLACE TRIGGER "audit_profiles_trigger" AFTER DELETE OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_audit_log"();



CREATE OR REPLACE TRIGGER "rate_limit_trigger" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_profile_rate_limit"();



CREATE OR REPLACE TRIGGER "tr_prevent_profile_tampering" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_profile_column_tampering"();



CREATE OR REPLACE TRIGGER "tr_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_force_comment_unapproved" BEFORE INSERT ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."force_comment_unapproved"();



CREATE OR REPLACE TRIGGER "trg_laws_updated_at" BEFORE UPDATE ON "public"."laws" FOR EACH ROW EXECUTE FUNCTION "public"."set_laws_updated_at"();



CREATE OR REPLACE TRIGGER "trg_prevent_role_self_escalation" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_role_self_escalation"();



CREATE OR REPLACE TRIGGER "trg_trending_topics_updated_at" BEFORE UPDATE ON "public"."trending_topics" FOR EACH ROW EXECUTE FUNCTION "public"."set_trending_topics_updated_at"();



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_news_id_fkey" FOREIGN KEY ("news_id") REFERENCES "public"."news"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pdf_id_fkey" FOREIGN KEY ("pdf_id") REFERENCES "public"."pdf_summaries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."laws"
    ADD CONSTRAINT "laws_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pdf_summaries"
    ADD CONSTRAINT "pdf_summaries_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pdf_summaries"
    ADD CONSTRAINT "pdf_summaries_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_banned_by_fkey" FOREIGN KEY ("banned_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_referred_by_fkey" FOREIGN KEY ("referred_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trending_topics"
    ADD CONSTRAINT "trending_topics_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trending_topics"
    ADD CONSTRAINT "trending_topics_linked_article_id_fkey" FOREIGN KEY ("linked_article_id") REFERENCES "public"."articles"("id") ON DELETE SET NULL;



CREATE POLICY "Admin Delete Faculties" ON "public"."faculties" FOR DELETE USING (((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Admin Delete Lexicon" ON "public"."lexicon_terms" FOR DELETE USING (((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Admin Delete News" ON "public"."news" FOR DELETE TO "authenticated" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Admin Delete Seminars" ON "public"."seminars" FOR DELETE USING (((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Admin Delete Summaries" ON "public"."pdf_summaries" FOR DELETE USING (((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Admin Insert Faculties" ON "public"."faculties" FOR INSERT WITH CHECK (((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Admin Insert Lexicon" ON "public"."lexicon_terms" FOR INSERT WITH CHECK (((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Admin Insert News" ON "public"."news" FOR INSERT TO "authenticated" WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Admin Insert Seminars" ON "public"."seminars" FOR INSERT WITH CHECK (((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Admin Insert Summaries" ON "public"."pdf_summaries" FOR INSERT WITH CHECK (((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Admin Update Faculties" ON "public"."faculties" FOR UPDATE USING (((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Admin Update Lexicon" ON "public"."lexicon_terms" FOR UPDATE USING (((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Admin Update News" ON "public"."news" FOR UPDATE TO "authenticated" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Admin Update Seminars" ON "public"."seminars" FOR UPDATE USING (((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Admin Update Summaries" ON "public"."pdf_summaries" FOR UPDATE USING (((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Allow public read access on schools" ON "public"."schools" FOR SELECT USING (true);



CREATE POLICY "Enable delete for authenticated users only" ON "public"."lexicon_terms" FOR DELETE TO "authenticated" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable insert for authenticated users on faculties" ON "public"."faculties" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."lexicon_terms" FOR INSERT TO "authenticated" WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read access for all users" ON "public"."lexicon_terms" FOR SELECT USING (true);



CREATE POLICY "Enable update for authenticated users only" ON "public"."lexicon_terms" FOR UPDATE TO "authenticated" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Profiles delete policy" ON "public"."profiles" FOR DELETE TO "authenticated" USING ((((( SELECT "auth"."jwt"() AS "jwt") -> 'app_metadata'::"text") ->> 'role'::"text") = ANY (ARRAY['admin'::"text", 'staff'::"text"])));



CREATE POLICY "Profiles insert policy" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Profiles update policy" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Public and Admin Read Articles" ON "public"."articles" FOR SELECT USING ((("status" = 'published'::"public"."content_status") OR ((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = ANY (ARRAY['service_role'::"text", 'admin'::"text"]))));



CREATE POLICY "Public and Admin Read Faculties" ON "public"."faculties" FOR SELECT USING ((true OR ((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'service_role'::"text")));



CREATE POLICY "Public and Admin Read Lexicon" ON "public"."lexicon_terms" FOR SELECT USING ((true OR ((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'service_role'::"text")));



CREATE POLICY "Public and Admin Read News" ON "public"."news" FOR SELECT USING (true);



CREATE POLICY "Public and Admin Read Seminars" ON "public"."seminars" FOR SELECT USING ((true OR ((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'service_role'::"text")));



CREATE POLICY "Public and Admin Read Summaries" ON "public"."pdf_summaries" FOR SELECT USING ((true OR ((( SELECT "auth"."jwt"() AS "jwt") ->> 'role'::"text") = 'service_role'::"text")));



ALTER TABLE "public"."articles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categories_delete_policy" ON "public"."categories" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "categories_insert_policy" ON "public"."categories" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "categories_select_policy" ON "public"."categories" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "categories_update_policy" ON "public"."categories" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."content_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."faculties" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."laws" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "laws_admin_delete" ON "public"."laws" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "laws_admin_insert" ON "public"."laws" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "laws_admin_update" ON "public"."laws" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "laws_public_read" ON "public"."laws" FOR SELECT USING (true);



ALTER TABLE "public"."lexicon_terms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."news" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pdf_summaries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select_policy" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "public can insert comments" ON "public"."comments" FOR INSERT WITH CHECK (true);



CREATE POLICY "public can read approved comments" ON "public"."comments" FOR SELECT USING (("is_approved" = true));



CREATE POLICY "public can read content stats" ON "public"."content_stats" FOR SELECT USING (true);



ALTER TABLE "public"."schools" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."seminars" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trending_topics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trending_topics_admin_delete" ON "public"."trending_topics" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "trending_topics_admin_insert" ON "public"."trending_topics" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "trending_topics_admin_select" ON "public"."trending_topics" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "trending_topics_admin_update" ON "public"."trending_topics" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































REVOKE ALL ON FUNCTION "public"."add_bonus_credits"("user_id" "uuid", "amount" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_bonus_credits"("user_id" "uuid", "amount" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_freeze_user"("target_user_id" "uuid", "freeze_status" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_freeze_user"("target_user_id" "uuid", "freeze_status" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."apply_referral_code"("referred_user" "uuid", "referral_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."apply_referral_code"("referred_user" "uuid", "referral_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_referral_code"("referred_user" "uuid", "referral_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."deduct_credit"("user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."deduct_credit"("user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_profile_rate_limit"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_profile_rate_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."force_comment_unapproved"() TO "anon";
GRANT ALL ON FUNCTION "public"."force_comment_unapproved"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."force_comment_unapproved"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_referral_code"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_referral_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_referral_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_auth_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_auth_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auth_role"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_audit_log"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_audit_log"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_audit_log"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user_tenant_binding"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user_tenant_binding"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_safe_account_deletion"("target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_safe_account_deletion"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_safe_account_deletion"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_article_views"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_article_views"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_article_views"("p_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_content_views"("p_type" "text", "p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_content_views"("p_type" "text", "p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_content_views"("p_type" "text", "p_slug" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."increment_document_downloads"("target_doc_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."increment_document_downloads"("target_doc_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_news_views"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_news_views"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_news_views"("p_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_pdf_downloads"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_pdf_downloads"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_pdf_downloads"("p_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_active_user"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_active_user"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_active_user"("user_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin_or_dev"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin_or_dev"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_or_dev"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_staff"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_staff"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_cms_activity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_cms_activity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_profile_activity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_profile_activity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."prevent_profile_column_tampering"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."prevent_profile_column_tampering"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."prevent_role_self_escalation"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."prevent_role_self_escalation"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."protect_profile_sensitive_fields"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."protect_profile_sensitive_fields"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."reset_daily_credits"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reset_daily_credits"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_cms_created_by"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_cms_created_by"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_laws_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_laws_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_laws_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_trending_topics_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_trending_topics_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_trending_topics_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."track_article_revision"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."track_article_revision"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."trigger_honeypot_trap"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."trigger_honeypot_trap"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";
























GRANT ALL ON TABLE "public"."articles" TO "anon";
GRANT ALL ON TABLE "public"."articles" TO "authenticated";
GRANT ALL ON TABLE "public"."articles" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON TABLE "public"."content_stats" TO "anon";
GRANT ALL ON TABLE "public"."content_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."content_stats" TO "service_role";



GRANT ALL ON TABLE "public"."faculties" TO "anon";
GRANT ALL ON TABLE "public"."faculties" TO "authenticated";
GRANT ALL ON TABLE "public"."faculties" TO "service_role";



GRANT ALL ON TABLE "public"."laws" TO "anon";
GRANT ALL ON TABLE "public"."laws" TO "authenticated";
GRANT ALL ON TABLE "public"."laws" TO "service_role";



GRANT ALL ON TABLE "public"."lexicon_terms" TO "anon";
GRANT ALL ON TABLE "public"."lexicon_terms" TO "authenticated";
GRANT ALL ON TABLE "public"."lexicon_terms" TO "service_role";



GRANT ALL ON TABLE "public"."news" TO "anon";
GRANT ALL ON TABLE "public"."news" TO "authenticated";
GRANT ALL ON TABLE "public"."news" TO "service_role";



GRANT ALL ON TABLE "public"."pdf_summaries" TO "anon";
GRANT ALL ON TABLE "public"."pdf_summaries" TO "authenticated";
GRANT ALL ON TABLE "public"."pdf_summaries" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."schools" TO "anon";
GRANT ALL ON TABLE "public"."schools" TO "authenticated";
GRANT ALL ON TABLE "public"."schools" TO "service_role";



GRANT ALL ON TABLE "public"."seminars" TO "anon";
GRANT ALL ON TABLE "public"."seminars" TO "authenticated";
GRANT ALL ON TABLE "public"."seminars" TO "service_role";



GRANT ALL ON TABLE "public"."trending_topics" TO "anon";
GRANT ALL ON TABLE "public"."trending_topics" TO "authenticated";
GRANT ALL ON TABLE "public"."trending_topics" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































