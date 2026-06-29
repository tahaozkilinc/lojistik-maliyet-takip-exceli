/* ============================================================
   Kara navlun yardımcıları — deniz navlun ile aynı mantık,
   tek bir birim fiyat serisi üzerinden.
   ============================================================ */
import type { DB, KaraNavlunKayit } from './types';

export function karaNavlunYillar(db: DB): number[] {
  const ys = [...new Set(db.karaNavlun.map((r) => +(r.donem || '').slice(0, 4)).filter(Boolean))];
  const cy = new Date().getFullYear();
  if (!ys.includes(cy)) ys.push(cy);
  return ys.sort((a, b) => b - a);
}

export function karaNavlunHatlar(db: DB): string[] {
  return [...new Set(db.karaNavlun.map((r) => (r.hat || '').trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'tr'),
  );
}

export function karaNavlunFiltered(db: DB, yil: number, hat: string): KaraNavlunKayit[] {
  return db.karaNavlun.filter((r) => {
    if (+(r.donem || '').slice(0, 4) !== yil) return false;
    if (hat && hat !== '__all' && (r.hat || '').trim() !== hat) return false;
    return true;
  });
}

export interface KaraAyData {
  fiyat: number | null;
  count: number;
}

export function karaNavlunAyData(db: DB, yil: number, hat: string): KaraAyData[] {
  const months: { fiyat: number[]; recs: KaraNavlunKayit[] }[] = Array.from({ length: 12 }, () => ({
    fiyat: [],
    recs: [],
  }));
  karaNavlunFiltered(db, yil, hat).forEach((r) => {
    const m = +(r.donem || '').slice(5, 7) - 1;
    if (m < 0 || m > 11) return;
    if (r.fiyat != null && (r.fiyat as unknown) !== '' && isFinite(+r.fiyat)) months[m].fiyat.push(+r.fiyat);
    months[m].recs.push(r);
  });
  return months.map((o) => ({
    fiyat: o.fiyat.length ? o.fiyat.reduce((a, b) => a + b, 0) / o.fiyat.length : null,
    count: o.recs.length,
  }));
}

export function karaDominantCur(recs: KaraNavlunKayit[]): string {
  const c: Record<string, number> = {};
  recs.forEach((r) => {
    const k = r.paraBirimi || 'TRY';
    c[k] = (c[k] || 0) + 1;
  });
  let best = 'TRY';
  let n = -1;
  Object.keys(c).forEach((k) => {
    if (c[k] > n) {
      n = c[k];
      best = k;
    }
  });
  return best;
}
