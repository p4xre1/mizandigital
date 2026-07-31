const BLOCKED_PATTERNS = [/on\w+=/gi, /javascript:/gi, /data:/gi, /<script[\s>]/gi];

export function sanitizeHtml(input: string) {
  return BLOCKED_PATTERNS.reduce((value, pattern) => value.replace(pattern, ""), input);
}
