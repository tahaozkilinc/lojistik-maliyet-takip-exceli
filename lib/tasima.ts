/* ============================================================
   Taşıma talebi yardımcıları — deniz/kara/hava fiyat toplama.
   ============================================================ */
import type { DB, TasimaTalep, TasimaMod } from './types';
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
