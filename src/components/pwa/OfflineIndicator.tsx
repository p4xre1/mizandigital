import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 md:left-auto md:w-80 bg-amber-900/90 text-amber-100 border border-amber-700/50 backdrop-blur-md px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 text-sm dir-rtl animate-in slide-in-from-bottom duration-300">
      <WifiOff className="w-5 h-5 text-amber-400 shrink-0" />
      <div>
        <p className="font-bold">وضع المحتوى المحفوظ (بدون إنترنت)</p>
        <p className="text-xs text-amber-200/80">يمكنك قراءة النصوص والقوانين المحفوظة محلياً.</p>
      </div>
    </div>
  );
}