import { ReactNode } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react"; // 👈 تم إضافة أيقونة التحميل
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
  // 💡 تلميح: تأكد من إضافة isAuthenticated هنا إذا كنت تريد حماية المسارات العادية أيضاً
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-500 animate-spin" /> {/* 👈 الأيقونة الدوارة */}
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

  // 💡 2.5 Optional: Redirect unauthenticated users if trying to access regular protected routes
  // if (!requireAdmin && !isAuthenticated) {
  //   return <Navigate to={`/${lang}/auth`} replace />;
  // }

  // 3. Render protected children
  return <>{children}</>;
}