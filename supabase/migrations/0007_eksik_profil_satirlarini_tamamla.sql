-- ============================================================
-- Eksik profil satırlarını tamamla (yazma/onaylama reddi düzeltmesi).
--
-- Bu betiği bir kez Supabase Dashboard > SQL Editor içinde çalıştırın
-- (proje: frvjglboljauukgxqetp). Tekrar çalıştırmak güvenlidir
-- (idempotent) — zaten profili olan kullanıcılara dokunmaz.
--
-- Neden: profiles satırı yalnızca (a) 0004 betiği ilk çalıştığında bir
-- kerelik "mevcut kullanıcıları yonetici yap" işlemiyle ya da (b) yeni
-- bir kullanıcı Auth'a eklendiğinde tetikleyiciyle oluşuyordu. Herhangi
-- bir nedenle bu ikisinden hiçbiri bir kullanıcı için çalışmamışsa
-- (örn. Auth kullanıcısı 0004'ten önce/tam sırasında oluşturulduysa),
-- o kullanıcı için profiles satırı hiç yok — bu durumda uygulama onu
-- güvenli varsayılan olarak "goruntuleyici" (yalnızca izleme) sayıyor
-- ve HER kaydetme/onaylama isteği hem istemcide hem de veritabanı
-- düzeyinde (RLS) sessizce reddediliyor. Bu betik, satırı eksik olan
-- her mevcut Auth kullanıcısı için "yonetici" (tam operasyonel yetki)
-- satırı açar — kimse fonksiyonalite kaybetmesin diye (bkz. 0004'teki
-- aynı gerekçe).
-- ============================================================

insert into public.profiles (id, email, role)
select id, email, 'yonetici' from auth.users
on conflict (id) do nothing;
