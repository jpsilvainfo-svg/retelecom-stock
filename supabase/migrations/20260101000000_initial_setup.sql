-- ============================================================
-- StockTel — Migração inicial
-- Garante que a tabela re_data existe com RLS configurado
-- ============================================================

-- 1. Cria tabela principal de dados (se não existir)
create table if not exists public.re_data (
  key        text primary key,
  value      jsonb,
  updated_at timestamptz default now()
);

-- 2. Habilita Row Level Security
alter table public.re_data enable row level security;

-- 3. Política: acesso total para chave anon (app usa chave pública)
drop policy if exists "anon_full_access" on public.re_data;
create policy "anon_full_access"
  on public.re_data
  for all
  to anon
  using (true)
  with check (true);

-- 4. Política: acesso total para usuários autenticados
drop policy if exists "auth_full_access" on public.re_data;
create policy "auth_full_access"
  on public.re_data
  for all
  to authenticated
  using (true)
  with check (true);

-- 5. Índice para performance em buscas por key
create index if not exists re_data_key_idx on public.re_data (key);
create index if not exists re_data_updated_idx on public.re_data (updated_at desc);
