-- ============================================================
-- Kaydetme zaman aşımını (statement timeout) gider.
--
-- Bu betiği bir kez Supabase Dashboard > SQL Editor içinde çalıştırın
-- (proje: frvjglboljauukgxqetp). Tekrar çalıştırmak güvenlidir
-- (idempotent).
--
-- Neden: "canceling statement due to statement timeout" hatası —
-- app_db.data (tüm veritabanının tek JSON sütunu) zamanla büyüdükçe,
-- bu satırı yazan UPDATE/INSERT sorgusu varsayılan zaman aşımı
-- süresinden uzun sürmeye başladı ve Postgres sorguyu iptal etti.
-- Bu ASLA yalnızca yedekleme ile ilgili bir işlem değildir — her
-- normal kayıt (fiyat girişi, teklif ekleme vb.) aynı yazma yolunu
-- kullanır; bu yüzden yedekleme özelliklerini kaldırmak bu hatayı
-- çözmez, yalnızca hata olduğunda geri dönülecek son güvenliği yok
-- eder. Bunun yerine: (1) yazma süresi bütçesini büyütüyoruz, (2)
-- otomatik yedekleme tetikleyicisindeki gereksiz ek yükü (indekssiz
-- tam tablo taraması + her kayıtta çalışan silme) kaldırıyoruz.
-- ============================================================

-- 1) İstemcinin (authenticated rolü) yazma sorguları için zaman aşımı
--    bütçesini büyüt. Kalıcı asıl çözüm app_db içindeki büyük dosyaları
--    (logo/imzalı belge/sözleşme) ayrı depolamaya taşımaktır — bu,
--    o taşıma tamamlanana kadar geçici ama güvenli bir önlemdir.
alter role authenticated set statement_timeout = '30s';

-- 2) app_db_history üzerinde created_at indeksi yoktu — tetikleyici her
--    kaydetmede bu sütuna göre hem "son 30 dakikada anlık görüntü var
--    mı" kontrolü hem de "30 günden eski olanları sil" işlemi için tüm
--    tabloyu tarıyordu. İndeks bu iki işlemi de ucuzlatır.
create index if not exists app_db_history_created_at_idx
  on public.app_db_history (created_at desc);

-- 3) Eski günlerin temizliği artık yalnızca gerçekten yeni bir anlık
--    görüntü eklendiğinde çalışır (en fazla 30 dakikada bir) — önceden
--    HER kaydetmede (dakikada onlarca kez olabilir) çalışıyordu.
create or replace function public.app_db_snapshot()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.app_db_history where created_at > now() - interval '30 minutes'
  ) then
    insert into public.app_db_history (data, updated_by) values (new.data, new.updated_by);
    delete from public.app_db_history where created_at < now() - interval '30 days';
  end if;
  return new;
end;
$$;
