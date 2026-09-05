-- ═══ 0006: token ledger, the platform_state row, and realtime ═══
--
-- Applied by hand in the SQL editor on 2026-09-05 and recorded here so the
-- repo and the live schema agree. 0002_persistent_state.sql created
-- tenant_states but its platform_state half had never been run, and
-- 0005_ai_anon_usage.sql had never been run either - which is why the
-- untrusted rate limiter reported itself as "not-installed".
--
-- Every table here is written by the service role from an Edge Function and
-- is readable only through a policy. No browser writes any of it.

-- ── untrusted sliding-window ledger (was 0005, never applied) ────────
create table if not exists public.ai_anon_usage (id bigint generated always as identity primary key, bucket text not null, created_at timestamptz not null default now());
create index if not exists ai_anon_usage_bucket_ts_idx on public.ai_anon_usage (bucket, created_at desc);
alter table public.ai_anon_usage enable row level security;
revoke all on public.ai_anon_usage from anon, authenticated;

-- ── developer console state (the missing half of 0002) ──────────────
create table if not exists public.platform_state (id int not null primary key check (id = 1), state jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
alter table public.platform_state enable row level security;
drop policy if exists platform_state_read on public.platform_state;
create policy platform_state_read on public.platform_state for select to authenticated using (public.is_platform_admin());
drop policy if exists platform_state_write on public.platform_state;
create policy platform_state_write on public.platform_state for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
insert into public.platform_state (id, state) values (1, '{}'::jsonb) on conflict do nothing;

-- ── token ledger: one row per served ai-proxy call ──────────────────
-- scope is the bucket a call is billed to: "demo" for every untrusted caller
-- (demo workspaces, the dev console, visitors) or the tenant uuid for a
-- signed-in member. Only the service role inserts; there is no insert policy.
create table if not exists public.ai_token_usage (id bigint generated always as identity primary key, scope text not null, tenant_id text, user_id uuid, tier text not null default 'untrusted', surface text, provider text, model text, prompt_tokens int not null default 0, completion_tokens int not null default 0, total_tokens int not null default 0, latency_ms int, ok boolean not null default true, created_at timestamptz not null default now());
create index if not exists ai_token_usage_scope_ts_idx on public.ai_token_usage (scope, created_at desc);
alter table public.ai_token_usage enable row level security;
drop policy if exists ai_token_usage_admin_read on public.ai_token_usage;
create policy ai_token_usage_admin_read on public.ai_token_usage for select to authenticated using (public.is_platform_admin());

-- ── quotas: the console writes them, anyone may read the limit ────────
create table if not exists public.ai_token_quota (scope text primary key, plan text not null default 'demo', monthly_tokens bigint not null default 200000, updated_at timestamptz not null default now());
alter table public.ai_token_quota enable row level security;
drop policy if exists ai_token_quota_read on public.ai_token_quota;
create policy ai_token_quota_read on public.ai_token_quota for select to anon, authenticated using (true);
drop policy if exists ai_token_quota_write on public.ai_token_quota;
create policy ai_token_quota_write on public.ai_token_quota for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
insert into public.ai_token_quota (scope, plan, monthly_tokens) values ('demo','demo',200000) on conflict do nothing;

-- Month-to-date summary a surface may read for its own scope without being
-- able to read anyone else's rows.
create or replace function public.ai_token_summary(p_scope text) returns table (scope text, plan text, quota bigint, used bigint, calls bigint) language sql stable security definer set search_path = public as $fn$
  select p_scope, coalesce(q.plan, 'demo'), coalesce(q.monthly_tokens, 200000), coalesce(sum(u.total_tokens), 0)::bigint, count(u.id)::bigint
  from (select 1) z
  left join public.ai_token_quota q on q.scope = p_scope
  left join public.ai_token_usage u on u.scope = p_scope and u.created_at >= date_trunc('month', now())
  group by q.plan, q.monthly_tokens
$fn$;
grant execute on function public.ai_token_summary(text) to anon, authenticated;

-- ── realtime: app and dev observe the same rows changing ────────────
alter table public.tenant_states replica identity full;
alter table public.platform_state replica identity full;
do $$ begin alter publication supabase_realtime add table public.tenant_states; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.platform_state; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.ai_token_usage; exception when duplicate_object then null; end $$;
