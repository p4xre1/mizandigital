export const AdSenseSlot = ({
  slotId,
  adClient = DEFAULT_CLIENT_ID,
  format = "auto",
  responsive = true,
  className = "",
}: AdSenseProps) => {
  const adRef = useRef<HTMLModElement>(null);
  const isInitialized = useRef(false);
  const prevSlotId = useRef(slotId);

  const isDevEnv =
    import.meta.env.DEV ||
    (typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname.includes("github.dev") ||
        window.location.hostname.includes("127.0.0.1") ||
        TEST_SLOT_IDS.has(slotId)));

  // Reset initialization flag synchronously (before render commits/paints)
  // whenever slotId changes, so the push effect below sees the fresh value.
  if (prevSlotId.current !== slotId) {
    isInitialized.current = false;
    prevSlotId.current = slotId;
  }

  useEffect(() => {
    if (isDevEnv || isInitialized.current) return;

    let rafId: number;
    let attempts = 0;
    const MAX_ATTEMPTS = 50; // ~50 frames (~0.8s at 60fps) before giving up

    const pushAd = () => {
      if (!adRef.current || isInitialized.current) return;

      if (adRef.current.offsetWidth === 0) {
        if (attempts++ < MAX_ATTEMPTS) {
          rafId = requestAnimationFrame(pushAd);
        } else {
          console.warn(
            `[AdSenseSlot] Slot "${slotId}" never gained width, skipping push.`
          );
        }
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

  if (isDevEnv) {
    return null;
  }

  return (
    <div
      className={`adsense-container w-full text-center overflow-hidden empty:hidden ${className}`}
    >
      <ins
        key={slotId}
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