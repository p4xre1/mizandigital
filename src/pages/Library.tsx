import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase"; // Adjust to your path

interface Article {
  id: string;
  title: string;
  category_slug: string;
  school_slug: string;
  file_url: string;
}

export function Library() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    async function fetchDynamicArticles() {
      setLoading(true);
      
      let query = supabase.from("articles").select("*");
      
      if (selectedCategory !== "all") {
        query = query.eq("category_slug", selectedCategory);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Supabase error:", error.message);
      } else {
        setArticles(data || []);
      }
      setLoading(false);
    }

    fetchDynamicArticles();
  }, [selectedCategory]);

  // DYNAMIC COUNTS: Calculate directly from loaded data!
  const getCategoryCount = (slug: string) => {
    if (slug === "all") return articles.length;
    return articles.filter((a) => a.category_slug === slug).length;
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">المكتبة الرقمية ({articles.length} وثيقة)</h1>
      
      {/* Dynamic Articles List */}
      {loading ? (
        <p>جاري التحميل...</p>
      ) : articles.length === 0 ? (
        <p>لا توجد وثائق متاحة حالياً.</p>
      ) : (
        <div className="space-y-2 mt-4">
          {articles.map((item) => (
            <div key={item.id} className="p-3 border rounded-lg bg-card">
              <h3 className="font-bold">{item.title}</h3>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}