-- ============================================================
-- Kullanıcı rolleri: admin / yönetici / görüntüleyici
--
-- Bu betiği bir kez Supabase Dashboard > SQL Editor içinde çalıştırın
-- (proje: frvjglboljauukgxqetp). Tekrar çalıştırmak güvenlidir
-- (idempotent) — zaten var olan nesneler atlanır.
--
-- Roller:
--   goruntuleyici — yalnızca görüntüleme; hiçbir kayıt ekleyemez/
--                   düzenleyemez/silemez (varsayılan rol).
--   yonetici      — tüm operasyonel işlemler (talep/teklif/onay/fiyat
--                   girişi vb.) — bugün uygulamanın yaptığı her şey.
--   admin         — yönetici ile aynı yetkiler + kullanıcı rollerini
--                   yönetme (Kullanıcı Rolleri ekranı).
--
-- Güvenlik: rol bilgisi ASLA auth.users.raw_user_meta_data içinde
-- tutulmaz — çünkü oturum açmış bir kullanıcı kendi meta verisini
-- istemciden (supabase.auth.updateUser) serbestçe değiştirebilir; bu,
-- herkesin kendini admin yapabilmesi anlamına gelirdi. Bunun yerine rol
-- ayrı bir tabloda tutulur ve yalnızca admin rolündeki kullanıcılar
-- (RLS ile sunucu tarafında zorunlu kılınır) başkasının rolünü
-- değiştirebilir.
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'yonetici', 'goruntuleyici');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role public.app_role not null default 'goruntuleyici',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Herkes (giriş yapmış) tüm profilleri görebilir — rol yönetim ekranında
-- ve isim/rol gösteriminde kullanılır. Hassas bir veri değildir (e-posta +
-- rol); şifre burada tutulmaz.
drop policy if exists "authenticated select profiles" on public.profiles;
create policy "authenticated select profiles" on public.profiles
  for select to authenticated using (true);

-- Yalnızca admin rolündeki kullanıcılar (kendileri dahil) rol değiştirebilir.
-- Alt sorgu profiles üzerindeki SELECT politikasına (herkese açık) tabi
-- olduğundan çevrimsel engellemeye yol açmaz.
drop policy if exists "admin update profiles" on public.profiles;
create policy "admin update profiles" on public.profiles
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- INSERT/DELETE için politika tanımlanmaz: istemciden kimse yeni profil
-- ekleyemez/silemez (satırlar yalnızca aşağıdaki tetikleyiciyle oluşur).

-- Yeni bir Supabase Auth kullanıcısı oluşturulduğunda otomatik profil satırı
-- açar (varsayılan rol: goruntuleyici — en az yetkili, güvenli varsayılan).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'goruntuleyici')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ÖNEMLİ: Bu betikten önce zaten var olan (bugün uygulamayı kullanan)
-- kullanıcılar "yonetici" (tam operasyonel yetki) olarak açılır — böylece
-- kimse bu betik çalıştığı an yetkisini kaybetmez ("asla fonksiyonalitede
-- kayıp olmasın"). Kısıtlayıcı "goruntuleyici" varsayılanı yalnızca BUNDAN
-- SONRA eklenecek YENİ kullanıcılar içindir (yukarıdaki tetikleyiciye bakın).
insert into public.profiles (id, email, role)
select id, email, 'yonetici' from auth.users
on conflict (id) do nothing;

-- app_db yazma yetkisini role bağla: yalnızca admin/yonetici INSERT/UPDATE
-- yapabilir; goruntuleyici zaten var olan "authenticated select" politikasıyla
-- okuyabilir ama yazamaz.
drop policy if exists "authenticated update" on public.app_db;
drop policy if exists "yonetici admin update app_db" on public.app_db;
create policy "yonetici admin update app_db" on public.app_db
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'yonetici')))
  with check (id = 1 and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'yonetici')));

drop policy if exists "authenticated insert" on public.app_db;
drop policy if exists "yonetici admin insert app_db" on public.app_db;
create policy "yonetici admin insert app_db" on public.app_db
  for insert to authenticated
  with check (id = 1 and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'yonetici')));

-- Realtime: rol değişikliği anında tüm oturumlara yansısın.
do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then
  null;
end $$;

-- İlk admin ataması: bu e-posta zaten kayıtlıysa admin yapılır. Kayıtlı
-- değilse bu satır hiçbir şeyi etkilemez — kullanıcıyı önce Authentication →
-- Users → Add user ile oluşturup betiği tekrar çalıştırın (idempotent).
update public.profiles set role = 'admin' where email = 'taha.ozkilinc@sunaryatirim.com.tr';
