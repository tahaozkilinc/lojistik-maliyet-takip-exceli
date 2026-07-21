/* ============================================================
   Çok kullanıcılı eşzamanlı kayıt birleştirme (3 yönlü birleştirme).

   SORUN: Tüm veritabanı tek bir JSONB satırında (app_db, id=1) tutulur.
   Eskiden bir kaydetme işlemi bu satırın TAMAMINI, o an ekranda bulunan
   yerel kopyayla değiştiriyordu (upsert). İki kullanıcı (veya aynı
   kullanıcının iki sekmesi/cihazı) az farkla birbirine yakın zamanda
   kaydettiğinde, ikinci kaydetme birincinin eklediği/değiştirdiği HER ŞEYİ
   — ilgisiz talepler, fiyatlar, onaylar dahil — sessizce siliyordu. Bu,
   "bazen fiyatlar kayboluyor" şikayetinin kök nedenidir.

   ÇÖZÜM: Her kaydetmeden hemen önce sunucudaki güncel veri yeniden çekilir
   ve üç yönlü birleştirilir: base (son bilinen ortak durum) + local (bu
   oturumdaki değişiklikler) + remote (sunucudaki güncel durum). `id` alanı
   taşıyan diziler (talepler, teklifler, firmalar, anlaşmalar, …) öğe
   bazında birleştirilir — biri yeni bir talep eklerken diğeri başka bir
   talebin fiyatını güncellerse artık ikisi de korunur. Aynı kayıt gerçekten
   her iki tarafta da değiştiyse (gerçek çakışma), aktif oturumun kendi
   değişikliğini sessizce kaybetmemesi için yerel taraf kazanır.
   ============================================================ */

type PlainObject = Record<string, unknown>;

function isPlainObject(v: unknown): v is PlainObject {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function hasStringId(v: unknown): v is { id: string } {
  return isPlainObject(v) && typeof v.id === 'string';
}

/** Dizinin TÜM öğeleri `id` alanı taşıyorsa (veya dizi boşsa) öğe bazlı birleştirilebilir kabul edilir. */
function isIdArray(v: unknown): v is { id: string }[] {
  return Array.isArray(v) && v.every(hasStringId);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * `id` alanına göre üç yönlü dizi birleştirme.
 * - Yalnızca bir tarafta olan ve base'te de olmayan öğe = o taraftaki yeni ekleme → korunur.
 * - Yalnızca bir tarafta olan ama base'te olan öğe = diğer tarafta silinmiş → silinmiş kabul edilir.
 * - İki tarafta da olan öğe = içeriği yinelemeli olarak birleştirilir.
 */
function mergeIdArray(base: unknown, local: { id: string }[], remote: { id: string }[]): { id: string }[] {
  const baseArr = isIdArray(base) ? base : [];
  const bMap = new Map(baseArr.map((x) => [x.id, x]));
  const lMap = new Map(local.map((x) => [x.id, x]));
  const rMap = new Map(remote.map((x) => [x.id, x]));
  // Sıra: önce yerel diziden bilinen sıra, sonra yalnızca uzakta olan yeni öğeler sona eklenir.
  const order = [...local.map((x) => x.id), ...remote.map((x) => x.id).filter((id) => !lMap.has(id))];
  const seen = new Set<string>();
  const out: { id: string }[] = [];
  for (const id of order) {
    if (seen.has(id)) continue;
    seen.add(id);
    const inL = lMap.has(id);
    const inR = rMap.has(id);
    const inB = bMap.has(id);
    if (inL && inR) {
      out.push(merge3(bMap.get(id), lMap.get(id), rMap.get(id)) as { id: string });
    } else if (inL && !inR) {
      if (inB) continue; // uzakta silinmiş
      out.push(lMap.get(id)!);
    } else if (inR && !inL) {
      if (inB) continue; // yerelde silinmiş
      out.push(rMap.get(id)!);
    }
  }
  return out;
}

/** Üç yönlü genel birleştirme: nesneler alan bazında, `id` taşıyan diziler öğe bazında birleşir. */
function merge3(base: unknown, local: unknown, remote: unknown): unknown {
  if (deepEqual(local, remote)) return local;
  if (isIdArray(local) && isIdArray(remote)) {
    return mergeIdArray(base, local, remote);
  }
  if (isPlainObject(local) && isPlainObject(remote)) {
    const b = isPlainObject(base) ? base : {};
    const keys = new Set([...Object.keys(local), ...Object.keys(remote)]);
    const out: PlainObject = {};
    keys.forEach((k) => {
      out[k] = merge3(b[k], local[k], remote[k]);
    });
    return out;
  }
  // İlkel değer veya id'siz dizi (örn. çalışan listesi): base'e göre kim
  // değiştirdiyse o kazanır; ikisi de değiştiyse aktif oturumun kendi
  // değişikliğini kaybetmemek için yerel kazanır.
  const localChanged = !deepEqual(base, local);
  const remoteChanged = !deepEqual(base, remote);
  if (localChanged && !remoteChanged) return local;
  if (!localChanged && remoteChanged) return remote;
  return local;
}

/**
 * Uygulamanın tüm DB'sini üç yönlü birleştirir. `base` bilinmiyorsa (bu
 * oturumda henüz sunucudan hiç veri çekilmediyse) `null` verilebilir — bu
 * durumda her iki taraf da "değişmiş" kabul edilir ve birleşim (union)
 * alınır, çakışan alanlarda yerel kazanır. Bu en güvenli varsayılandır:
 * hiçbir kayıt sessizce kaybolmaz.
 */
export function mergeDB<T>(base: T | null, local: T, remote: T): T {
  return merge3(base, local, remote) as T;
}
