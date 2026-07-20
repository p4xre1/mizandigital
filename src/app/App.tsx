import React from "react";
import { RouterProvider } from "react-router";
import { router } from "../imports/routes";
import { I18nProvider } from "./lib/i18n";

/**
 * Root Application Component for Mizan Digital
 * Wraps the application with global state providers (I18n, Theme, Auth)
 * and renders the central client-side router.
 */
export default function App() {
  return (
    <React.StrictMode>
      <I18nProvider>
        <RouterProvider router={router} />
      </I18nProvider>
    </React.StrictMode>
  );
}