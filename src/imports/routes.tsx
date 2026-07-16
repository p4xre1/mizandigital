import { createBrowserRouter } from "react-router";

// Import layout wrapper from app/components
import Layout from "../app/components/Layout";

// Correctly relative-import your page views from app/pages
import Home from "../app/pages/Home";
import About from "../app/pages/About";
import Archive from "../app/pages/Archive";
import ArticleDetail from "../app/pages/ArticleDetail";
import Contact from "../app/pages/Contact";
import Legal from "../app/pages/Legal";
import Library from "../app/pages/Library";
import Login from "../app/pages/Login";
import Profile from "../app/pages/Profile";
import NotFound from "../app/pages/NotFound";

/**
 * Configure global routes with support for optional language routing keys
 * e.g., matches "/", "/ar/library", "/es/about", or "/contact"
 */
export const router = createBrowserRouter([
  {
    path: "/:lang?",
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: "about", element: <About /> },
      { path: "archive", element: <Archive /> },
      { path: "archive/:articleId", element: <ArticleDetail /> },
      { path: "contact", element: <Contact /> },
      { path: "legal", element: <Legal /> },
      { path: "library", element: <Library /> },
      { path: "login", element: <Login /> },
      { path: "profile", element: <Profile /> },
      { path: "*", element: <NotFound /> }
    ]
  }
]);