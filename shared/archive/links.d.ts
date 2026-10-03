// shared/archive/links.d.ts
// أنواع TypeScript فوق دوال روابط الأرشيف (shared/archive/links.js)،
// فلا تعيد الواجهة أو السكربتات كتابة المنطق نفسه في نسخة ثانية.

export declare function hasDownloadLink(value: unknown): boolean;
export declare function downloadLinkOf(item: unknown): string;
export declare function hasReadableText(item: unknown): boolean;
export declare function isArchivableItem(item: unknown): boolean;
export declare function archiveRank(item: unknown): number;
