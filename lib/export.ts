/* ============================================================
   Dışa aktarma: Excel (.xls), JSON yedek ve güvenli belge önizleme.
   ============================================================ */
import type { DB, Firma, ImzaliBelge } from './types';
import { lokName } from './calc';
import { dt } from './format';
import { SAFE_FILE_MIME, SAFE_FILE_DATA_URL } from './constants';
import { isStorageRef, resolveBelgeUrl } from './storage';

/** Excel HTML'i için kaçış (dosyaya yazılır, DOM'a enjekte edilmez). */
function esc(s: unknown): string {
  return (s == null ? '' : String(s)).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

function xlsDownload(filename: string, tableHtml: string) {
  const html =
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body>' +
    tableHtml +
    '</body></html>';
  const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function anlExcelRows(db: DB, f: Firma): string {
  return (f.anlasmalar || [])
    .map((a) => {
      const gec = (a.gecmis || [])
        .map((h) => dt(h.tarih) + ': ' + (Number(h.birimFiyat) || 0) + ' ' + (h.paraBirimi || 'TRY'))
        .join(' | ');
      return `<tr><td>${esc(f.ad)}</td><td>${esc(a.yukTipi || 'Tüm ürünler')}</td><td>${esc(
        lokName(db, a.yuklemeLokasyonId) || '',
      )}</td><td>${esc(lokName(db, a.teslimLokasyonId) || '')}</td><td style="mso-number-format:'\\#\\,\\#\\#0';">${
        Number(a.birimFiyat) || 0
      }</td><td>${esc(a.paraBirimi || 'TRY')}</td><td>${a.tarih ? dt(a.tarih) : ''}</td><td>${esc(gec)}</td></tr>`;
    })
    .join('');
}

const XLS_HEAD =
  '<tr style="background:#0B1F3A;color:#fff;font-weight:bold"><td>Firma</td><td>Ürün</td><td>Yükleme</td><td>Teslim</td><td>Güncel ₺/ton</td><td>Para</td><td>Tarih</td><td>Geçmiş Fiyatlar</td></tr>';

/** Tek firmanın anlaşmalı fiyat listesini Excel'e aktarır. true=başarılı. */
export function exportFirmaFiyat(db: DB, firmaId: string): boolean {
  const f = db.firmalar.find((x) => x.id === firmaId);
  if (!f) return false;
  if (!(f.anlasmalar || []).length) return false;
  const head = `<h3>${esc(f.ad)} — Anlaşmalı Fiyat Listesi</h3><table border="1" cellspacing="0" cellpadding="4">${XLS_HEAD}${anlExcelRows(
    db,
    f,
  )}</table>`;
  xlsDownload('anlasmali-fiyatlar-' + f.ad.replace(/[^\wğüşıöçĞÜŞİÖÇ]+/g, '_') + '.xls', head);
  return true;
}

/** Tüm firmaların anlaşmalı fiyatlarını Excel'e aktarır. true=başarılı. */
export function exportTumFiyatlar(db: DB): boolean {
  const rows = db.firmalar.map((f) => anlExcelRows(db, f)).join('');
  if (!rows) return false;
  const head = `<h3>${esc(db.meta.firma)} — Tüm Anlaşmalı Fiyatlar (${dt(
    new Date().toISOString(),
  )})</h3><table border="1" cellspacing="0" cellpadding="4">${XLS_HEAD}${rows}</table>`;
  xlsDownload('tum-anlasmali-fiyatlar.xls', head);
  return true;
}

/** JSON yedek indirir; dosya adındaki zaman damgasını döndürür. */
export function exportData(db: DB): string {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const n = new Date();
  const p = (x: number) => String(x).padStart(2, '0');
  const ts =
    n.getFullYear() +
    '-' +
    p(n.getMonth() + 1) +
    '-' +
    p(n.getDate()) +
    '_' +
    p(n.getHours()) +
    '-' +
    p(n.getMinutes());
  a.download = 'nakliye-yedek-' + ts + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  return ts.replace('_', ' ');
}

/**
 * Islak imzalı belgeyi güvenli biçimde yeni sekmede açar.
 * Güvenlik: yalnızca script çalıştıramayan görsel biçimleri (png/jpg/gif/webp/
 * bmp/avif) ve application/pdf açılır. SVG ve data:text/html gibi içerikler
 * reddedilir. İçerik, doğrulanan MIME tipiyle bir Blob'a dönüştürülerek HTML
 * olarak yorumlanması engellenir; document.write KULLANILMAZ.
 */
export async function openSignedFile(belge: ImzaliBelge | null | undefined): Promise<boolean> {
  if (!belge || !belge.data) return false;
  if (isStorageRef(belge.data)) {
    // Boş bir sekme SENKRON olarak (tıklamaya doğrudan yanıt olarak) açılır —
    // aksi halde tarayıcı, imzalı bağlantı asenkron üretildiği için sekmeyi
    // engelleyebilir (popup blocker). Bağlantı hazır olunca bu sekme oraya
    // yönlendirilir. noopener KASITLI OLARAK kullanılmaz: içerik her zaman
    // yalnızca doğrulanmış görsel/PDF'tir (script çalıştıramaz), bu yüzden
    // opener referansı burada gerçek bir risk oluşturmaz; buna karşılık
    // referrer sızıntısını önlemek için noreferrer korunur.
    const w = window.open('', '_blank', 'noreferrer');
    const url = await resolveBelgeUrl(belge.data);
    if (!url || !w) {
      w?.close();
      return false;
    }
    w.location.href = url;
    return true;
  }
  if (!SAFE_FILE_DATA_URL.test(belge.data)) return false;
  try {
    const m = belge.data.match(/^data:([^;,]+)(;base64)?,(.*)$/s);
    if (!m) return false;
    const mime = m[1].toLowerCase();
    if (!SAFE_FILE_MIME.test(mime)) return false;
    const isB64 = !!m[2];
    const payload = m[3];
    let bytes: Uint8Array;
    if (isB64) {
      const bin = atob(payload);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } else {
      bytes = new TextEncoder().encode(decodeURIComponent(payload));
    }
    // MIME tipi kesin olarak güvenli değere sabitlenir.
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return true;
  } catch {
    return false;
  }
}
