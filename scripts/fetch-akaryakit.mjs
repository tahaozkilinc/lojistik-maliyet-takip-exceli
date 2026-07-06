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

// 'ADANA' sayfada birden çok yerde geçer (örn. şehir seçim listesi).
// Fiyat tablosundaki satırı bulmak için TÜM geçişleri tarar; hemen
// yanında (ilk 90 karakter içinde) fiyat başlayan ilk geçişi kullanırız.
// O satırın ilk iki fiyatı V/Max Kurşunsuz 95 (benzin) ve V/Max Diesel
// (motorin) sütunlarıdır.
function extractAdanaPrices(t) {
  const re = /\bADANA\b/gi;
  let m;
  while ((m = re.exec(t))) {
    const seg = t.slice(m.index, m.index + 260);
    const prices = [...seg.matchAll(/(\d{1,3})[.,](\d{2})\s*TL/gi)];
    if (prices.length >= 2 && prices[0].index < 90) {
      return prices.slice(0, 2).map((p) => parseFloat(p[1] + '.' + p[2]));
    }
  }
  return null;
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
