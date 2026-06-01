-- StockTel: roteiro inicial para migrar para Supabase Auth + RLS.
-- Execute no SQL Editor do Supabase somente após criar/testar usuários em Auth.
-- Objetivo: senhas saem do frontend; permissões ficam em perfis vinculados ao auth.users.

create table if not exists public.re_profiles (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  legacy_id text,
  name text not null,
  login text unique not null,
  email text,
  role text not null check (role in ('superadmin','admin','estoque','tecnico','financeiro','mecanico')),
  perms jsonb not null default '[]'::jsonb,
  photo text,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.re_profiles enable row level security;
alter table public.re_data enable row level security;

create or replace function public.re_is_root()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.re_profiles
    where auth_user_id = auth.uid()
      and login = 'root'
      and role = 'superadmin'
  );
$$;

create or replace function public.re_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.re_profiles where auth_user_id = auth.uid();
$$;

drop policy if exists "profiles_read_self_or_root" on public.re_profiles;
create policy "profiles_read_self_or_root"
on public.re_profiles for select
using (auth_user_id = auth.uid() or public.re_is_root());

drop policy if exists "profiles_write_root_only" on public.re_profiles;
create policy "profiles_write_root_only"
on public.re_profiles for all
using (public.re_is_root())
with check (public.re_is_root());

drop policy if exists "data_read_authenticated" on public.re_data;
create policy "data_read_authenticated"
on public.re_data for select
using (auth.role() = 'authenticated');

drop policy if exists "data_write_admin_root" on public.re_data;
create policy "data_write_admin_root"
on public.re_data for insert
with check (public.re_is_root() or public.re_my_role() in ('admin','estoque','financeiro','mecanico'));

drop policy if exists "data_update_admin_root" on public.re_data;
create policy "data_update_admin_root"
on public.re_data for update
using (public.re_is_root() or public.re_my_role() in ('admin','estoque','financeiro','mecanico'))
with check (public.re_is_root() or public.re_my_role() in ('admin','estoque','financeiro','mecanico'));

-- Próximo passo manual:
-- 1. Criar usuários no Supabase Auth.
-- 2. Inserir cada auth_user_id correspondente em re_profiles.
-- 3. Remover campo pass de re_users no app após todos migrarem.
-- 4. Ajustar políticas por chave de re_data se quiser limitar técnico apenas a módulos permitidos.
