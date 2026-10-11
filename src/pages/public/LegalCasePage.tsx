import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AEOHead } from '@/components/seo/AEOHead';
import { canonicalFor } from '@/lib/canonical';
import { CasePlayer } from '@/components/cases/CasePlayer';

export default function LegalCasePage() {
  const { caseSlug = '' } = useParams();
  return <main className="container-wide max-w-4xl space-y-8 py-10" dir="rtl">
    <AEOHead
      title="من الواقعة إلى الحل — حالة قانونية تدريبية"
      description="حالة قانونية تدريبية مجانية: اقرأ الواقعة، خمّن الجواب، ثم اطلع على المواد المرجعية والشرح."
      canonicalUrl={canonicalFor(`/pro-tools/cases/${caseSlug}`)}
    />
    <Link className="inline-flex items-center gap-2 font-bold text-primary" to="/pro-tools/cases"><ArrowRight className="size-4" />كل الحالات</Link>
    <CasePlayer slug={caseSlug} />
  </main>;
}
