-- ==========================================================
-- GUIA DE BAIRRO — schema Supabase
-- Cole este arquivo inteiro em: Dashboard > SQL Editor > New query > Run
-- Pode rodar mais de uma vez (idempotente).
-- ==========================================================

-- ── Perfis ────────────────────────────────────────────────
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  tipo             text not null default 'anunciante',
  perfil_tipo      text not null default 'morador',
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

alter table public.profiles add column if not exists perfil_tipo text not null default 'morador';
alter table public.profiles drop constraint if exists profiles_tipo_check;
alter table public.profiles add constraint profiles_tipo_check
  check (tipo in ('morador','anunciante','empresa','ambos'));
alter table public.profiles drop constraint if exists profiles_perfil_tipo_check;
alter table public.profiles add constraint profiles_perfil_tipo_check
  check (perfil_tipo in ('morador','empresa','ambos'));

-- ── Anúncios (oferta) ─────────────────────────────────────
create table if not exists public.anuncios (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  titulo         text,
  categoria      text,
  tipo_anuncio   text default 'De Morador',
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
alter table public.anuncios add column if not exists tipo_anuncio text default 'De Morador';
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
  p_tipo text := coalesce(nullif(m->>'perfil_tipo',''), case when m->>'tipo' in ('morador','empresa','ambos') then m->>'tipo' else 'morador' end);
begin
  insert into public.profiles
    (id, tipo, perfil_tipo, nome, pais, cep, cidade, uf, bairro, whatsapp, whatsapp_consent)
  values (
    new.id,
    'anunciante',
    p_tipo,
    coalesce(nullif(m->>'nome',''), split_part(new.email,'@',1)),
    upper(coalesce(nullif(m->>'pais',''), 'BR')),
    coalesce(m->>'cep', ''),
    m->>'cidade',
    m->>'uf',
    m->>'bairro',
    case when consent then nullif(m->>'whatsapp','') else null end,
    consent
  )
  on conflict (id) do update set
    tipo = excluded.tipo,
    perfil_tipo = excluded.perfil_tipo,
    nome = excluded.nome,
    pais = excluded.pais,
    cep = excluded.cep,
    cidade = excluded.cidade,
    uf = excluded.uf,
    bairro = excluded.bairro,
    whatsapp = excluded.whatsapp,
    whatsapp_consent = excluded.whatsapp_consent;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Exclusão da própria conta pelo usuário ────────────────
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

-- ── Row Level Security ────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.anuncios enable row level security;
alter table public.procuras enable row level security;

-- profiles: cada um vê/cria/edita/exclui só o próprio (WhatsApp fica privado)
drop policy if exists "perfil: ler o proprio"     on public.profiles;
drop policy if exists "perfil: criar o proprio"   on public.profiles;
drop policy if exists "perfil: editar o proprio"  on public.profiles;
drop policy if exists "perfil: excluir o proprio" on public.profiles;
create policy "perfil: ler o proprio"     on public.profiles for select using (auth.uid() = id);
create policy "perfil: criar o proprio"   on public.profiles for insert with check (auth.uid() = id);
create policy "perfil: editar o proprio"  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "perfil: excluir o proprio" on public.profiles for delete using (auth.uid() = id);

-- anuncios: todos leem; qualquer anunciante logado cria; só o dono edita/apaga
drop policy if exists "anuncios: leitura publica" on public.anuncios;
drop policy if exists "anuncios: anunciante cria" on public.anuncios;
drop policy if exists "anuncios: dono edita"      on public.anuncios;
drop policy if exists "anuncios: dono apaga"      on public.anuncios;
create policy "anuncios: leitura publica" on public.anuncios for select using (true);
create policy "anuncios: anunciante cria" on public.anuncios for insert
  with check (auth.uid() = user_id);
create policy "anuncios: dono edita" on public.anuncios for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "anuncios: dono apaga" on public.anuncios for delete using (auth.uid() = user_id);

-- procuras: todos leem; usuário logado cria; só o dono edita/apaga
drop policy if exists "procuras: leitura publica" on public.procuras;
drop policy if exists "procuras: logado cria"     on public.procuras;
drop policy if exists "procuras: morador cria"    on public.procuras;
drop policy if exists "procuras: dono edita"      on public.procuras;
drop policy if exists "procuras: dono apaga"      on public.procuras;
create policy "procuras: leitura publica" on public.procuras for select using (true);
create policy "procuras: morador cria"    on public.procuras for insert
  with check (auth.uid() = user_id);
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
