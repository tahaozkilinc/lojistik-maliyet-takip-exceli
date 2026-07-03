/* ============================================================
   Deniz navlun yardımcıları — orijinal uygulamadan birebir.
   ============================================================ */
import type { DB, NavlunKayit, NavlunTeklif } from './types';
import { toTRY } from './calc';

export function navlunYillar(db: DB): number[] {
  const ys = [...new Set(db.denizNavlun.map((r) => +(r.donem || '').slice(0, 4)).filter(Boolean))];
  const cy = new Date().getFullYear();
  if (!ys.includes(cy)) ys.push(cy);
  return ys.sort((a, b) => b - a);
}

export function navlunHatlar(db: DB): string[] {
  return [...new Set(db.denizNavlun.map((r) => (r.hat || '').trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'tr'),
  );
}

/** "Kalkış → Varış" bileşik güzergahını iki parçaya ayırır (eski kayıtlar için). */
export function splitHat(h?: string): { kalkis: string; varis: string } {
  const s = (h || '').trim();
  const m = s.split(/\s*(?:→|->)\s*/);
  if (m.length < 2) return { kalkis: s, varis: '' };
  return { kalkis: m[0].trim(), varis: m.slice(1).join(' → ').trim() };
}

/** Kalkış + varış çiftini filtre/grafiklerin kullandığı bileşik güzergaha çevirir. */
export function joinHat(kalkis: string, varis: string): string {
  return [kalkis.trim(), varis.trim()].filter(Boolean).join(' → ');
}

export function navlunFiltered(db: DB, yil: number, hat: string): NavlunKayit[] {
  return db.denizNavlun.filter((r) => {
    if (+(r.donem || '').slice(0, 4) !== yil) return false;
    if (hat && hat !== '__all' && (r.hat || '').trim() !== hat) return false;
    return true;
  });
}

/** Kaydın en düşük TRY karşılığına sahip firma teklifi (varsa). */
function bestNavlunTeklif(db: DB, r: NavlunKayit): NavlunTeklif | null {
  let best: NavlunTeklif | null = null;
  let bv = Infinity;
  (r.teklifler || []).forEach((t) => {
    if (t.c20 == null && t.c40 == null) return;
    const v = toTRY(db, (t.c40 ?? t.c20) as number, t.paraBirimi || 'USD');
    if (v > 0 && v < bv) {
      bv = v;
      best = t;
    }
  });
  return best;
}

/**
 * Kaydın özet (hızlı) C20/C40 alanları boşsa, seçilen — yoksa en uygun — firma
 * teklifinden fiyatı türetir. Bu sayede yalnızca "Firma Teklifleri" akışıyla
 * girilen fiyatlar da aylık tablo/grafik/kayıt listesinde "—" görünmez.
 */
export function effectiveNavlunFiyat(db: DB, r: NavlunKayit): { c20: number | null; c40: number | null; paraBirimi: string } {
  if (r.c20 != null || r.c40 != null) {
    return { c20: r.c20 ?? null, c40: r.c40 ?? null, paraBirimi: r.paraBirimi || 'USD' };
  }
  const sel = (r.teklifler || []).find((t) => t.id === r.secilenTeklifId) || bestNavlunTeklif(db, r);
  if (sel) return { c20: sel.c20 ?? null, c40: sel.c40 ?? null, paraBirimi: sel.paraBirimi || 'USD' };
  return { c20: null, c40: null, paraBirimi: r.paraBirimi || 'USD' };
}

export interface AyData {
  c20: number | null;
  c40: number | null;
  count: number;
}

export function navlunAyData(db: DB, yil: number, hat: string): AyData[] {
  const months: { c20: number[]; c40: number[]; recs: NavlunKayit[] }[] = Array.from({ length: 12 }, () => ({
    c20: [],
    c40: [],
    recs: [],
  }));
  navlunFiltered(db, yil, hat).forEach((r) => {
    const m = +(r.donem || '').slice(5, 7) - 1;
    if (m < 0 || m > 11) return;
    const eff = effectiveNavlunFiyat(db, r);
    if (eff.c20 != null && isFinite(+eff.c20)) months[m].c20.push(+eff.c20);
    if (eff.c40 != null && isFinite(+eff.c40)) months[m].c40.push(+eff.c40);
    months[m].recs.push(r);
  });
  return months.map((o) => ({
    c20: o.c20.length ? o.c20.reduce((a, b) => a + b, 0) / o.c20.length : null,
    c40: o.c40.length ? o.c40.reduce((a, b) => a + b, 0) / o.c40.length : null,
    count: o.recs.length,
  }));
}

export function dominantCur(recs: NavlunKayit[]): string {
  const c: Record<string, number> = {};
  recs.forEach((r) => {
    const k = r.paraBirimi || 'USD';
    c[k] = (c[k] || 0) + 1;
  });
  let best = 'USD';
  let n = -1;
  Object.keys(c).forEach((k) => {
    if (c[k] > n) {
      n = c[k];
      best = k;
    }
  });
  return best;
}

export function navlunDelta(cur: number | null, prev: number | null): number | null {
  if (cur == null || prev == null || prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}
