import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabaseConfig';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const NETWORK_TIMEOUT_MS = 20000;

/**
 * Bir Supabase isteğini zaman aşımına uğratır. Supabase istemcisinin
 * varsayılan fetch'inde HİÇBİR zaman aşımı yoktur — zayıf/kararsız bir
 * bağlantıda (özellikle mobil veride) yanıt hiç gelmezse istek sonsuza
 * kadar asılı kalır. Uygulamada bu; oturum kontrolü, veri yükleme veya
 * giriş ekranı gibi bir `await`'in hiç bitmemesi, dolayısıyla kullanıcının
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
      reject(new Error(`${label}: sunucudan ${NETWORK_TIMEOUT_MS / 1000} saniyede yanıt alınamadı — bağlantınız zayıf veya kesik olabilir`));
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
