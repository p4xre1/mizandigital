// ❌ Old (Incorrect path):
// import { Navbar } from "@/components/Navbar";

// ✅ New (Correct path):
import { Navbar } from "@/components/layout/Navbar";
import React from "react";
import { createBrowserRouter, Navigate, Outlet, useParams } from "react-router-dom";

const SUPPORTED_LANGS = ["ar", "fr", "en", "es"];

function MainLayout() {
  const { lang } = useParams<{ lang?: string }>();

  if (lang && !SUPPORTED_LANGS.includes(lang)) {
    return <Navigate to="/ar" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  const { lang, category, fieldSlug, docType, schoolSlug } = useParams();

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="p-4 bg-muted rounded-xl text-xs space-y-1 font-mono">
        <p><strong>Lang:</strong> {lang}</p>
        {category && <p><strong>Category:</strong> {category}</p>}
        {fieldSlug && <p><strong>Field:</strong> {fieldSlug}</p>}
        {docType && <p><strong>Document Type:</strong> {docType}</p>}
        {schoolSlug && <p><strong>School:</strong> {schoolSlug}</p>}
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/ar" replace />,
  },
  {
    path: "/:lang",
    element: <MainLayout />,
    children: [
      { index: true, element: <PlaceholderPage title="Home Page" /> },
      { path: "profile", element: <PlaceholderPage title="User Profile" /> },
      { path: "news", element: <PlaceholderPage title="News Center" /> },
      { path: "news/:category", element: <PlaceholderPage title="News Category" /> },
      { path: "library", element: <PlaceholderPage title="Digital Library" /> },
      { path: "fields/:fieldSlug", element: <PlaceholderPage title="Legal Field Detail" /> },
      { path: "documents/:docType", element: <PlaceholderPage title="Document Type Detail" /> },
      { path: "archive", element: <PlaceholderPage title="Legal Archive" /> },
      { path: "schools", element: <PlaceholderPage title="Law Schools Directory" /> },
      { path: "schools/:schoolSlug", element: <PlaceholderPage title="Law School Detail" /> },
      { path: "writer/editor", element: <PlaceholderPage title="Writer Article Editor" /> },
      { path: "admin", element: <PlaceholderPage title="Admin Dashboard" /> },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/ar" replace />,
  },
]);