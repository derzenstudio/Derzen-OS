-- 0003_tenant_ai_keys.sql
-- Where per-tenant AI provider credentials live.
-- The browser never reads this table: RLS is on and there are deliberately
-- no policies, so only the service role (the ai-proxy edge function) can
-- see it. Each tenant gets its own key, its own cap and its own model.

create table if not exists public.tenant_ai_keys (
  tenant_id           uuid        not null references public.tenants (id) on delete cascade,
  provider            text        not null check (provider in ('anthropic','groq','openrouter','gemini')),
  api_key             text        not null,
  model               text        null,
  daily_token_cap     integer     not null default 200000,
  max_tokens_per_call integer     not null default 1500,
  active              boolean     not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint tenant_ai_keys_pkey primary key (tenant_id, provider)
);

alter table public.tenant_ai_keys enable row level security;
revoke all on public.tenant_ai_keys from anon, authenticated;

drop trigger if exists tenant_ai_keys_touch on public.tenant_ai_keys;
create trigger tenant_ai_keys_touch
  before update on public.tenant_ai_keys
  for each row execute function public.touch_updated_at();
