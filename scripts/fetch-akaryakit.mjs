#!/usr/bin/env node
/* ============================================================
   Petrol Ofisi Adana akaryakıt fiyatlarını çeker.
   GitHub Actions tarafından her sabah 08:30'da (TRT) çalıştırılır;
   sonuç public/akaryakit.json'a yazılır ve site yeniden yayınlanır.
   ============================================================ */
import { writeFileSync, readFileSync } from 'node:fs';

const URL = 'https://www.petrolofisi.com.tr/akaryakit-fiyatlari';
const OUT = 'public/akaryakit.json';
const HISTORY_OUT = 'public/akaryakit-tarihce.json';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function fail(msg) {
  console.error('HATA:', msg);
  process.exit(1);
}

const res = await fetch(URL, {
  headers: {
    'user-agent': UA,
    accept: 'text/html,application/xhtml+xml',
    'accept-language': 'tr-TR,tr;q=0.9,en;q=0.5',
  },
  redirect: 'follow',
}).catch((e) => fail('İstek atılamadı: ' + e.message));
if (!res.ok) fail('HTTP ' + res.status + ' — sayfa alınamadı (bot koruması olabilir).');

const html = await res.text();
// HTML'i düz metne indir: script/style at, etiketleri boşlukla değiştir.
const text = html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/\s+/g, ' ');

// 'ADANA' sayfada birden çok yerde geçer (şehir seçim listesi, KDV'siz /
// tavan fiyat gibi BAŞKA fiyat tabloları dahil). Doğru pompa fiyatı
// tablosunu bulmak için önce 'V/Max Kurşunsuz' sütun başlığına çapa
// atılır; ADANA satırı yalnızca bu başlığın DEVAMINDA aranır. O satırın
// ilk iki fiyatı V/Max Kurşunsuz 95 (benzin) ve V/Max Diesel (motorin)
// sütunlarıdır.
/**
 * Bir tablo satırındaki ilk iki POMPA fiyatını çıkarır. Sayfada her hücre
 * "64.62 53.85 TL/LT +KDV" biçiminde iki değer taşır: önce pompa (KDV dahil),
 * sonra KDV hariç fiyat. Pompa fiyatı her zaman büyük olandır. Hücrede tek
 * değer varsa (yapı değişirse) eski tek-değer deseni yedek olarak kullanılır.
 */
function parseRow(seg) {
  const pairs = [...seg.matchAll(/(\d{1,3}[.,]\d{2})\s+(\d{1,3}[.,]\d{2})\s*TL/gi)].map((m) => {
    const a = parseFloat(m[1].replace(',', '.'));
    const b = parseFloat(m[2].replace(',', '.'));
    return Math.max(a, b);
  });
  if (pairs.length >= 2) return [pairs[0], pairs[1]];
  const singles = [...seg.matchAll(/(\d{1,3})[.,](\d{2})\s*TL/gi)].map((m) => parseFloat(m[1] + '.' + m[2]));
  if (singles.length >= 2) return [singles[0], singles[1]];
  return null;
}

function scanAdana(t) {
  const re = /\bADANA\b/gi;
  let m;
  while ((m = re.exec(t))) {
    const seg = t.slice(m.index, m.index + 260);
    const first = seg.search(/\d{1,3}[.,]\d{2}/);
    if (first < 0 || first >= 90) continue; // fiyatsız geçiş (örn. şehir listesi)
    const nums = parseRow(seg);
    if (nums) {
      console.log('Eşleşen satır bağlamı →', seg.slice(0, 140));
      return nums;
    }
  }
  return null;
}

function extractAdanaPrices(t) {
  // Tüm 'V/Max Kurşunsuz' başlıklarını sırayla dene (doğru tablo çapası).
  const hre = /V\s*\/?\s*Max\s+Kur[şs]unsuz/gi;
  let hm;
  while ((hm = hre.exec(t))) {
    const nums = scanAdana(t.slice(hm.index, hm.index + 30000));
    if (nums) return nums;
  }
  // Başlık bulunamazsa son çare: tüm sayfada tara (eski davranış).
  console.error("Uyarı: 'V/Max Kurşunsuz' başlığı bulunamadı — tüm sayfa taranıyor.");
  return scanAdana(t);
}

const nums = extractAdanaPrices(text);
if (!nums) {
  // Teşhis için: sayfada hiç fiyat var mı, ilk fiyatın çevresi nasıl görünüyor?
  const all = [...text.matchAll(/(\d{1,3})[.,](\d{2})\s*TL/gi)];
  console.error('Teşhis: sayfadaki toplam TL fiyat sayısı =', all.length);
  if (all.length) {
    const ix = all[0].index ?? 0;
    console.error('Teşhis: ilk fiyatın bağlamı →', text.slice(Math.max(0, ix - 120), ix + 120));
  }
  fail('Fiyat tablosundaki ADANA satırı bulunamadı — sayfa yapısı değişmiş olabilir.');
}

const [benzin, motorin] = nums;
// Ayrıştırma kayarsa saçma değer yazmamak için makul aralık denetimi.
if (!(benzin > 10 && benzin < 500) || !(motorin > 10 && motorin < 500))
  fail(`Değerler makul aralık dışında: benzin=${benzin}, motorin=${motorin}`);

const out = {
  benzin,
  motorin,
  tarih: new Date().toISOString(),
  kaynak: 'petrolofisi.com.tr',
  sehir: 'Adana',
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('OK →', OUT, JSON.stringify(out));

// Tarihçe: her günün fiyatını ayrı bir kayıt olarak biriktirir — Anlaşmalı
// Fiyatlar grafiğinde akaryakıt fiyatını gün gün karşılaştırmak içindir.
// akaryakit.json (yukarıda) yalnızca EN GÜNCEL anlık görüntüyü tutar ve
// Dashboard'daki kartlar için değişmeden kullanılmaya devam eder.
let tarihce = [];
try {
  const parsed = JSON.parse(readFileSync(HISTORY_OUT, 'utf8'));
  if (Array.isArray(parsed)) tarihce = parsed;
} catch {
  tarihce = []; // dosya henüz yok veya bozuk — sıfırdan başla
}
const bugun = out.tarih.slice(0, 10);
const gunlukKayit = { tarih: bugun, benzin, motorin };
const mevcutIdx = tarihce.findIndex((k) => k && k.tarih === bugun);
if (mevcutIdx >= 0) tarihce[mevcutIdx] = gunlukKayit;
else tarihce.push(gunlukKayit);
tarihce.sort((a, b) => a.tarih.localeCompare(b.tarih));
writeFileSync(HISTORY_OUT, JSON.stringify(tarihce, null, 2) + '\n');
console.log('OK →', HISTORY_OUT, tarihce.length, 'gün');
