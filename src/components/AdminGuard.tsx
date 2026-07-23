import React, { useEffect, useState } from "react";
import { useAdminAuth } from "../lib/adminAuth";
import { TurnstileCaptcha } from "./auth/TurnstileCaptcha"; // Corrected path to the auth folder

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const isAuthenticated = useAdminAuth();
  const [turnstileVerified, setTurnstileVerified] = useState(false);

  useEffect(() => {
    if (!isAuthenticated && typeof window !== "undefined") {
      // Hard redirect away from protected admin routes instantly
      window.location.replace("/admin/login");
    }
  }, [isAuthenticated]);

  // 1. Loading check for auth state
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground font-mono">
            Checking authorization...
          </p>
        </div>
      </div>
    );
  }

  // 2. Turnstile Verification Challenge
  if (!turnstileVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
        <div className="bg-card border border-border p-6 rounded-2xl shadow-lg max-w-sm w-full text-center space-y-4">
          <div className="space-y-1">
            <h2 className="font-bold text-lg text-foreground">Security Verification</h2>
            <p className="text-xs text-muted-foreground">
              Please complete the challenge below to access the admin portal.
            </p>
          </div>

          <TurnstileCaptcha
            onVerify={(token) => {
              console.log("Turnstile verified:", token);
              setTurnstileVerified(true);
            }}
            onError={() => setTurnstileVerified(false)}
            onExpire={() => setTurnstileVerified(false)}
          />
        </div>
      </div>
    );
  }

  // 3. Fully Authenticated and Verified
  return <>{children}</>;
}