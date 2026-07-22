// src/hooks/useNoIndex.ts
import { useEffect } from 'react';

export const useNoIndex = () => {
  useEffect(() => {
    const metaRobots = document.getElementById('meta-robots');
    if (metaRobots) {
      metaRobots.setAttribute('content', 'noindex, nofollow');
    }

    return () => {
      // إعادة الحالة للوضع الطبيعي عند مغادرة صفحة البروفايل
      if (metaRobots) {
        metaRobots.setAttribute('content', 'index, follow, max-image-preview:large');
      }
    };
  }, []);
};