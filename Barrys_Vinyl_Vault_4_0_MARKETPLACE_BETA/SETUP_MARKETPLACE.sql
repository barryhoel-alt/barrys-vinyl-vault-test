-- Run in Supabase SQL Editor ONLY after reviewing the beta. Creates NEW tables; does not modify vault_collections.
create extension if not exists pgcrypto;
create table if not exists public.marketplace_listings (
 id uuid primary key default gen_random_uuid(), seller_id uuid not null references auth.users(id) on delete cascade,
 artist text not null check(length(artist) between 1 and 160), album text not null check(length(album) between 1 and 160),
 listing_type text not null check(listing_type in ('sale','trade','both')),
 asking_price numeric(12,2) not null default 0 check(asking_price between 0 and 999999),
 currency text not null default 'CAD' check(currency in ('CAD','USD','GBP','EUR','AUD','JPY')),
 condition text not null default '' check(length(condition)<=80), pressing text not null default '' check(length(pressing)<=200),
 region text not null default '' check(length(region)<=120), description text not null default '' check(length(description)<=1500),
 image_url text check(image_url is null or (length(image_url)<=2000 and image_url ~ '^https://')),
 status text not null default 'active' check(status in ('active','withdrawn','sold','traded')),
 created_at timestamptz not null default now()
);
alter table public.marketplace_listings enable row level security;
create policy "Public can view active listings" on public.marketplace_listings for select using(status='active' or seller_id=(select auth.uid()));
create policy "Owners create their listings" on public.marketplace_listings for insert to authenticated with check(seller_id=(select auth.uid()) and status='active');
create policy "Owners update their listings" on public.marketplace_listings for update to authenticated using(seller_id=(select auth.uid())) with check(seller_id=(select auth.uid()));
create table if not exists public.marketplace_offers (
 id uuid primary key default gen_random_uuid(), listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
 buyer_id uuid not null references auth.users(id) on delete cascade,
 offer_type text not null check(offer_type in ('buy','trade')),
 offer_amount numeric(12,2) check(offer_amount between 0 and 999999),
 currency text not null default 'CAD' check(currency in ('CAD','USD','GBP','EUR','AUD','JPY')),
 message text not null check(length(message) between 1 and 1000),
 status text not null default 'pending' check(status in ('pending','declined','accepted')),
 created_at timestamptz not null default now()
);
alter table public.marketplace_offers enable row level security;
create policy "Buyer and seller can view offers" on public.marketplace_offers for select to authenticated using(buyer_id=(select auth.uid()) or exists(select 1 from public.marketplace_listings l where l.id=listing_id and l.seller_id=(select auth.uid())));
create policy "Buyers can send offers on active listings" on public.marketplace_offers for insert to authenticated with check(buyer_id=(select auth.uid()) and status='pending' and exists(select 1 from public.marketplace_listings l where l.id=listing_id and l.status='active' and l.seller_id<>(select auth.uid())));
-- No offer UPDATE or DELETE policy in this beta. Payments and direct messaging are not implemented.
-- SECURITY NOTE: Before public launch, add rate limits, moderation, reporting, abuse controls, and server-side validation.
