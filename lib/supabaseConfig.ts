/* ============================================================
   Supabase bağlantı bilgileri (proje URL'si ve "publishable" anahtar).

   Bu anahtar istemci tarafında (tarayıcıda) açık biçimde kullanılmak
   üzere tasarlanmıştır — gizli bir anahtar DEĞİLDİR; veri güvenliği
   veritabanı tarafındaki Row Level Security (RLS) politikalarıyla
   sağlanır (bkz. supabase/migrations/0001_init.sql). Servis rolü
   (service_role) anahtarı ASLA istemci koduna eklenmemelidir.

   Yeni kullanıcı eklemek için: Supabase Dashboard → Authentication →
   Users → Add user (e-posta + şifre, "Auto Confirm User" işaretli).
   Uygulama içinde kayıt/hesap oluşturma ekranı yoktur ve OLMAYACAKTIR.
   ============================================================ */
export const SUPABASE_URL = 'https://frvjglboljauukgxqetp.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_8EmOxO81cCFQilvWe6TYfg_QHaZMU1J';
