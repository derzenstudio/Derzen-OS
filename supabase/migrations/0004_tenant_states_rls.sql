-- 0004_tenant_states_rls.sql
-- Ensures the tenant_states persistence table exists in every environment and
-- is protected by tenant-isolating RLS. The application (src/lib/tenantPersist.ts)
-- upserts each tenant's workspace snapshot here so changes survive refresh on
-- both app.alvianpermana.art and dev.alvianpermana.art. Applied to production
-- 2026-09-03. Idempotent: safe to re-run.

create table if not exists public.tenant_states (
  tenant_id  uuid primary key references public.tenants(id) on delete cascade,
  state      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.tenant_states enable row level security;

-- Members of a tenant (or any platform admin) may read that tenant's state.
drop policy if exists tenant_states_read on public.tenant_states;
create policy tenant_states_read on public.tenant_states
  for select to authenticated
  using (tenant_id in (select public.my_tenant_ids()) or public.is_platform_admin());

-- Members of a tenant (or any platform admin) may write that tenant's state.
-- with check is required so upserts/inserts are permitted, not just reads.
drop policy if exists tenant_states_write on public.tenant_states;
create policy tenant_states_write on public.tenant_states
  for all to authenticated
  using (tenant_id in (select public.my_tenant_ids()) or public.is_platform_admin())
  with check (tenant_id in (select public.my_tenant_ids()) or public.is_platform_admin());

grant select, insert, update, delete on public.tenant_states to authenticated;
