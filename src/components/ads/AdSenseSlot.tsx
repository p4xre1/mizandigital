import { useEffect, useRef } from "react";

// Extend global Window interface for Google AdSense
declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

export interface AdSenseProps {
  /** AdSense Slot ID */
  slotId: string;
  /** Optional Publisher Client ID override */
  adClient?: string;
  /** Ad format layout: auto, fluid, rectangle, horizontal, or vertical */
  format?: "auto" | "fluid" | "rectangle" | "horizontal" | "vertical";
  /** Full-width responsive layout toggle */
  responsive?: boolean;
  /** Optional custom CSS classes */
  className?: string;
}

const DEFAULT_CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT_ID as string) ||
  "ca-pub-1749032173858747";

const TEST_SLOT_IDS = new Set([
  "1234567890",
  "0987654321",
  "3344556677",
  "8899001122",
]);

export const AdSenseSlot = ({
  slotId,
  adClient = DEFAULT_CLIENT_ID,
  format = "auto",
  responsive = true,
  className = "",
}: AdSenseProps) => {
  const adRef = useRef<HTMLModElement>(null);
  const isInitialized = useRef(false);

  // 1. Detection for Development Environment & Test Slot IDs
  const isDevEnv =
    import.meta.env.DEV ||
    (typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname.includes("github.dev") ||
        window.location.hostname.includes("127.0.0.1") ||
        TEST_SLOT_IDS.has(slotId)));

  useEffect(() => {
    // Skip ad pushing in development mode or if already initialized for this slot
    if (isDevEnv || isInitialized.current) return;

    let rafId: number;

    const pushAd = () => {
      if (!adRef.current || isInitialized.current) return;

      // Ensure element is attached to DOM and has rendered dimensions to prevent AdSense TagError
      if (adRef.current.offsetWidth === 0) {
        rafId = requestAnimationFrame(pushAd);
        return;
      }

      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
        isInitialized.current = true;
      } catch (err) {
        console.warn("[AdSenseSlot] AdSense push error intercepted:", err);
      }
    };

    // Subresource script loader helper
    const ensureScriptAndPush = () => {
      const scriptSrc = "pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src*="${scriptSrc}"]`
      );

      if (!existingScript) {
        const script = document.createElement("script");
        script.src = `https://${scriptSrc}?client=${adClient}`;
        script.async = true;
        script.defer = true;
        script.crossOrigin = "anonymous";
        script.onload = () => pushAd();
        script.onerror = () =>
          console.warn("[AdSenseSlot] Failed to load AdSense script.");
        document.head.appendChild(script);
      } else {
        pushAd();
      }
    };

    ensureScriptAndPush();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [slotId, adClient, isDevEnv]);

  // Reset initialization flag if slot ID changes dynamically
  useEffect(() => {
    isInitialized.current = false;
  }, [slotId]);

  // 2. Suppress ad rendering completely in Dev mode to avoid empty gaps or AdSense 400 errors
  if (isDevEnv) {
    return null;
  }

  return (
    <div
      className={`adsense-container w-full text-center overflow-hidden empty:hidden ${className}`}
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={adClient}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
};

export default AdSenseSlot;