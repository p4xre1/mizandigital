import { useCallback, useRef, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";

export function useTurnstile(siteKey: string) {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<any>(null);

  const resetCaptcha = useCallback(() => {
    setCaptchaToken(null);
    turnstileRef.current?.reset();
  }, []);

  const renderTurnstile = (onError: () => void) => (
    <Turnstile
      ref={turnstileRef}
      siteKey={siteKey}
      onSuccess={(token) => setCaptchaToken(token)}
      onExpire={() => setCaptchaToken(null)}
      onError={onError}
    />
  );

  return { captchaToken, resetCaptcha, renderTurnstile };
}
