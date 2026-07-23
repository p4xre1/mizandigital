import { ReactNode } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useRole } from "@/hooks/useRole"; // Adjust import path if needed

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { lang = "ar" } = useParams();
  
  // Use `isAdmin` provided by your hook (which checks if role === "root" || role === "security_admin")
  const { isAdmin, isLoading } = useRole();

  // 1. Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground font-semibold">جاري التحقق من الصلاحيات...</p>
      </div>
    );
  }

  // 2. Admin Check using the built-in boolean helper
  if (requireAdmin && !isAdmin) {
    return <Navigate to={`/${lang}`} replace />;
  }

  // 3. Authorized -> Render Admin Dashboard
  return <>{children}</>;
}