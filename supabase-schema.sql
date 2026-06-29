-- ============================================================
-- Project Kritagyata — Donations schema for Supabase
-- Run this entire file once in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 0) Required extension
-- gen_random_uuid() (used below as the default for id and to generate
-- client tokens) depends on pgcrypto. Most Supabase projects have this
-- enabled already, but this line makes the script work even if it isn't —
-- running it again if already enabled is a harmless no-op.
create extension if not exists pgcrypto;

-- 1) Table: donations
-- Stores every donation form submission exactly as captured in the UI:
--   - donor_name      -> the "Your Name" field
--   - amount          -> the "Amount (₹)" field
--   - screenshot_url  -> public URL of the uploaded payment screenshot
--                        (column is nullable for safety, even though the
--                        current UI requires a screenshot before the
--                        Confirm Donation button becomes clickable)
--   - status          -> lifecycle of the submission, defaults to 'submitted'
--   - client_token    -> a UUID generated in the browser per form session, used to prevent duplicate inserts
--                        if a request is retried (e.g. double-click, flaky network retry)
create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  donor_name text not null,
  amount numeric(12,2) not null check (amount > 0),
  screenshot_url text,
  status text not null default 'submitted' check (status in ('submitted','verified','rejected')),
  client_token uuid not null,
  created_at timestamptz not null default now()
);

-- Enforce one row per client_token at the database level.
-- This is the real duplicate-submission guard: even if the client-side
-- disable-button logic is bypassed (double click, replayed request, etc.),
-- Postgres itself will reject the second insert with the same client_token.
create unique index if not exists donations_client_token_key
  on public.donations (client_token);

-- Helpful index for any future admin dashboard / reporting queries.
create index if not exists donations_created_at_idx
  on public.donations (created_at desc);

-- ============================================================
-- 2) Row Level Security
-- ============================================================
alter table public.donations enable row level security;

-- Public, anonymous users (the website, using the publishable/anon key)
-- may INSERT new donation rows. This is what lets the donation form work
-- without requiring visitors to log in.
drop policy if exists "Anyone can submit a donation" on public.donations;
create policy "Anyone can submit a donation"
  on public.donations
  for insert
  to anon, authenticated
  with check (true);

-- No one using the anon/public key can read, update, or delete donation
-- rows. This keeps donor names/amounts private from the public website —
-- only accessible via the Supabase dashboard or a service_role key on a
-- trusted backend (never exposed to the browser).
-- (No SELECT/UPDATE/DELETE policies are created, and RLS defaults to
--  deny-all for anything without a matching policy, so this is already
--  enforced — these comments just document that intentional omission.)

-- ============================================================
-- 3) Storage bucket for payment screenshots
-- ============================================================
insert into storage.buckets (id, name, public)
values ('payment-screenshots', 'payment-screenshots', true)
on conflict (id) do nothing;

-- Allow anyone (anon) to upload a screenshot into this bucket.
drop policy if exists "Anyone can upload a payment screenshot" on storage.objects;
create policy "Anyone can upload a payment screenshot"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'payment-screenshots');

-- Allow public read access so the stored public URL actually resolves
-- (needed since the bucket serves files via public URLs, not signed URLs).
drop policy if exists "Payment screenshots are publicly readable" on storage.objects;
create policy "Payment screenshots are publicly readable"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'payment-screenshots');

-- No update/delete policies for anon — uploaded screenshots cannot be
-- altered or removed by public website visitors once submitted.

-- ============================================================
-- Done. After running this:
--   Table editor → donations           (see submitted rows)
--   Storage → payment-screenshots      (see uploaded screenshots)
-- ============================================================
