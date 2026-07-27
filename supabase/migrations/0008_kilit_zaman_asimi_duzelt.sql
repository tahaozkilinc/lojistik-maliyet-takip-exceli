-- ============================================================
-- Kaydetme kilit zaman aşımını (lock timeout) gider.
--
-- Bu betiği bir kez Supabase Dashboard > SQL Editor içinde çalıştırın
-- (proje: frvjglboljauukgxqetp). Tekrar çalıştırmak güvenlidir
-- (idempotent).
--
-- Neden: "canceling statement due to lock timeout" hatası — 0006'daki
-- düzeltme yalnızca statement_timeout'u (bir sorgunun ÇALIŞMA süresi
-- bütçesini) büyütmüştü. lock_timeout FARKLI, ayrı bir ayardır: app_db
-- tek bir satır (id=1) olduğundan, iki cihaz/sekme (ör. telefon ve
-- bilgisayar, ya da art arda hızlı iki kaydetme) neredeyse aynı anda
-- kaydetmeye çalışırsa, ikincisi birincinin satır kilidini bırakmasını
-- bekler. Bu bekleme, varsayılan (kısa) lock_timeout süresini aşarsa
-- Postgres bekleyen isteği iptal eder — kaydetme başarısız olur ve
-- kullanıcı bu hatayı görür.
-- ============================================================

alter role authenticated set lock_timeout = '15s';
