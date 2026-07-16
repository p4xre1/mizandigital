import React from "react";
import { Check, Zap, GraduationCap, ShieldCheck, HelpCircle } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { trackEvent } from "../lib/analytics";

export default function Pricing() {
  const { t, dir } = useI18n();

  const handleCheckoutRedirect = (planKey: string) => {
    trackEvent(`checkout_initiated_${planKey}`);
    
    // This will connect to your Stripe Checkout Session URL or Supabase Edge function later
    alert(dir === "rtl" 
      ? `جاري تحويلك إلى بوابة الدفع الآمنة لتفعيل باقة [${planKey.toUpperCase()}]...` 
      : `Redirecting to secure Stripe gateway for [${planKey.toUpperCase()}] plan...`
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-16" dir={dir}>
      {/* Header Section */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl" style={{ fontFamily: "'Playfair Display', 'Noto Serif Arabic', serif" }}>
          {dir === "rtl" ? "استثمر في مسارك القانوني" : "Invest in Your Legal Mastery"}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          {dir === "rtl" 
            ? "تصفّح موسوعات الأحكام والمذكرات دون إعلانات وبتحليلات معّمقة مصممة خصيصاً للقضاة والطلاب والمحامين."
            : "Access comprehensive judicial commentary, model briefs, and research tools completely ad-free."}
        </p>
      </div>

      {/* Pricing Grid */}
      <div className="grid md:grid-cols-3 gap-8 items-start">
        
        {/* 1. FREE PLAN */}
        <div className="bg-card border border-border rounded-2xl p-8 relative flex flex-col justify-between min-h-[500px] shadow-sm">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              {dir === "rtl" ? "الباقة الأساسية" : "Basic Academic"}
            </h3>
            <p className="mt-2 text-xs text-muted-foreground">
              {dir === "rtl" ? "الولوج اليومي المحدود للبحوث القانونية." : "Essential reading access for standard preparation."}
            </p>
            <div className="mt-6 flex items-baseline text-foreground">
              <span className="text-4xl font-extrabold tracking-tight">0</span>
              <span className="ms-1 text-sm font-semibold text-muted-foreground">{dir === "rtl" ? "درهم / أبدًا" : "MAD / forever"}</span>
            </div>
            
            <ul className="mt-8 space-y-4 text-sm text-muted-foreground">
              <li className="flex items-center gap-3">
                <Check size={16} className="text-primary shrink-0" />
                <span>{dir === "rtl" ? "قراءة المقالات العامة والأحكام الأساسية" : "Read public briefs & standard rulings"}</span>
              </li>
              <li className="flex items-center gap-3">
                <Check size={16} className="text-primary shrink-0" />
                <span>{dir === "rtl" ? "تحديث الملف الشخصي الأكاديمي" : "Basic academic profile folder"}</span>
              </li>
              <li className="text-muted-foreground/50 line-through flex items-center gap-3">
                <XMarker />
                <span>{dir === "rtl" ? "تصفح هادئ وبدون إعلانات" : "Ad-free quiet browsing"}</span>
              </li>
            </ul>
          </div>
          
          <button disabled className="mt-8 w-full py-3 bg-secondary text-secondary-foreground rounded-xl text-xs font-semibold cursor-not-allowed">
            {dir === "rtl" ? "خطتك الحالية" : "Your Current Plan"}
          </button>
        </div>

        {/* 2. PREMIUM PLAN (POPULAR / STRIPE TARGET) */}
        <div className="bg-card border-2 border-primary rounded-2xl p-8 relative flex flex-col justify-between min-h-[520px] shadow-md transform lg:-translate-y-2">
          <div className="absolute top-0 -translate-y-1/2 start-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-extrabold uppercase tracking-widest px-4 py-1 rounded-full shadow-sm">
            {dir === "rtl" ? "الأكثر اختياراً" : "Most Popular"}
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Zap size={18} className="text-amber-500 fill-amber-500/10" />
              {dir === "rtl" ? "ميزان بريميوم" : "Mizan Premium"}
            </h3>
            <p className="mt-2 text-xs text-muted-foreground">
              {dir === "rtl" ? "للمحامين والباحثين عن الكفاءة والسرعة المطلقة." : "For legal consultants, lawyers, and serious researchers."}
            </p>
            <div className="mt-6 flex items-baseline text-foreground">
              <span className="text-4xl font-extrabold tracking-tight">49</span>
              <span className="ms-1 text-sm font-semibold text-muted-foreground">{dir === "rtl" ? "درهم / شهرياً" : "MAD / month"}</span>
            </div>
            
            <ul className="mt-8 space-y-4 text-sm text-foreground">
              <li className="flex items-center gap-3">
                <Check size={16} className="text-emerald-500 shrink-0" />
                <span className="font-medium">{dir === "rtl" ? "إخفاء تام للإعلانات بنسبة 100%" : "100% Ad-Free Experience"}</span>
              </li>
              <li className="flex items-center gap-3">
                <Check size={16} className="text-emerald-500 shrink-0" />
                <span>{dir === "rtl" ? "تحميل قوالب المذكرات بصيغة Word / PDF" : "Download document templates & briefs"}</span>
              </li>
              <li className="flex items-center gap-3">
                <Check size={16} className="text-emerald-500 shrink-0" />
                <span>{dir === "rtl" ? "الولوج للتعليقات الفقهية والتحليلات القضائية" : "Unlock jurisprudential deep-dives"}</span>
              </li>
              <li className="flex items-center gap-3">
                <Check size={16} className="text-emerald-500 shrink-0" />
                <span>{dir === "rtl" ? "دعم فني عالي الأولوية" : "Priority customer support ticket channel"}</span>
              </li>
            </ul>
          </div>
          
          <button 
            onClick={() => handleCheckoutRedirect("premium")}
            className="mt-8 w-full py-3 bg-primary text-primary-foreground rounded-xl text-xs font-bold shadow hover:opacity-95 transition-opacity"
          >
            {dir === "rtl" ? "اشترك الآن بأمان" : "Upgrade to Premium Instantly"}
          </button>
        </div>

        {/* 3. ENTERPRISE / UNIVERSITY PLAN */}
        <div className="bg-card border border-border rounded-2xl p-8 relative flex flex-col justify-between min-h-[500px] shadow-sm">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <GraduationCap size={18} className="text-indigo-500" />
              {dir === "rtl" ? "الولوج الجامعي" : "Institutional B2B"}
            </h3>
            <p className="mt-2 text-xs text-muted-foreground">
              {dir === "rtl" ? "شراكات الجامعات والمكاتب الكبرى." : "Enterprise licensing for entire law schools or firms."}
            </p>
            <div className="mt-6 flex items-baseline text-foreground">
              <span className="text-3xl font-extrabold tracking-tight">{dir === "rtl" ? "عقد مخصص" : "Custom"}</span>
            </div>
            
            <ul className="mt-8 space-y-4 text-sm text-muted-foreground">
              <li className="flex items-center gap-3">
                <Check size={16} className="text-indigo-500 shrink-0" />
                <span>{dir === "rtl" ? "تفعيل تلقائي بالبريد الجامعي الرسمي" : "Instant mapping via institutional email"}</span>
              </li>
              <li className="flex items-center gap-3">
                <Check size={16} className="text-indigo-500 shrink-0" />
                <span>{dir === "rtl" ? "لوحة تحكم إدارية للعمداء والمشرفين" : "Admin auditing panel for faculty leadership"}</span>
              </li>
              <li className="flex items-center gap-3">
                <Check size={16} className="text-indigo-500 shrink-0" />
                <span>{dir === "rtl" ? "تكامل مخصص مع أنظمة SSO التابعة لك" : "SAML / SSO connection compatibility"}</span>
              </li>
            </ul>
          </div>
          
          <button 
            onClick={() => handleCheckoutRedirect("enterprise")}
            className="mt-8 w-full py-3 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-xl text-xs font-semibold transition-colors"
          >
            {dir === "rtl" ? "تواصل مع قسم المبيعات" : "Contact Academic Sales"}
          </button>
        </div>

      </div>

      {/* Trust Footer */}
      <div className="mt-16 border-t pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-500" />
          <span>{dir === "rtl" ? "دفع آمن ومشفر 256-بت بواسطة Stripe" : "Securely processed and encrypted by Stripe"}</span>
        </div>
        <div className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
          <HelpCircle size={14} />
          <span>{dir === "rtl" ? "لديك بريد جامعي؟ تعلم كيف تلج مجاناً" : "Have an institutional email? Learn how to bind free"}</span>
        </div>
      </div>
    </div>
  );
}

// Minimalistic localized cancellation/X marker helper
function XMarker() {
  return (
    <svg className="w-4 h-4 text-muted-foreground/30 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}