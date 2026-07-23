/* ============================================================
   Biçimlendirme yardımcıları — orijinal uygulamadan birebir.
   ============================================================ */
import { PARA } from './constants';

/** Benzersiz kimlik üretir (orijinal uid). */
export function uid(p: string): string {
  return p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/**
 * HTML kaçışı. Yalnızca DOM dışına/innerHTML olarak verilen yerlerde (örn.
 * Leaflet popup) kullanılır; React JSX zaten otomatik kaçışlar.
 */
export function escapeHtml(s: unknown): string {
  return (s == null ? '' : String(s)).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

/** Sayıyı tr-TR biçiminde formatlar; boş/NaN için "—". */
export function fmt(n: number | null | undefined): string {
  return n == null || isNaN(n as number)
    ? '—'
    : Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** Tonaj gösterimi: nokta yerine virgül. */
export function fmtTon(n: number | null | undefined | string): string {
  if (n == null || n === '' || isNaN(n as number)) return '—';
  const s = String(+n);
  return s.replace('.', ',');
}

/** Kullanıcı girişindeki tonaj metnini sayıya çevirir (1.500,5 -> 1500.5). */
export function tonNum(v: string | number | null | undefined): number | null {
  if (v == null || v === '') return null;
  const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

/** Tonaj input maskesi: yalnızca rakam ve tek virgül bırakır. */
export function tonInputMask(value: string): string {
  return value.replace(/[^\d,]/g, '').replace(/(,[^,]*),/g, '$1');
}

/** Ondalık input maskesi (virgülü noktaya çevirir). */
export function decimalMask(value: string): string {
  return value.replace(',', '.').replace(/[^-0-9.]/g, '');
}

/** Para birimi simgesiyle tutar. */
export function money(n: number | null | undefined, p?: string): string {
  return (PARA[p || 'TRY'] || '') + fmt(n);
}

/** Tarih (gg.aa.yyyy). */
export function dt(s: string | null | undefined): string {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Tarih + saat. */
export function dtt(s: string | null | undefined): string {
  if (!s) return '—';
  const d = new Date(s);
  return (
    d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  );
}

/** Baş harfler (en fazla 2). */
export function initials(s: string | null | undefined): string {
  return (s || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/** Türk telefon biçimleyici. */
export function telFmt(v: string | null | undefined): string {
  let d = (v || '').replace(/\D/g, '');
  if (d.startsWith('90')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  d = d.slice(0, 10);
  if (!d.length) return '';
  let o = '+90 ' + d.slice(0, 3);
  if (d.length > 3) o += ' ' + d.slice(3, 6);
  if (d.length > 6) o += ' ' + d.slice(6, 8);
  if (d.length > 8) o += ' ' + d.slice(8, 10);
  return o;
}

/** Gerçek bir numara var mı? Yalnızca ülke koduyla ("+90") kaydedilmiş, hiç rakam içermeyen eski/boş girişleri boş sayar. */
export function hasPhone(v: string | null | undefined): boolean {
  return (v || '').replace(/\D/g, '').replace(/^90/, '').length > 0;
}

/** Bugünden 7 gün sonrası (YYYY-MM-DD). */
export function plus7(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

/** Dönem etiketi (YYYY-MM -> "Haziran 2026"). */
import { AYLAR } from './constants';
export function donemLabel(d: string | null | undefined): string {
  if (!d) return '—';
  const y = d.slice(0, 4);
  const m = +d.slice(5, 7) - 1;
  return (AYLAR[m] || '') + ' ' + y;
}
