-- ============================================================
-- Dosya ekleri (logo, imzalı belgeler) için ayrı Supabase Storage
-- depoları oluşturur — bunlar artık app_db satırının İÇİNE gömülmez.
--
-- Bu betiği bir kez Supabase Dashboard > SQL Editor içinde çalıştırın
-- (proje: frvjglboljauukgxqetp). Tekrar çalıştırmak güvenlidir
-- (idempotent).
--
-- Neden: app_db tek bir JSONB satırıdır (id=1); tüm logo ve imzalı
-- belge/sözleşme dosyaları bu satırın İÇİNE base64 olarak gömülüydü.
-- Dosya sayısı arttıkça bu TEK satır büyüdü ve her açılış/kaydetme onu
-- taşımak zorunda kaldı — yavaş açılışın ve zaman aşımı
-- (statement_timeout, lock_timeout — bkz. 0006, 0008) hatalarının kök
-- nedeni buydu. Bu betikten sonra uygulama YENİ dosyaları buraya yükler;
-- app_db satırında yalnızca küçük bir referans tutulur. ESKİ (bu
-- değişiklikten önce yüklenmiş) dosyalar hâlâ eski (gömülü) biçimdedir
-- ve öyle çalışmaya devam eder — hiçbir mevcut belge/logo kaybolmaz.
-- ============================================================

-- "logolar": herkese açık okunabilir (marka görseli, gizli değildir) —
-- <img src> ile doğrudan kullanılabilmesi için. Yazma (yükleme/silme)
-- yalnızca admin/yönetici.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logolar', 'logolar', true, 1048576,
  array['image/png','image/jpeg','image/gif','image/webp','image/bmp','image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- "belgeler": ÖZEL (gizli) — imzalı sözleşme/onay belgeleri fiyat ve
-- ticari şartlar içerebilir. Yalnızca oturum açmış (herhangi bir rol)
-- kullanıcılar kısa ömürlü imzalı bağlantıyla görüntüleyebilir; yükleme
-- yalnızca admin/yönetici.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'belgeler', 'belgeler', false, 5242880,
  array['image/png','image/jpeg','image/gif','image/webp','image/bmp','image/avif','application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table storage.objects enable row level security;

-- --- logolar: okuma herkese açık (public=true, RLS'siz de servis edilir);
--     yazma (ekleme/değiştirme/silme) yalnızca admin/yönetici ---
drop policy if exists "logolar_insert_yazabilir" on storage.objects;
create policy "logolar_insert_yazabilir" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'logolar'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'yonetici'))
  );

drop policy if exists "logolar_update_yazabilir" on storage.objects;
create policy "logolar_update_yazabilir" on storage.objects for update to authenticated
  using (
    bucket_id = 'logolar'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'yonetici'))
  );

drop policy if exists "logolar_delete_yazabilir" on storage.objects;
create policy "logolar_delete_yazabilir" on storage.objects for delete to authenticated
  using (
    bucket_id = 'logolar'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'yonetici'))
  );

-- --- belgeler: okuma herhangi bir oturum açmış kullanıcı (imzalı bağlantı
--     üretmek için gerekli); yazma yalnızca admin/yönetici ---
drop policy if exists "belgeler_select_oturumlu" on storage.objects;
create policy "belgeler_select_oturumlu" on storage.objects for select to authenticated
  using (bucket_id = 'belgeler');

drop policy if exists "belgeler_insert_yazabilir" on storage.objects;
create policy "belgeler_insert_yazabilir" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'belgeler'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'yonetici'))
  );

drop policy if exists "belgeler_update_yazabilir" on storage.objects;
create policy "belgeler_update_yazabilir" on storage.objects for update to authenticated
  using (
    bucket_id = 'belgeler'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'yonetici'))
  );

drop policy if exists "belgeler_delete_yazabilir" on storage.objects;
create policy "belgeler_delete_yazabilir" on storage.objects for delete to authenticated
  using (
    bucket_id = 'belgeler'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'yonetici'))
  );
