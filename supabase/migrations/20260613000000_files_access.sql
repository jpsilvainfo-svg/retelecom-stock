-- Políticas de acesso para os arquivos (Storage + metadados).
-- Consistente com o modelo atual de re_data (acesso via chave anon).
-- OBS: endurecer junto com o RLS geral quando o gateway server-side existir.

-- ── Metadados (re_files) ──────────────────────────────────────────────────
alter table public.re_files enable row level security;

drop policy if exists "anon_files" on public.re_files;
create policy "anon_files"
  on public.re_files for all
  to anon
  using (true) with check (true);

drop policy if exists "auth_files" on public.re_files;
create policy "auth_files"
  on public.re_files for all
  to authenticated
  using (true) with check (true);

-- ── Binários (Storage: bucket stocktel-files) ─────────────────────────────
drop policy if exists "stocktel_files_anon" on storage.objects;
create policy "stocktel_files_anon"
  on storage.objects for all
  to anon
  using (bucket_id = 'stocktel-files')
  with check (bucket_id = 'stocktel-files');

drop policy if exists "stocktel_files_auth" on storage.objects;
create policy "stocktel_files_auth"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'stocktel-files')
  with check (bucket_id = 'stocktel-files');
