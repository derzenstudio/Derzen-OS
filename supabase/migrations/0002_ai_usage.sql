-- 0002_ai_usage.sql
-- Daily token ledger written by the ai-proxy edge function.
-- ai-proxy upserts (user_id, day, tokens) with onConflict "user_id,day",
-- so the composite primary key below is what makes that upsert atomic.

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at := now();
  return new;
end;
$fn$;

create table if not exists public.ai_usage (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  day        date        not null default (now() at time zone 'utc')::date,
  tokens     integer     not null default 0,
  tenant_id  uuid        null     references public.tenants (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint ai_usage_pkey primary key (user_id, day),
  constraint ai_usage_tokens_nonneg check (tokens >= 0)
);

create index if not exists ai_usage_day_idx on public.ai_usage (day desc);
create index if not exists ai_usage_tenant_day_idx on public.ai_usage (tenant_id, day desc);

alter table public.ai_usage enable row level security;

drop policy if exists ai_usage_read_own on public.ai_usage;
create policy ai_usage_read_own
  on public.ai_usage
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_platform_admin());

drop trigger if exists ai_usage_touch on public.ai_usage;
create trigger ai_usage_touch
  before update on public.ai_usage
  for each row execute function public.touch_updated_at();
