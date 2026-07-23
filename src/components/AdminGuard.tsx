import React, { useEffect } from "react";
import { useAdminAuth } from "../lib/adminAuth";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const isAuthenticated = useAdminAuth();

  useEffect(() => {
    if (!isAuthenticated && typeof window !== "undefined") {
      // Hard redirect away from protected admin routes instantly
      window.location.replace("/admin/login");
    }
  }, [isAuthenticated]);

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

  return <>{children}</>;
}