-- ==========================================================
-- GUIA DE BAIRRO — schema Supabase
-- Cole este arquivo inteiro em: Dashboard > SQL Editor > New query > Run
-- Pode rodar mais de uma vez (idempotente).
-- ==========================================================

-- ── Perfis ────────────────────────────────────────────────
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  tipo             text not null check (tipo in ('morador','anunciante')),
  nome             text not null,
  pais             char(2) not null,
  cep              text not null,
  cidade           text,
  uf               text,
  bairro           text,
  whatsapp         text,
  whatsapp_consent boolean not null default false,
  created_at       timestamptz not null default now(),
  -- WhatsApp só pode existir com consentimento
  constraint whatsapp_requires_consent check (whatsapp is null or whatsapp_consent)
);

-- ── Anúncios (oferta) ─────────────────────────────────────
create table if not exists public.anuncios (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  titulo         text,
  categoria      text,
  texto          text not null check (char_length(texto) between 5 and 2000),
  valor_a_partir numeric(12,2) not null check (valor_a_partir >= 0),
  pais           char(2) not null,
  cep            text not null,
  cidade         text,
  uf             text,
  bairro         text,
  fotos          text[] not null default '{}',
  video_url      text,                       -- somente link
  instagram      text,
  whatsapp_contato text,
  outras_redes   jsonb not null default '[]',
  created_at     timestamptz not null default now()
);
alter table public.anuncios add column if not exists titulo text;
alter table public.anuncios add column if not exists categoria text;
alter table public.anuncios add column if not exists whatsapp_contato text;
create index if not exists anuncios_cep_idx on public.anuncios (pais, cep);

-- ── Procuras (intenção de compra) ─────────────────────────
create table if not exists public.procuras (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  titulo        text,
  texto         text not null check (char_length(texto) between 5 and 1000),
  valor_maximo  numeric(12,2) not null check (valor_maximo > 0),
  pais          char(2) not null,
  cep           text not null,
  cidade        text,
  uf            text,
  bairro        text,
  status        text not null default 'ativo',
  whatsapp_contato text,
  created_at    timestamptz not null default now()
);
alter table public.procuras add column if not exists titulo text;
alter table public.procuras add column if not exists status text default 'ativo';
alter table public.procuras add column if not exists whatsapp_contato text;
create index if not exists procuras_cep_idx on public.procuras (pais, cep);

-- ── Cria o perfil automaticamente ao cadastrar ───────────
-- (funciona mesmo com confirmação de e-mail ligada)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  consent boolean := coalesce((m->>'whatsapp_consent')::boolean, false);
begin
  insert into public.profiles
    (id, tipo, nome, pais, cep, cidade, uf, bairro, whatsapp, whatsapp_consent)
  values (
    new.id,
    m->>'tipo',
    coalesce(nullif(m->>'nome',''), split_part(new.email,'@',1)),
    upper(m->>'pais'),
    m->>'cep',
    m->>'cidade',
    m->>'uf',
    m->>'bairro',
    case when consent then nullif(m->>'whatsapp','') else null end,
    consent
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Row Level Security ────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.anuncios enable row level security;
alter table public.procuras enable row level security;

-- profiles: cada um vê/edita só o próprio (WhatsApp fica privado)
drop policy if exists "perfil: ler o proprio"   on public.profiles;
drop policy if exists "perfil: editar o proprio" on public.profiles;
create policy "perfil: ler o proprio"    on public.profiles for select using (auth.uid() = id);
create policy "perfil: editar o proprio" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- anuncios: todos leem; só ANUNCIANTE cria; só o dono edita/apaga
drop policy if exists "anuncios: leitura publica" on public.anuncios;
drop policy if exists "anuncios: anunciante cria" on public.anuncios;
drop policy if exists "anuncios: dono edita"      on public.anuncios;
drop policy if exists "anuncios: dono apaga"      on public.anuncios;
create policy "anuncios: leitura publica" on public.anuncios for select using (true);
create policy "anuncios: anunciante cria" on public.anuncios for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.tipo = 'anunciante')
  );
create policy "anuncios: dono edita" on public.anuncios for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "anuncios: dono apaga" on public.anuncios for delete using (auth.uid() = user_id);

-- procuras: todos leem; somente MORADOR cria; só o dono edita/apaga
drop policy if exists "procuras: leitura publica" on public.procuras;
drop policy if exists "procuras: logado cria"     on public.procuras;
drop policy if exists "procuras: morador cria"    on public.procuras;
drop policy if exists "procuras: dono edita"      on public.procuras;
drop policy if exists "procuras: dono apaga"      on public.procuras;
create policy "procuras: leitura publica" on public.procuras for select using (true);
create policy "procuras: morador cria"    on public.procuras for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.tipo = 'morador')
  );
create policy "procuras: dono edita"      on public.procuras for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "procuras: dono apaga"      on public.procuras for delete using (auth.uid() = user_id);

-- ── Storage: fotos dos anúncios ───────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('midias', 'midias', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "midias: leitura publica"         on storage.objects;
drop policy if exists "midias: upload na propria pasta" on storage.objects;
drop policy if exists "midias: apagar da propria pasta" on storage.objects;
create policy "midias: leitura publica" on storage.objects for select using (bucket_id = 'midias');
create policy "midias: upload na propria pasta" on storage.objects for insert to authenticated
  with check (bucket_id = 'midias' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "midias: apagar da propria pasta" on storage.objects for delete to authenticated
  using (bucket_id = 'midias' and (storage.foldername(name))[1] = auth.uid()::text);
