import { useCallback, useRef, useState } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

export function useTurnstile(siteKey: string) {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  const resetCaptcha = useCallback(() => {
    setCaptchaToken(null);
    turnstileRef.current?.reset();
  }, []);

  const renderTurnstile = useCallback(
    (onError?: () => void) => (
      <Turnstile
        ref={turnstileRef}
        siteKey={siteKey}
        onSuccess={(token) => setCaptchaToken(token)}
        onExpire={() => setCaptchaToken(null)}
        onError={onError}
      />
    ),
    [siteKey]
  );

  return { captchaToken, resetCaptcha, renderTurnstile };
}