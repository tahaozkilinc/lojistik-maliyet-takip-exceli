import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabaseConfig';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

/**
 * app_db satırı için sunucu tarafı bütçe — istemci zaman aşımı BUNDAN UZUN
 * olmalı, aksi halde sunucunun normal şekilde (yavaş ama başarıyla)
 * tamamlayacağı bir okuma/yazma, istemci daha erken vazgeçtiği için
 * gereksiz yere "hata" olarak raporlanır (yanlış alarm, boşuna güven
 * kaybı). Dosya ekleri henüz Storage'a taşınmadığı sürece app_db satırı
 * büyük kalabildiğinden bu bütçe geçici olarak 60sn'ye çıkarıldı (bkz.
 * supabase betiği); depo taşıma tamamlanınca tekrar düşürülebilir.
 */
const NETWORK_TIMEOUT_MS = 65000;

/**
 * Bir Supabase isteğini zaman aşımına uğratır. Supabase istemcisinin
 * varsayılan fetch'inde HİÇBİR zaman aşımı yoktur — bir yanıt hiç
 * gelmezse (bağlantı koptu, istek hiç ulaşmadı vb.) istek sonsuza kadar
 * asılı kalır. Uygulamada bu; oturum kontrolü, veri yükleme veya giriş
 * ekranı gibi bir `await`'in hiç bitmemesi, dolayısıyla kullanıcının
 * "Yükleniyor…" ekranında ya da "Lütfen bekleyin…" düğmesinde SONSUZA
 * KADAR kilitli kalması (hiçbir hata, hiçbir çıkış yolu olmadan) anlamına
 * gelir — "telefondan uygulamaya girilemiyor" şikayetinin klasik nedeni.
 * Bu sarmalayıcı, asılı kalmayı bir hataya çevirir; böylece çağıranın zaten
 * sahip olduğu hata işleme (toast, tekrar dene ekranı, vb.) devreye girer.
 * Yanıt normal sürede gelirse davranış hiç değişmez.
 */
export function withTimeout<T>(p: PromiseLike<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label}: sunucudan ${NETWORK_TIMEOUT_MS / 1000} saniyede yanıt alınamadı (bağlantı sorunu ya da sunucu yoğunluğu olabilir)`));
    }, NETWORK_TIMEOUT_MS);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}
