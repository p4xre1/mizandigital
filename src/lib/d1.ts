// Cloudflare D1 client — calls your deployed Worker API
// Deploy a Worker at https://dash.cloudflare.com and set VITE_D1_API_URL in .env

const D1_API = (import.meta.env.VITE_D1_API_URL as string | undefined)?.replace(/\/$/, "");

async function d1Fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  if (!D1_API) {
    console.warn("VITE_D1_API_URL is not set. D1 database features are running in fallback mode.");
    throw new Error("VITE_D1_API_URL is not configured.");
  }

  const url = `${D1_API}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  try {
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "Unknown error");
      throw new Error(`D1 API error [${res.status}]: ${errorText}`);
    }

    return (await res.json()) as T;
  } catch (error) {
    console.error(`D1 Request Failed for endpoint ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Fetch trending legal articles from Cloudflare D1 (edge-cached reads)
 */
export async function getTrendingFromD1(limit = 10) {
  try {
    return await d1Fetch<{ id: string; title: string; views: number; slug: string }[]>(
      `/trending?limit=${limit}`
    );
  } catch {
    return [];
  }
}

/**
 * Log a page view event to D1 analytics table
 */
export async function logPageViewToD1(path: string, referrer?: string) {
  try {
    return await d1Fetch<{ success: boolean }>("/analytics/pageview", {
      method: "POST",
      body: JSON.stringify({
        path,
        referrer: referrer || (typeof document !== "undefined" ? document.referrer : ""),
        ts: Date.now(),
      }),
    });
  } catch {
    // Non-blocking background telemetry, fail silently
    return { success: false };
  }
}

/**
 * Fetch cached legal code search results from Cloudflare D1
 */
export async function searchD1(query: string) {
  if (!query.trim()) return [];

  try {
    return await d1Fetch<{ id: string; title: string; slug: string; excerpt: string }[]>(
      `/search?q=${encodeURIComponent(query)}`
    );
  } catch {
    return [];
  }
}

export { d1Fetch };