interface LastUpdatedBadgeProps {
  updatedAt: string;
}

export function LastUpdatedBadge({ updatedAt }: LastUpdatedBadgeProps) {
  return <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium">Updated {updatedAt}</span>;
}
