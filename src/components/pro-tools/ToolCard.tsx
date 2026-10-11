import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bell, CalendarClock, FolderOpen, GitCompareArrows, Network, Scale, type LucideIcon } from 'lucide-react';
import type { Tool, ToolSlug } from '@/lib/pro-tools/model';
import '@/styles/pro-tools.css';

/** هوية بصرية ثابتة لكل أداة: أيقونة وتدرّج لونيّ. */
export const TOOL_THEME: Record<ToolSlug, { icon: LucideIcon; from: string; to: string }> = {
  references: { icon: Network, from: '#2563eb', to: '#7c3aed' },
  cases: { icon: Scale, from: '#d97706', to: '#dc2626' },
  versions: { icon: GitCompareArrows, from: '#0891b2', to: '#059669' },
  workspace: { icon: FolderOpen, from: '#4f46e5', to: '#0ea5e9' },
  alerts: { icon: Bell, from: '#e11d48', to: '#f97316' },
  deadlines: { icon: CalendarClock, from: '#65a30d', to: '#0d9488' },
};

export function ToolIcon({ slug, className = '' }: { slug: ToolSlug; className?: string }) {
  const theme = TOOL_THEME[slug] ?? TOOL_THEME.references;
  const Icon = theme.icon;
  const style = { '--pt-from': theme.from, '--pt-to': theme.to } as CSSProperties;
  return (
    <span className={`pt-icon ${className}`} style={style} aria-hidden>
      <Icon className="size-6" />
    </span>
  );
}

/** بطاقة الأداة في الكتالوج: ظهور متدرّج، ورفع عند التمرير، وشارة حالة. */
export function ToolCatalogCard({ tool, index }: { tool: Tool; index: number }) {
  const style = { '--pt-delay': `${index * 90}ms` } as CSSProperties;
  return (
    <Link
      to={`/pro-tools/${tool.slug}`}
      style={style}
      className="pt-rise pt-card group flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 no-underline"
    >
      <div className="flex items-start justify-between gap-3">
        <ToolIcon slug={tool.slug} />
        <span className={`pt-badge ${tool.enabled ? 'pt-badge--live' : 'pt-badge--soon'}`}>
          {tool.enabled ? 'مجانية' : 'قريباً'}
        </span>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-bold text-foreground/80">أداة {String(index + 1).padStart(2, '0')}</p>
        <h2 className="text-xl font-black leading-tight">{tool.title}</h2>
        <p className="text-base leading-7 text-foreground/80">{tool.description}</p>
      </div>
      <span className="mt-auto inline-flex items-center gap-2 font-bold text-primary">
        {tool.enabled ? 'فتح الأداة' : 'تفاصيل الأداة'}
        <ArrowLeft className="pt-arrow size-4" aria-hidden />
      </span>
    </Link>
  );
}

export default ToolCatalogCard;
