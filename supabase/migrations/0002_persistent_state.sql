-- ── tenant persistence ─────────────────────────────────────────────────────
create table if not exists public.tenant_states (
  tenant_id uuid not null references public.tenants(id) on delete cascade primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.tenant_states enable row level security;
create policy tenant_states_read on public.tenant_states for select to authenticated
  using (tenant_id in (select public.my_tenant_ids()) or public.is_platform_admin());
create policy tenant_states_write on public.tenant_states for all to authenticated
  using (tenant_id in (select public.my_tenant_ids()) or public.is_platform_admin());

-- ── platform persistence ───────────────────────────────────────────────────
create table if not exists public.platform_state (
  id int not null primary key check (id = 1),
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.platform_state enable row level security;
create policy platform_state_read on public.platform_state for select to authenticated
  using (public.is_platform_admin());
create policy platform_state_write on public.platform_state for all to authenticated
  using (public.is_platform_admin());

insert into public.platform_state (id, state) values (1, '{}') on conflict do nothing;
