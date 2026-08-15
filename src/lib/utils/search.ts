// utils/search.ts

/**
 * Normalizes Arabic text by removing diacritics and unifying alefs/ta marbuta
 */
export function normalizeArabic(text: string = ""): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove unicode diacritics
    .replace(/[ًٌٍَُِّْ]/g, "")      // Remove Arabic vowels/tashkeel
    .replace(/[إأآء]/g, "ا")        // Normalize Alef variations & Hamza
    .replace(/ى/g, "ي")             // Normalize Alef Maqsura to Ya
    .replace(/ة/g, "ه")             // Normalize Ta Marbuta to Ha
    .toLowerCase()
    .trim();
}

/**
 * Enhanced search matcher for Arabic legal terms and articles
 */
export function containsText(source: string, search: string): boolean {
  if (!search.trim()) return true;
  return normalizeArabic(source).includes(normalizeArabic(search));
}