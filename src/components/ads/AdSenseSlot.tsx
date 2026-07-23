import { useEffect, useRef } from 'react';

interface AdSenseProps {
  slotId: string;
  format?: 'auto' | 'fluid' | 'rectangle';
  responsive?: boolean;
  className?: string;
}

export const AdSenseSlot = ({
  slotId,
  format = 'auto',
  responsive = true,
  className = '',
}: AdSenseProps) => {
  const adRef = useRef<HTMLModElement>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    // لمنع استدعاء الإعلان أكثر من مرة في بيئة React 18/19 StrictMode
    if (isInitialized.current) return;

    try {
      if (typeof window !== 'undefined' && adRef.current) {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        isInitialized.current = true;
      }
    } catch (err) {
      console.error('AdSense Push Error:', err);
    }
  }, []);

  return (
    <div className={`adsense-container my-4 text-center min-h-[90px] overflow-hidden ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-1749032173858747"
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
};

export default AdSenseSlot;