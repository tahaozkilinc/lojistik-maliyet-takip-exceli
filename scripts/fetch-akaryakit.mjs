#!/usr/bin/env node
/* ============================================================
   Petrol Ofisi Adana akaryakıt fiyatlarını çeker.
   GitHub Actions tarafından her sabah 08:30'da (TRT) çalıştırılır;
   sonuç public/akaryakit.json'a yazılır ve site yeniden yayınlanır.
   ============================================================ */
import { writeFileSync } from 'node:fs';

const URL = 'https://www.petrolofisi.com.tr/akaryakit-fiyatlari';
const OUT = 'public/akaryakit.json';
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

// ADANA satırını bul; hemen ardından gelen ilk iki fiyat sütunu
// V/Max Kurşunsuz 95 (benzin) ve V/Max Diesel (motorin) değerleridir.
const i = text.search(/\bADANA\b/i);
if (i < 0) fail("Sayfada 'ADANA' satırı bulunamadı — sayfa yapısı değişmiş olabilir.");
const seg = text.slice(i, i + 400);
const nums = [...seg.matchAll(/(\d{1,3})[.,](\d{2})\s*TL/gi)].map((m) => parseFloat(m[1] + '.' + m[2]));
if (nums.length < 2) fail('ADANA satırında fiyat değerleri ayrıştırılamadı: ' + seg.slice(0, 160));

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
