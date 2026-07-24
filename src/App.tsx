import { RouterProvider } from "react-router-dom";
import { router } from "@/routes";
import { I18nProvider } from "@/lib/i18n";

/**
 * Root Application Component for Mizan Digital (www.mizan.page)
 * Wraps the application with global state providers (I18n, Theme, Auth)
 * and renders the central client-side router.
 */
export default function App(): React.JSX.Element {
  return (
    <I18nProvider>
      <RouterProvider router={router} />
    </I18nProvider>
  );
}