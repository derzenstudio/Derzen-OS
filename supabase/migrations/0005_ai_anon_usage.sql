-- 0005_ai_anon_usage.sql
-- Sliding-window rate limit for UNTRUSTED ai-proxy callers.
--
-- ai_usage (0002/0003) is keyed on auth.users and cannot hold demo-tenant or
-- marketing-visitor traffic, which has no Supabase user at all. Those callers
-- are now accepted on purpose so visitors can actually try the AI, which
-- makes the proxy an open endpoint on my own free provider keys. An in-memory
-- counter does not survive an edge cold start, so the ledger lives here.
--
-- One row per accepted untrusted request. Counting rows inside a time window
-- is a real sliding window, unlike a fixed-bucket counter that resets on the
-- minute and lets a burst through the seam.

create table if not exists public.ai_anon_usage (
  id         bigint generated always as identity primary key,
  -- sha-256 of (client ip + a server-side salt), never the raw address:
  -- the limiter only needs to tell callers apart, not identify them.
  -- The literal string "global" is also used, as a whole-endpoint ceiling.
  bucket     text        not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_anon_usage_bucket_ts_idx
  on public.ai_anon_usage (bucket, created_at desc);

-- RLS on with no policies at all: PostgREST sees nothing for anon or
-- authenticated, and only the service-role key inside the edge function
-- bypasses it. The client must never be able to read, reset or pad this.
alter table public.ai_anon_usage enable row level security;
revoke all on public.ai_anon_usage from anon, authenticated;

-- ai-proxy prunes opportunistically; this is the same cutoff expressed once
-- so a manual cleanup matches what the function does.
-- delete from public.ai_anon_usage where created_at < now() - interval '2 days';
