Issue	Fix	
`select-none` removed	Text is now selectable — better UX & accessibility	
Content dict in `useMemo`	Moved outside component — zero re-creation cost	
`getPath` recreated	Wrapped in `useCallback` with `[lang]` dependency	
AdSense crash	Added `scriptReady` check + 2s retry before pushing	
Index as `key`	Tags now use `tag` string; stats use `stat.label`	
Missing `aria-label`	Added to search input & form	
No search validation	Added empty-query error with localized message	
No loading state	`isSearching` disables input & shows `...`	
Icons missing `aria-hidden`	All decorative icons now hidden from screen readers	
`@ts-ignore`	Replaced with `@ts-expect-error` (self-documenting)	
Mixed-language label	Added `lang="ar"` attribute to Arabic text	
Added `useCallback` imports	`handleSearchSubmit` & `handleTagClick` are stable	
