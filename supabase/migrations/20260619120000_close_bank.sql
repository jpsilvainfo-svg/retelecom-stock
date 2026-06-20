-- FECHA O BANCO: remove o acesso anônimo. A partir daqui, só usuários
-- autenticados (Supabase Auth) — e o servidor com service_role — acessam dados
-- e arquivos. As políticas "authenticated" e o service_role continuam valendo.
--
-- PRÉ-REQUISITO: SUPABASE_SERVICE_ROLE configurada no Vercel (as funções api/
-- usam para ler/gravar re_data), senão monitor/backup/suporte param.

drop policy if exists "anon_full_access" on public.re_data;
drop policy if exists "anon_files" on public.re_files;
drop policy if exists "stocktel_files_anon" on storage.objects;

-- Garante que as políticas de acesso autenticado existem (idempotente)
drop policy if exists "auth_full_access" on public.re_data;
create policy "auth_full_access" on public.re_data for all to authenticated using (true) with check (true);

drop policy if exists "auth_files" on public.re_files;
create policy "auth_files" on public.re_files for all to authenticated using (true) with check (true);

drop policy if exists "stocktel_files_auth" on storage.objects;
create policy "stocktel_files_auth" on storage.objects for all to authenticated
  using (bucket_id = 'stocktel-files') with check (bucket_id = 'stocktel-files');
