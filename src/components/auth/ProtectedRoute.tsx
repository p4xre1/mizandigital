import { ReactNode } from "react";
import { Navigate, useParams, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useRole, type Role } from "@/hooks/useRole";

interface ProtectedRouteProps {
  children: ReactNode;
  /** Legacy flag to mandate admin access (Admin, Security Admin, or Root) */
  requireAdmin?: boolean;
  /** Granular role list allowed to access this route */
  allowedRoles?: Role[];
  /** Custom fallback route path if access is denied */
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
  allowedRoles,
  redirectTo,
}: ProtectedRouteProps) {
  const { lang = "ar" } = useParams<{ lang?: string }>();
  const location = useLocation();
  const { role, isGuest, canManageUsers, isRoot, loading } = useRole();

  // 1. Show localized loading state while checking permissions
  if (loading) {
    const loadingText =
      lang === "ar"
        ? "جاري التحقق من الصلاحيات..."
        : lang === "fr"
        ? "Vérification des autorisations..."
        : lang === "es"
        ? "Verificando permisos..."
        : "Checking permissions...";

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-500 animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 font-semibold text-sm animate-pulse">
          {loadingText}
        </p>
      </div>
    );
  }

  // 2. Redirect Guests (unauthenticated users) to login page
  if (isGuest) {
    const loginTarget = `/${lang}/login`;
    return <Navigate to={loginTarget} state={{ from: location }} replace />;
  }

  // Determine standard fallback destination for unauthorized authenticated users
  const defaultFallback = `/${lang}`;
  const destination = redirectTo || defaultFallback;

  // 3. Root Role Override (Root has unrestricted access to everything)
  if (isRoot) {
    return <>{children}</>;
  }

  // 4. Handle Granular Role Restrictions (if allowedRoles prop is provided)
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(role)) {
      return <Navigate to={destination} replace />;
    }
  }

  // 5. Handle Legacy requireAdmin check (Admin, Security Admin, Root)
  if (requireAdmin && !canManageUsers) {
    return <Navigate to={destination} replace />;
  }

  // 6. Render protected children
  return <>{children}</>;
}