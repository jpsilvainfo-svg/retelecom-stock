-- ============================================================
-- StockTel — Setup completo do Supabase
-- Execute no SQL Editor: supabase.com/dashboard → SQL Editor
-- ============================================================

-- 1. Garante que a tabela re_data existe
create table if not exists public.re_data (
  key        text primary key,
  value      jsonb,
  updated_at timestamptz default now()
);

-- 2. Habilita RLS na tabela re_data
alter table public.re_data enable row level security;

-- 3. Política: permite acesso total pela chave anon (app usa chave anon)
--    Isso mantém o sistema funcionando enquanto não migramos para Auth completo
drop policy if exists "anon_full_access" on public.re_data;
create policy "anon_full_access"
  on public.re_data
  for all
  to anon
  using (true)
  with check (true);

-- 4. Política: usuários autenticados também têm acesso total
drop policy if exists "auth_full_access" on public.re_data;
create policy "auth_full_access"
  on public.re_data
  for all
  to authenticated
  using (true)
  with check (true);

-- 5. Verifica se os dados existem
select key, updated_at,
  case
    when jsonb_typeof(value) = 'array' then jsonb_array_length(value)::text || ' registros'
    else jsonb_typeof(value)
  end as conteudo
from public.re_data
order by updated_at desc;
