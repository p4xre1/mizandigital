import { useParams } from "react-router-dom";
import { normalizeLang, type Lang } from "@/lib/i18n";

export function useLanguage(): Lang {
  const { lang } = useParams();
  return normalizeLang(lang);
}
