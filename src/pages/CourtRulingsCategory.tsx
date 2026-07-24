import * as React from "react";
import { useParams, Link } from "react-router";
import { COURT_RULINGS_AND_DOCTRINE } from "../data/courtRulingsData";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { BookOpen, Scale, ChevronRight } from "lucide-react";

export interface CourtRulingsCategoryProps {}

export const CourtRulingsCategory: React.FC<CourtRulingsCategoryProps> = (): React.JSX.Element => {
  const { slug } = useParams<{ slug?: string }>();

  // Locate matching category or subcategory
  const activeSubcategory = React.useMemo(() => {
    for (const category of COURT_RULINGS_AND_DOCTRINE) {
      const match = category.subcategories.find((sub) => sub.slug === slug);
      if (match) return { section: category, item: match };
    }
    return null;
  }, [slug]);

  if (!activeSubcategory) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold">Category Not Found</h1>
        <p className="text-muted-foreground mt-2">
          The requested legal section could not be found.
        </p>
        <Link
          to="/"
          className="inline-block mt-4 text-primary underline font-medium"
        >
          Return to Home
        </Link>
      </div>
    );
  }

  const { section, item } = activeSubcategory;

  return (
    <main className="container mx-auto px-4 py-8 sm:py-12 max-w-6xl">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6 overflow-x-auto whitespace-nowrap">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="size-4 shrink-0" />
        <span>{section.title}</span>
        <ChevronRight className="size-4 shrink-0" />
        <span className="font-semibold text-foreground">{item.title}</span>
      </nav>

      {/* Header Banner */}
      <div className="border-b pb-6 mb-8">
        <div className="flex items-center gap-3">
          {section.id === "court-rulings" ? (
            <Scale className="size-8 text-primary shrink-0" />
          ) : (
            <BookOpen className="size-8 text-primary shrink-0" />
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{item.title}</h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-1">
              {item.description}
            </p>
          </div>
        </div>
      </div>

      {/* Listing Feed Placeholder */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Placeholder cards for articles under this category */}
        {[1, 2, 3].map((idx) => (
          <Card key={idx} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">
                {item.title} Decision #{idx}024
              </CardTitle>
              <CardDescription className="text-xs">
                Published on July {20 + idx}, 2026
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-3">
                Legal summary and key jurisprudence details regarding this entry under {item.title.toLowerCase()}.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
};

export default CourtRulingsCategory;