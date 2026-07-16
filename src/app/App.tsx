import { RouterProvider } from "react-router";
import { router } from "../imports/routes";
import { I18nProvider } from "./lib/i18n";

export default function App() {
  return (
    <I18nProvider>
      <RouterProvider router={router} />
    </I18nProvider>
  );
}
