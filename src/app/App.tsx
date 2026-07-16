import { RouterProvider } from "react-router"; // استيراد موفر المسارات المعتمد في مشروعك
import { router } from "../imports/routes";    // استيراد الموجه المدمج الذي أصلحناه للتو

export default function App() {
  return (
    // تمرير شجرة المسارات لتبدأ المنصة بالعمل والتنقل بسلاسة
    <RouterProvider router={router} />
  );
}