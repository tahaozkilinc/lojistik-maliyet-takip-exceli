/* ============================================================
   Taşıma talebi yardımcıları — deniz/kara/hava fiyat toplama.
   ============================================================ */
import type { DB, TasimaTalep, TasimaMod, TasimaTeklif } from './types';
import { toTRY } from './calc';

export const TASIMA_MODLAR: { key: TasimaMod; label: string }[] = [
  { key: 'deniz', label: 'Deniz' },
  { key: 'kara', label: 'Kara' },
  { key: 'hava', label: 'Hava' },
];

export const TASIMA_MOD_RENK: Record<TasimaMod, string> = {
  deniz: '#2563eb',
  kara: '#ea580c',
  hava: '#7c3aed',
};

export function tasimaModLabel(mod: string): string {
  return TASIMA_MODLAR.find((m) => m.key === mod)?.label || mod;
}

/** Talep içindeki (tüm modlar) en düşük TRY karşılığına sahip teklifin id'si. */
export function tasimaBestQuoteId(db: DB, t: TasimaTalep): string | null {
  let best: string | null = null;
  let bv = Infinity;
  (t.teklifler || []).forEach((q) => {
    const v = toTRY(db, q.fiyat, q.paraBirimi);
    if (v > 0 && v < bv) {
      bv = v;
      best = q.id;
    }
  });
  return best;
}

/** Bir talebin "referans" fiyatı: onaylanan/seçilen teklif varsa o, yoksa en uygun teklif. */
export function tasimaReferansTeklif(db: DB, t: TasimaTalep): TasimaTeklif | null {
  const sel = (t.teklifler || []).find((q) => q.id === t.secilenTeklifId);
  if (sel) return sel;
  const bestId = tasimaBestQuoteId(db, t);
  return (t.teklifler || []).find((q) => q.id === bestId) || null;
}

/**
 * Aynı güzergahtaki (kalkış+varış — boşluk/büyük-küçük harf duyarsız) diğer
 * taşıma talepleri, en yeniden eskiye sıralı. `excludeId` düzenlenen kaydın
 * kendisini listeden çıkarmak için kullanılır.
 */
export function tasimaGecmisi(db: DB, kalkis: string, varis: string, excludeId?: string): TasimaTalep[] {
  const k = kalkis.trim().toLowerCase();
  const v = varis.trim().toLowerCase();
  if (!k || !v) return [];
  return db.tasimaTalepleri
    .filter(
      (t) =>
        t.id !== excludeId &&
        (t.kalkisYeri || '').trim().toLowerCase() === k &&
        (t.varisYeri || '').trim().toLowerCase() === v,
    )
    .sort((a, b) => new Date(b.tarih || b.createdAt || 0).getTime() - new Date(a.tarih || a.createdAt || 0).getTime());
}
