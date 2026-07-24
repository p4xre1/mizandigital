import React from "react";
import { Link } from "react-router-dom";
import { 
  FileText, 
  Download, 
  Eye, 
  Calendar, 
  HardDrive, 
  Tag, 
  ShieldCheck, 
  Scale,
  Hash,       
  BookOpen    
} from "lucide-react";

// 👈 قمنا بتصدير الواجهة (export) لكي يتمكن ملف Library.tsx من قراءتها بدون أخطاء
export interface LegalDocument {
  id: string;
  title: string;
  description: string;
  category: string;
  docType?: string;
  fileType: string;
  fileSize: string;
  publishDate: string;
  modifiedDate: string;
  authorOrPublisher: string;
  downloadUrl: string;
  viewUrl: string;
  tags: string[];
  isVerified?: boolean;
  pages?: number;          
  documentNumber?: string; 
}

export function DocumentCard({ doc, lang }: { doc: LegalDocument; lang: string }) {
  // Master SEO Structured Data (JSON-LD)
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "DigitalDocument",
    "name": doc.title,
    "description": doc.description,
    "fileFormat": doc.fileType === "PDF" ? "application/pdf" : "application/msword",
    "contentSize": doc.fileSize,
    "dateCreated": doc.publishDate,
    "dateModified": doc.modifiedDate,
    "numberOfPages": doc.pages, 
    "publisher": {
      "@type": "Organization",
      "name": doc.authorOrPublisher
    },
    "keywords": doc.tags.join(", "),
    "inLanguage": lang,
    "url": window.location.href
  };

  return (
    <article 
      itemScope 
      itemType="https://schema.org/DigitalDocument"
      className="group bg-card hover:bg-accent/5 border border-border hover:border-primary/40 rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-xs hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      {/* Dynamic SEO JSON-LD Injector */}
      <script type="application/ld+json">
        {JSON.stringify(schemaData)}
      </script>

      <div className="flex items-start gap-3.5 flex-1 min-w-0">
        <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0 group-hover:scale-105 transition-transform">
          <FileText size={24} />
        </div>

        <div className="space-y-2 min-w-0 flex-1">
          {/* Title & Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 itemProp="name" className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
              <Link to={doc.viewUrl}>{doc.title}</Link>
            </h3>
            {doc.isVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
                <ShieldCheck size={12} />
                <span>{lang === "ar" ? "موثق" : "Verified"}</span>
              </span>
            )}
          </div>

          {/* Metadata Row */}
          <div className="flex items-center gap-x-4 gap-y-1 text-xs text-muted-foreground flex-wrap font-medium">
            <span className="flex items-center gap-1">
              <Calendar size={13} className="text-amber-600" />
              <span className="text-[11px] font-semibold text-foreground">{lang === "ar" ? "تاريخ التعديل:" : "Modified:"}</span>
              <time itemProp="dateModified" dateTime={doc.modifiedDate}>
                {doc.modifiedDate}
              </time>
            </span>

            <span className="flex items-center gap-1 uppercase bg-muted px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold text-foreground border border-border">
              {doc.fileType}
            </span>

            <span className="flex items-center gap-1">
              <HardDrive size={13} />
              <span>{doc.fileSize}</span>
            </span>

            {/* عرض عدد الصفحات */}
            {doc.pages && (
              <span className="flex items-center gap-1">
                <BookOpen size={13} />
                <span>{doc.pages} {lang === "ar" ? "صفحة" : "Pages"}</span>
              </span>
            )}

            {/* عرض رقم الوثيقة */}
            {doc.documentNumber && (
              <span className="flex items-center gap-1">
                <Hash size={13} />
                <span>{lang === "ar" ? "رقم:" : "No:"} {doc.documentNumber}</span>
              </span>
            )}

            {doc.authorOrPublisher && (
              <span className="flex items-center gap-1 border-r rtl:border-r-0 rtl:border-l border-border px-2">
                <Scale size={13} className="text-primary" />
                <span itemProp="publisher">{doc.authorOrPublisher}</span>
              </span>
            )}
          </div>

          {/* Description for Search Indexing */}
          <p itemProp="description" className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {doc.description}
          </p>

          {/* Tags */}
          <div className="flex items-center gap-1.5 pt-1 flex-wrap">
            <Tag size={12} className="text-muted-foreground shrink-0" />
            {doc.tags.map((tag, idx) => (
              <span
                key={idx}
                className="text-[10px] font-semibold bg-secondary hover:bg-primary hover:text-primary-foreground text-secondary-foreground px-2 py-0.5 rounded-md transition-colors cursor-pointer"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center md:flex-col lg:flex-row gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border">
        <Link
          to={doc.viewUrl}
          className="flex-1 md:flex-none px-3.5 py-2 text-xs font-bold rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-colors flex items-center justify-center gap-1.5"
        >
          <Eye size={14} />
          <span>{lang === "ar" ? "معاينة" : "View"}</span>
        </Link>

        <a
          href={doc.downloadUrl}
          download
          className="flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-colors flex items-center justify-center gap-1.5"
        >
          <Download size={14} />
          <span>{lang === "ar" ? "تحميل" : "Download"}</span>
        </a>
      </div>
    </article>
  );
}