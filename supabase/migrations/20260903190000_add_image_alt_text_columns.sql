-- Add SEO alt-text columns for article cover images and news images.
-- These are nullable so existing rows remain valid; the frontend falls back
-- to the item's title when the alt text has not been filled in yet.

alter table public.articles
  add column if not exists cover_image_alt text;

alter table public.news
  add column if not exists image_alt text;

comment on column public.articles.cover_image_alt is 'Accessible/SEO alt text for the article cover image. Falls back to the article title when empty.';
comment on column public.news.image_alt is 'Accessible/SEO alt text for the news image. Falls back to the news title when empty.';
