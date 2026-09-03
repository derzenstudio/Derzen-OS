create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  tokens int not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;
-- No browser client can read/write this, only the service role in the edge function.
