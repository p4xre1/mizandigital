// Cloudflare D1 client — calls your deployed Worker API
// Deploy a Worker at https://dash.cloudflare.com and set VITE_D1_API_URL in .env

const D1_API = import.meta.env.VITE_D1_API_URL as string | undefined;

async function d1Fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  if (!D1_API) throw new Error("VITE_D1_API_URL is not set");
  const res = await fetch(`${D1_API}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`D1 API error: ${res.status}`);
  return res.json() as Promise<T>;
}

// Example: fetch trending articles from D1 (edge-cached reads)
export async function getTrendingFromD1(limit = 10) {
  return d1Fetch<{ id: string; title: string; views: number }[]>(
    `/trending?limit=${limit}`
  );
}

// Example: log a page view event to D1 analytics table
export async function logPageViewToD1(path: string, referrer?: string) {
  return d1Fetch<void>("/analytics/pageview", {
    method: "POST",
    body: JSON.stringify({ path, referrer, ts: Date.now() }),
  });
}

// Example: fetch cached search results from D1
export async function searchD1(query: string) {
  return d1Fetch<{ id: string; title: string; slug: string; excerpt: string }[]>(
    `/search?q=${encodeURIComponent(query)}`
  );
}

export { d1Fetch };
