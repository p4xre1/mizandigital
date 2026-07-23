import { ReactNode } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useRole } from "@/hooks/useRole";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
}: ProtectedRouteProps) {
  const { lang = "ar" } = useParams<{ lang?: string }>();

  // Role verification from hook (checks if role === "root" || role === "security_admin")
  const { isAdmin, isLoading } = useRole();

  // 1. Show localized loading state while checking permissions
  if (isLoading) {
    const loadingText =
      lang === "ar"
        ? "جاري التحقق من الصلاحيات..."
        : lang === "fr"
        ? "Vérification des autorisations..."
        : lang === "es"
        ? "Verificando permisos..."
        : "Checking permissions...";

    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-500 dark:text-slate-400 font-semibold text-sm animate-pulse">
          {loadingText}
        </p>
      </div>
    );
  }

  // 2. Redirect unprivileged users attempting to access admin routes
  if (requireAdmin && !isAdmin) {
    return <Navigate to={`/${lang}`} replace />;
  }

  // 3. Render protected children
  return <>{children}</>;
}