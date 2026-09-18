-- Bsaha — schéma Supabase (à exécuter une fois dans SQL Editor, ou via l'API de gestion)
create table if not exists public.bsaha_docs (
  user_id uuid not null references auth.users(id) on delete cascade,
  coll text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, coll, id)
);
alter table public.bsaha_docs enable row level security;
drop policy if exists "bsaha own docs" on public.bsaha_docs;
create policy "bsaha own docs" on public.bsaha_docs
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
-- temps réel
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'bsaha_docs') then
    alter publication supabase_realtime add table public.bsaha_docs;
  end if;
end $$;
-- photos privées
insert into storage.buckets (id, name, public) values ('bsaha-photos', 'bsaha-photos', false)
  on conflict (id) do nothing;
drop policy if exists "bsaha photos own" on storage.objects;
create policy "bsaha photos own" on storage.objects
  for all to authenticated
  using (bucket_id = 'bsaha-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'bsaha-photos' and (storage.foldername(name))[1] = auth.uid()::text);
