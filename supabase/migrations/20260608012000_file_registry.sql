-- Registro de arquivos do StockTel.
-- Os binarios devem ficar no Supabase Storage; esta tabela guarda metadados por setor.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'stocktel-files',
  'stocktel-files',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do nothing;

create table if not exists public.re_files (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  owner_id text,
  related_key text,
  bucket text not null default 'stocktel-files',
  path text not null,
  filename text not null,
  content_type text,
  size_bytes bigint,
  created_by text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists re_files_module_idx on public.re_files(module);
create index if not exists re_files_related_key_idx on public.re_files(related_key);
