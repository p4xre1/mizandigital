import React, { useState, useEffect } from 'react';

// Fallback placeholder SVG icon
function FallbackIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 88 88"
      className={className}
      stroke="currentColor"
      strokeLinejoin="round"
      fill="none"
      strokeWidth="3.7"
      aria-hidden="true"
    >
      <rect x="16" y="16" width="56" height="56" rx="6" />
      <path d="m16 58 16-18 32 32" />
      <circle cx="53" cy="35" r="7" />
    </svg>
  );
}

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const { src, alt, style, className, onError, loading = 'lazy', ...rest } = props;
  const [didError, setDidError] = useState(false);

  // Reset error state whenever the source image URL changes
  useEffect(() => {
    setDidError(false);
  }, [src]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setDidError(true);
    if (onError) {
      onError(e); // Preserve external error tracking from parent
    }
  };

  // Render fallback if image failed or if src is missing
  if (didError || !src) {
    return (
      <div
        className={`inline-flex items-center justify-center bg-muted/40 text-muted-foreground/50 dark:bg-zinc-800/50 dark:text-zinc-500 transition-colors ${className ?? ''}`}
        style={style}
        role="img"
        aria-label={alt || 'Image unavailable'}
      >
        <FallbackIcon className="w-1/2 h-1/2 max-w-[48px] max-h-[48px]" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt ?? ''}
      className={className}
      style={style}
      loading={loading}
      onError={handleError}
      {...rest}
    />
  );
}