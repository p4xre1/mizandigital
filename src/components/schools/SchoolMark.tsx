import { cityTheme, starPolygon } from "@/lib/schools/cityTheme";

interface Props {
  name: string;
  city?: string | null;
  logoUrl?: string | null;
  className?: string;
}

/**
 * علامة الكلية: الشعار إن وُجد، وإلا نجمة زليج بهوية المدينة.
 * الحرف الأول لم يعد يُعرض وحده، لأنه كان متطابقاً بين كل الكليات.
 */
export function SchoolMark({ name, city, logoUrl, className = "size-11" }: Props) {
  if (logoUrl) {
    return <img src={logoUrl} alt={name} loading="lazy" className={`${className} shrink-0 rounded-xl border border-[#e2e8f0] bg-white object-contain p-1 dark:border-[#334155]`} />;
  }
  const theme = cityTheme(city);
  const gradientId = `city-grad-${(city ?? "x").length}-${theme.from.slice(1)}`;
  return (
    <svg
      role="img"
      aria-label={`شعار المدينة: ${city ?? name}`}
      viewBox="0 0 48 48"
      className={`${className} shrink-0 rounded-xl shadow-sm`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={theme.from} />
          <stop offset="1" stopColor={theme.to} />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill={`url(#${gradientId})`} />
      <polygon points={starPolygon(theme.points, theme.inner, 48)} fill="none" stroke={theme.accent} strokeWidth="1.2" strokeLinejoin="round" opacity="0.85" />
      <circle cx="24" cy="24" r="6" fill={theme.accent} opacity="0.9" />
      <text x="24" y="27.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="#ffffff">
        {(city ?? name).trim().charAt(0)}
      </text>
    </svg>
  );
}

export default SchoolMark;
