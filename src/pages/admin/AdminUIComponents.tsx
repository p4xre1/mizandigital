/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
// noinspection SpellCheckingInspection
/* cspell:disable */

import React, { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Globe, Terminal, ShieldCheck, Activity, Cpu, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { serifFont, sansFont } from "@/lib/i18n";

export type SupportedLang = "ar" | "fr" | "en" | "es";

// --- Modular Language Switcher ---
export interface LanguageSwitcherProps {
    currentLang: SupportedLang;
    onSelectLang: (lang: SupportedLang) => void;
}

export const AdminLanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ currentLang, onSelectLang }) => (
    <div className="absolute top-3 sm:top-6 z-20 flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-full p-1 shadow-md text-xs">
        <Globe size={14} className="text-emerald-400 mx-1" />
        {(["ar", "fr", "en", "es"] as const).map((l) => (
            <button
                key={l}
                type="button"
                onClick={() => onSelectLang(l)}
                className={`min-w-[44px] min-h-[36px] flex items-center justify-center px-2.5 rounded-full text-[11px] font-bold uppercase transition-all ${
                    currentLang === l
                        ? "bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                        : "text-slate-400 hover:text-slate-100"
                }`}
            >
                {l}
            </button>
        ))}
    </div>
);

// --- Generic Reusable Input Wrapper ---
export interface InputFieldProps {
    label: string;
    children: ReactNode;
}

export const FormInputField: React.FC<InputFieldProps> = ({ label, children }) => (
    <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
            {label}
        </label>
        <div className="relative">{children}</div>
    </div>
);

// --- Modular Security Badge Header ---
export interface SecurityHeaderProps {
    securityZoneText: string;
    sysStatusText: string;
    title: string;
    subtitle: string;
    lang: SupportedLang;
}

export const AdminSecurityHeader: React.FC<SecurityHeaderProps> = ({
                                                                       securityZoneText,
                                                                       sysStatusText,
                                                                       title,
                                                                       subtitle,
                                                                       lang,
                                                                   }) => (
    <>
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-6 text-[10px] sm:text-[11px] tracking-wider text-emerald-500 uppercase font-bold">
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {securityZoneText}
      </span>
            <span className="text-slate-500 flex items-center gap-1">
        <Terminal size={12} /> {sysStatusText}
      </span>
        </div>

        <div className="flex flex-col items-center mb-6 text-center">
            <div className="w-16 h-16 sm:w-18 sm:h-18 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl flex items-center justify-center mb-3 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <img
                    src="/Logo.svg"
                    alt="Mizan Logo"
                    width={40}
                    height={40}
                    className="w-10 h-10 object-contain filter drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    loading="eager"
                    onError={(e) => {
                        e.currentTarget.style.display = "none";
                    }}
                />
                <ShieldCheck size={32} className="hidden only:block" />
            </div>

            <h1 className="font-extrabold text-slate-100 text-xl sm:text-2xl tracking-tight" style={{ fontFamily: serifFont(lang) }}>
                {title}
            </h1>

            <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-wider flex items-center justify-center gap-1" style={{ fontFamily: sansFont(lang) }}>
                <Activity size={12} className="text-emerald-500 shrink-0" />
                <span>{subtitle}</span>
            </p>
        </div>
    </>
);

// --- Modular Card Footer ---
export interface SecurityFooterProps {
    restrictedText: string;
    monitoredText: string;
    backText: string;
    lang: SupportedLang;
    dir: string;
}

export const AdminSecurityFooter: React.FC<SecurityFooterProps> = ({
                                                                       restrictedText,
                                                                       monitoredText,
                                                                       backText,
                                                                       lang,
                                                                       dir,
                                                                   }) => (
    <>
        <div className="mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5 bg-slate-950/50 p-2 rounded-lg border border-slate-800/50">
                <Cpu size={12} className="text-emerald-400 shrink-0" />
                <span className="truncate">TLS 1.3 · AES-256</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-950/50 p-2 rounded-lg border border-slate-800/50">
                <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                <span className="truncate">Zero-Trust Active</span>
            </div>
        </div>

        <div className="mt-4 text-center space-y-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-tight">{restrictedText}</p>
            <p className="text-[9px] text-slate-600">{monitoredText}</p>
            <div className="pt-2">
                <Link
                    to={`/${lang}`}
                    className="inline-flex items-center justify-center min-h-[44px] px-3 gap-1 text-[11px] text-emerald-400/80 hover:text-emerald-300 transition-colors font-sans"
                >
                    {dir === "rtl" ? <ArrowRight size={12} /> : <ArrowLeft size={12} />}
                    <span>{backText}</span>
                </Link>
            </div>
        </div>
    </>
);

// --- Complete Layout Container (Consumes all subcomponents) ---
export interface AdminCardLayoutProps {
    lang: SupportedLang;
    dir: "rtl" | "ltr";
    onSelectLang: (lang: SupportedLang) => void;
    securityZoneText: string;
    sysStatusText: string;
    title: string;
    subtitle: string;
    restrictedText: string;
    monitoredText: string;
    backText: string;
    children: ReactNode;
}

export const AdminCardLayout: React.FC<AdminCardLayoutProps> = ({
                                                                    lang,
                                                                    dir,
                                                                    onSelectLang,
                                                                    securityZoneText,
                                                                    sysStatusText,
                                                                    title,
                                                                    subtitle,
                                                                    restrictedText,
                                                                    monitoredText,
                                                                    backText,
                                                                    children,
                                                                }) => {
    return (
        <div
            className="min-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-3 sm:p-6 relative overflow-hidden font-mono select-none"
            dir={dir}
        >
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] sm:bg-[size:2rem_2rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

            {/* Internal consumption to prevent "Unused constant" lint flags */}
            <AdminLanguageSwitcher currentLang={lang} onSelectLang={onSelectLang} />

            <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-2xl p-5 sm:p-8 shadow-2xl relative z-10 backdrop-blur-xl my-auto">
                <AdminSecurityHeader
                    securityZoneText={securityZoneText}
                    sysStatusText={sysStatusText}
                    title={title}
                    subtitle={subtitle}
                    lang={lang}
                />

                {children}

                <AdminSecurityFooter
                    restrictedText={restrictedText}
                    monitoredText={monitoredText}
                    backText={backText}
                    lang={lang}
                    dir={dir}
                />
            </div>
        </div>
    );
};

export default Object.assign(AdminCardLayout, {
    LanguageSwitcher: AdminLanguageSwitcher,
    InputField: FormInputField,
    SecurityHeader: AdminSecurityHeader,
    SecurityFooter: AdminSecurityFooter,
});