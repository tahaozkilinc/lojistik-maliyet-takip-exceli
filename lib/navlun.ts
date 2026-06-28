/* ============================================================
   Deniz navlun yardımcıları — orijinal uygulamadan birebir.
   ============================================================ */
import type { DB, NavlunKayit } from './types';

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

export function navlunFiltered(db: DB, yil: number, hat: string): NavlunKayit[] {
  return db.denizNavlun.filter((r) => {
    if (+(r.donem || '').slice(0, 4) !== yil) return false;
    if (hat && hat !== '__all' && (r.hat || '').trim() !== hat) return false;
    return true;
  });
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
    if (r.c20 != null && (r.c20 as unknown) !== '' && isFinite(+r.c20)) months[m].c20.push(+r.c20);
    if (r.c40 != null && (r.c40 as unknown) !== '' && isFinite(+r.c40)) months[m].c40.push(+r.c40);
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
