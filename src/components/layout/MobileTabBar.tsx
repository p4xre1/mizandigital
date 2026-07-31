import { Link } from "react-router-dom";

export function MobileTabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 px-4 py-2 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-lg justify-between text-sm font-medium">
        <Link to="/ar" className="text-primary">Home</Link>
        <Link to="/ar/news" className="text-muted-foreground">News</Link>
        <Link to="/ar/glossary" className="text-muted-foreground">Glossary</Link>
      </div>
    </nav>
  );
}
