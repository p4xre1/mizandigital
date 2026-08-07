const handleLogin = async (e: React.SyntheticEvent<HTMLFormElement>) => {
  e.preventDefault();
  setError("");
  setGlobalError("");

  if (!isValidEmail(email)) {
    setError(t.invalidEmail);
    return;
  }

  if (!captchaToken) {
    setError(t.captchaRequired);
    return;
  }

  if (!isSupabaseConfigured) {
    setError(t.missingConfig);
    return;
  }

  setLoading(true);

  try {
    // ─── 1. تسجيل الدخول ─────────────────────────────
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    });

    if (authError) {
      setError(authError.message || t.fallbackErr);
      setGlobalError(authError.message || t.fallbackErr);
      resetCaptcha();
      return;
    }

    if (!authData.user) {
      setError(t.fallbackErr);
      return;
    }

    // ─── 2. التأكد من وجود Profile (الخطوة الحاسمة) ───
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", authData.user.id)
      .maybeSingle();

    // إذا لم يكن هناك Profile، أنشئه الآن بكل الحقول المطلوبة
    if (!profile) {
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: authData.user.id,
            email: authData.user.email,
            role: "member",           // ← Supabase يُحوّل النص إلى user_role تلقائياً
            full_name: authData.user.user_metadata?.full_name || "",
            bio: "",
            avatar_url: "",
            preferred_lang: lang,     // ← احفظ لغة الواجهة التي سجّل منها
          },
          { onConflict: "id" }
        );

      if (upsertError) {
        console.error("Failed to create profile:", upsertError);
        setError("تم تسجيل الدخول لكن فشل إنشاء البروفايل. أعد تحميل الصفحة.");
        // لا تُكمل — دعه يُعيد المحاولة
        return;
      }
    }

    // ─── 3. حفظ البيانات في localStorage (اختياري) ───
    localStorage.setItem(
      "mizan_user",
      JSON.stringify({
        id: authData.user.id,
        email: authData.user.email,
        name:
          authData.user.user_metadata?.full_name ||
          authData.user.email?.split("@")[0] ||
          "Member",
      })
    );

    setGlobalSuccess(t.successMsg);
    onSuccess();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t.fallbackErr;
    setError(message);
    setGlobalError(message);
    resetCaptcha();
  } finally {
    setLoading(false);
  }
};