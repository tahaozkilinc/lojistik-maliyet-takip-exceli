-- ============================================================
-- Lojistik Maliyet Takip — merkezi veritabanı kurulumu.
--
-- Bu betiği bir kez Supabase Dashboard > SQL Editor içinde çalıştırın
-- (proje: frvjglboljauukgxqetp). Tekrar çalıştırmak güvenlidir
-- (idempotent) — zaten var olan nesneler atlanır.
--
-- Veri modeli: uygulamanın tüm verisi (firmalar, lokasyonlar,
-- talepler, navlun kayıtları, kur, meta) tek bir JSONB sütununda
-- tutulur — bkz. lib/types.ts'deki DB arayüzü ile birebir aynı şekil.
-- Bu, mevcut iş mantığını (lib/calc.ts, lib/navlun.ts, vb.) hiç
-- değiştirmeden, az riskle merkezi bir veritabanına taşımayı sağlar.
-- ============================================================

create table if not exists public.app_db (
  id smallint primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint app_db_singleton check (id = 1)
);

alter table public.app_db enable row level security;

-- Yalnızca Supabase Auth ile oturum açmış kullanıcılar erişebilir.
-- Anonim (giriş yapmamış) erişim tamamen kapalıdır; satır silinemez
-- (delete politikası tanımlanmadığı için varsayılan olarak reddedilir).
drop policy if exists "authenticated select" on public.app_db;
create policy "authenticated select" on public.app_db
  for select to authenticated using (true);

drop policy if exists "authenticated insert" on public.app_db;
create policy "authenticated insert" on public.app_db
  for insert to authenticated with check (id = 1);

drop policy if exists "authenticated update" on public.app_db;
create policy "authenticated update" on public.app_db
  for update to authenticated using (true) with check (id = 1);

-- updated_at / updated_by alanlarını her yazımda otomatik doldurur.
create or replace function public.app_db_set_meta()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists app_db_set_meta_trg on public.app_db;
create trigger app_db_set_meta_trg
  before insert or update on public.app_db
  for each row execute function public.app_db_set_meta();

-- Realtime: çoklu kullanıcı arasında canlı eşitleme için değişiklikleri yayınla.
do $$
begin
  alter publication supabase_realtime add table public.app_db;
exception when duplicate_object then
  null;
end $$;
