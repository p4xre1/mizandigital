import { useEffect } from "react";
import { useLocation } from "react-router";
import { logTraffic } from "./adminStore";
import { trackEvent } from "./analytics";

// ── Referral / traffic-source attribution ───────────────────────────────────────
// Captures WHERE a visitor came from: UTM params on the URL (from our own
// share links) plus the document referrer for organic/social traffic. Every
// page view is attributed and stored so the admin can see traffic sources.

const SESSION_KEY = "mizan_attribution";

interface Attribution {
  source: string; medium: string; campaign: string; referrer: string;
}

function classifyReferrer(ref: string): { source: string; medium: string } {
  if (!ref) return { source: "direct", medium: "none" };
  let host = "";
  try { host = new URL(ref).hostname.replace(/^www\./, ""); } catch { /* ignore */ }
  if (host.includes("google.")) return { source: "google", medium: "organic" };
  if (host.includes("bing.") || host.includes("duckduckgo.")) return { source: host.split(".")[0], medium: "organic" };
  if (host.includes("facebook") || host.includes("fb.")) return { source: "facebook", medium: "social" };
  if (host.includes("t.co") || host.includes("twitter") || host.includes("x.com")) return { source: "twitter", medium: "social" };
  if (host.includes("instagram")) return { source: "instagram", medium: "social" };
  if (host.includes("linkedin")) return { source: "linkedin", medium: "social" };
  if (host.includes("whatsapp") || host.includes("wa.me")) return { source: "whatsapp", medium: "social" };
  if (host.includes("t.me") || host.includes("telegram")) return { source: "telegram", medium: "social" };
  if (host && host !== window.location.hostname) return { source: host, medium: "referral" };
  return { source: "direct", medium: "none" };
}

/** Resolve attribution for the current entry, preferring explicit UTM params. */
function resolveAttribution(search: string): Attribution {
  const params = new URLSearchParams(search);
  const utmSource = params.get("utm_source");
  const referrer = document.referrer || "";
  if (utmSource) {
    return {
      source: utmSource,
      medium: params.get("utm_medium") || "referral",
      campaign: params.get("utm_campaign") || "",
      referrer,
    };
  }
  // Persist first-touch classification for the session.
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  const { source, medium } = classifyReferrer(referrer);
  const attr: Attribution = { source, medium, campaign: "", referrer };
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(attr)); } catch { /* ignore */ }
  return attr;
}

/** Hook: attribute + log every route change. Mount once in the root layout. */
export function useReferralTracking() {
  const location = useLocation();
  useEffect(() => {
    const attr = resolveAttribution(location.search);
    logTraffic({ path: location.pathname, ...attr });
    trackEvent("traffic_source", { ...attr, path: location.pathname });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);
}

// ── Share-link builder ──────────────────────────────────────────────────────────
export interface ShareTarget {
  key: string;
  label: string;
  build: (url: string, title: string) => string;
}

/** Append UTM params so inbound clicks from a share are attributed to the source. */
export function withUtm(url: string, source: string, campaign: string): string {
  const u = new URL(url, window.location.origin);
  u.searchParams.set("utm_source", source);
  u.searchParams.set("utm_medium", "share");
  if (campaign) u.searchParams.set("utm_campaign", campaign);
  return u.toString();
}

export const SHARE_TARGETS: ShareTarget[] = [
  { key: "whatsapp", label: "WhatsApp", build: (u, t) => `https://wa.me/?text=${encodeURIComponent(`${t} ${u}`)}` },
  { key: "twitter", label: "X / Twitter", build: (u, t) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(u)}` },
  { key: "facebook", label: "Facebook", build: (u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` },
  { key: "linkedin", label: "LinkedIn", build: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}` },
  { key: "telegram", label: "Telegram", build: (u, t) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}` },
  { key: "email", label: "Email", build: (u, t) => `mailto:?subject=${encodeURIComponent(t)}&body=${encodeURIComponent(u)}` },
];
