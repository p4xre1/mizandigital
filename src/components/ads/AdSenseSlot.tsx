import { useEffect, useRef } from 'react';

interface AdSenseProps {
  slotId: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical';
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

  // 1. الفحص التلقائي لبيئة التطوير أو المعرفات التجريبية
  const isDevEnv =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname.includes('github.dev') ||
      window.location.hostname.includes('127.0.0.1') ||
      ['1234567890', '0987654321', '3344556677', '8899001122'].includes(slotId));

  useEffect(() => {
    // عدم إرسال أي طلبات إعلانية في بيئة التطوير أو عند التهيئة المسبقة
    if (isDevEnv || isInitialized.current) return;

    try {
      if (typeof window !== 'undefined' && adRef.current) {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        isInitialized.current = true;
      }
    } catch (err) {
      console.error('AdSense Push Error:', err);
    }
  }, [slotId, isDevEnv]);

  // 2. إلغاء عرض المكون نهائياً في بيئة التطوير لتجنب أي مساحات بيضاء أو أخطاء 400
  if (isDevEnv) {
    return null;
  }

  return (
    // 3. إزالة min-h-[90px] واستبدال my-4 بـ empty:hidden لمنع حجز مساحة إذا كان فارغاً
    <div className={`adsense-container w-full text-center overflow-hidden empty:hidden ${className}`}>
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