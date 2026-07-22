import React, { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { useI18n, sansFont, serifFont } from "@/lib/i18n";

interface ArticleCommentsProps {
  articleId: string;
  enabled?: boolean;
}

interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export default function ArticleComments({ enabled = true }: ArticleCommentsProps) {
  const { lang, dir } = useI18n();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");

  if (!enabled) {
    return (
      <div className="mt-10 pt-6 border-t border-border text-center text-xs text-slate-500 dark:text-slate-400">
        {lang === "ar" ? "التعليقات مغلقة لهذه المقالة." : "Comments are disabled for this article."}
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      author: lang === "ar" ? "زائر" : "Visitor",
      content: newComment.trim(),
      createdAt: new Date().toISOString(),
    };

    setComments((prev) => [comment, ...prev]);
    setNewComment("");
  };

  return (
    <section className="mt-10 pt-6 border-t border-border space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare size={18} className="text-primary" />
        <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: serifFont(lang) }}>
          {lang === "ar" ? "التعليقات" : "Comments"} ({comments.length})
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          rows={3}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={lang === "ar" ? "أضف تعليقك هنا..." : "Write a comment..."}
          className="w-full text-xs p-3 rounded-xl border border-border bg-card text-foreground outline-none focus:ring-2 focus:ring-primary resize-none"
          style={{ fontFamily: sansFont(lang) }}
          dir={dir}
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!newComment.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors min-h-[36px]"
            style={{ fontFamily: sansFont(lang) }}
          >
            <Send size={13} />
            <span>{lang === "ar" ? "إرسال" : "Submit"}</span>
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4" style={{ fontFamily: sansFont(lang) }}>
            {lang === "ar" ? "لا توجد تعليقات بعد. كن أول من يعلق!" : "No comments yet. Be the first to comment!"}
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="p-3 bg-card border border-border rounded-xl space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-foreground" style={{ fontFamily: sansFont(lang) }}>
                  {comment.author}
                </span>
                <span className="text-slate-400">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300" style={{ fontFamily: sansFont(lang) }}>
                {comment.content}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}