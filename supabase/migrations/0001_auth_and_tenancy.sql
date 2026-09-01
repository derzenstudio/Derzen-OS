-- ═══════════════════════════════════════════════════════════════════════════
-- DERZEN · auth and tenancy schema
--
-- Everything the browser is not allowed to decide lives here. The bundle is a
-- static file on Hostinger that anyone can download and edit, so no check in
-- the client counts. These policies do.
--
-- Run with: supabase db push   (or paste into the SQL editor, in order)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── tenants ────────────────────────────────────────────────────────────────
create table if not exists public.tenants (
  id          uuid primary key default gen_random_uuid(),
  workspace   text not null,
  legal       text,
  subdomain   text unique,
  plan        text not null default 'Starter' check (plan in ('Starter','Scale','Enterprise')),
  currency    text not null default 'IDR',
  suspended   boolean not null default false,
  free_until  timestamptz,
  free_note   text,
  created_at  timestamptz not null default now()
);

-- ── who belongs to which tenant ────────────────────────────────────────────
create table if not exists public.tenant_members (
  user_id    uuid not null references auth.users(id) on delete cascade,
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  role       text not null default 'staff' check (role in ('owner','manager','staff')),
  created_at timestamptz not null default now(),
  primary key (user_id, tenant_id)
);

-- ── platform (developer console) seats ─────────────────────────────────────
create table if not exists public.platform_admins (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users(id) on delete cascade,
  email         text not null unique,
  name          text,
  role          text not null default 'admin' check (role in ('owner','admin')),
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);

-- ── helper predicates ──────────────────────────────────────────────────────
-- SECURITY DEFINER so a policy can consult the table without recursing into
-- that same table's own policy. search_path is pinned: without it a caller can
-- shadow `public` and hijack the lookup.
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

create or replace function public.is_platform_owner()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid() and role = 'owner');
$$;

create or replace function public.my_tenant_ids()
returns setof uuid language sql stable security definer set search_path = public, pg_temp as $$
  select tenant_id from public.tenant_members where user_id = auth.uid();
$$;

-- ── RLS: deny by default, then grant narrowly ──────────────────────────────
alter table public.tenants        enable row level security;
alter table public.tenant_members enable row level security;
alter table public.platform_admins enable row level security;

-- A tenant row is visible to its own members, and to platform admins.
drop policy if exists tenants_read on public.tenants;
create policy tenants_read on public.tenants for select to authenticated
  using (id in (select public.my_tenant_ids()) or public.is_platform_admin());

-- Only platform admins change plan, suspension, or a free-access grant.
-- A workspace owner editing their own billing is exactly what must not happen.
drop policy if exists tenants_admin_write on public.tenants;
create policy tenants_admin_write on public.tenants for update to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists members_read on public.tenant_members;
create policy members_read on public.tenant_members for select to authenticated
  using (user_id = auth.uid() or tenant_id in (select public.my_tenant_ids()) or public.is_platform_admin());

-- Seats are readable by admins only, and never writable from the browser:
-- there is no insert/update/delete policy, so the anon and authenticated roles
-- cannot touch this table at all. Changes go through Edge Functions holding
-- the service role key.
drop policy if exists platform_admins_read on public.platform_admins;
create policy platform_admins_read on public.platform_admins for select to authenticated
  using (user_id = auth.uid() or public.is_platform_admin());

-- ── login timestamp, callable by the seat itself only ──────────────────────
create or replace function public.touch_platform_login()
returns void language sql volatile security definer set search_path = public, pg_temp as $$
  update public.platform_admins set last_login_at = now() where user_id = auth.uid();
$$;
revoke all on function public.touch_platform_login() from public, anon;
grant execute on function public.touch_platform_login() to authenticated;

-- ── signup provisioning ────────────────────────────────────────────────────
-- One transaction creates the tenant and the owner membership. A client that
-- dies halfway cannot leave an auth user with no workspace.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  new_tenant uuid;
  ws text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'workspace'), ''), 'My workspace');
begin
  -- A platform seat is provisioned by admin-invite, not by this trigger.
  if exists (select 1 from public.platform_admins where email = lower(new.email)) then
    return new;
  end if;

  insert into public.tenants (workspace, legal, subdomain)
  values (ws, ws, regexp_replace(lower(ws), '[^a-z0-9]+', '-', 'g') || '-' || substr(new.id::text, 1, 6))
  returning id into new_tenant;

  insert into public.tenant_members (user_id, tenant_id, role)
  values (new.id, new_tenant, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED THE PLATFORM OWNER
--
-- Two steps, in this order:
--
--   1. Create the auth user once, in the Supabase dashboard:
--        Authentication > Users > Add user
--        email:    derzenstudio@gmail.com
--        password: generate a long random one, store it in a password manager
--        Tick "Auto confirm user".
--
--   2. Run the statement below. It reads the id back from auth.users, so no
--      password or hash is ever written into this repository.
--
-- Do NOT put the password in this file, in a VITE_ variable, or in CI.
-- ═══════════════════════════════════════════════════════════════════════════
insert into public.platform_admins (user_id, email, name, role)
select id, 'derzenstudio@gmail.com', 'Derzen Studio', 'owner'
from auth.users
where lower(email) = 'derzenstudio@gmail.com'
on conflict (user_id) do update set role = 'owner', email = excluded.email;

-- Fail loudly rather than leaving a console with no owner.
do $$
begin
  if not exists (select 1 from public.platform_admins where role = 'owner') then
    raise exception 'No platform owner was seeded. Create derzenstudio@gmail.com in Authentication > Users first, then re-run.';
  end if;
end $$;
