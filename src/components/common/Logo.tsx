import React from "react";
// Fixed: Go up 2 levels (../../) to reach src/lib
import { useI18n, serifFont } from "../../lib/i18n";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}

export function Logo({
  className = "",
  showText = true,
  size = "md",
  onClick,
}: LogoProps) {
  const { lang } = useI18n();

  const dimensions = {
    sm: { icon: 28, text: "text-lg", subtitle: "text-[9px]" },
    md: { icon: 36, text: "text-xl", subtitle: "text-[10px]" },
    lg: { icon: 48, text: "text-3xl", subtitle: "text-[12px]" },
  }[size];

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      {/* Logo SVG Image from /public/logo.svg */}
      <div className="relative flex items-center justify-center shrink-0">
        <img
          src="/logo.svg"
          alt="Mizan Logo"
          width={dimensions.icon}
          height={dimensions.icon}
          className="transition-transform duration-200 hover:scale-105 object-contain"
        />
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col leading-none">
          <span
            className={`font-bold tracking-tight text-foreground ${dimensions.text}`}
            style={{ fontFamily: serifFont(lang) }}
          >
            {lang === "ar" ? "ميزان" : "Mizan"}
          </span>
          <span
            className={`font-extrabold tracking-wider text-primary uppercase opacity-90 mt-0.5 ${dimensions.subtitle}`}
          >
            {lang === "ar" ? "الرقمية" : "Digital"}
          </span>
        </div>
      )}
    </div>
  );
}

export default Logo;