/* ============================================================
   Coğrafi yardımcılar — orijinal uygulamadan birebir.
   ============================================================ */
import type { Coord, Lokasyon } from './types';

const OLC_A = '23456789CFGHJMPQRVWX';

/** Google Plus Code çözücü. */
export function decodePlusCode(code: string): Coord | null {
  if (!code) return null;
  code = String(code).toUpperCase().replace(/[^0-9A-Z+]/g, '');
  if (code.indexOf('+') < 0) return null;
  let clean = '';
  for (const ch of code) {
    if (ch === '+' || ch === '0') continue;
    clean += ch;
  }
  if (clean.length < 8) return null;
  for (const ch of clean) {
    if (OLC_A.indexOf(ch) < 0) return null;
  }
  let lat = -90;
  let lng = -180;
  let res = 20;
  const dg = Math.min(clean.length, 10);
  for (let i = 0; i + 1 < dg; i += 2) {
    lat += OLC_A.indexOf(clean[i]) * res;
    lng += OLC_A.indexOf(clean[i + 1]) * res;
    res /= 20;
  }
  let rLat = res * 20;
  let rLng = res * 20;
  if (clean.length > 10) {
    let a = rLat;
    let b = rLng;
    for (let i = 10; i < Math.min(clean.length, 15); i++) {
      a /= 5;
      b /= 4;
      const d = OLC_A.indexOf(clean[i]);
      lat += Math.floor(d / 4) * a;
      lng += (d % 4) * b;
    }
    rLat = a;
    rLng = b;
  }
  return { lat: lat + rLat / 2, lng: lng + rLng / 2 };
}

/** Çeşitli konum metinlerinden koordinat ayrıştırır (Google Maps linki, plus code, "lat,lng"…). */
export function parseKonum(s: string): Coord | null {
  if (!s) return null;
  s = String(s).trim();
  let m =
    s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
    s.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/) ||
    s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (m) return { lat: +m[1], lng: +m[2] };
  const p = decodePlusCode(s);
  if (p) return p;
  m = s.match(/(-?\d{1,2}\.\d+)\s*[,; ]\s*(-?\d{1,3}\.\d+)/);
  if (m) return { lat: +m[1], lng: +m[2] };
  m = s.match(/^\s*(-?\d{1,2}),(\d+)\s*[, ]\s*(-?\d{1,3}),(\d+)\s*$/);
  if (m) return { lat: +(m[1] + '.' + m[2]), lng: +(m[3] + '.' + m[4]) };
  return null;
}

/** İki nokta arası kuş uçuşu mesafe (km). */
export function haversine(a: Coord, b: Coord): number {
  const R = 6371;
  const r = (x: number) => (x * Math.PI) / 180;
  const dLa = r(b.lat - a.lat);
  const dLo = r(b.lng - a.lng);
  const s =
    Math.sin(dLa / 2) ** 2 +
    Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function hasCoord(l: Lokasyon | null | undefined): l is Lokasyon & Coord {
  return !!l && typeof l.lat === 'number' && typeof l.lng === 'number';
}

/** Zaman aşımlı JSON fetch. */
async function fetchJson(url: string, ms?: number): Promise<unknown> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms || 8000);
  try {
    const r = await fetch(url, { signal: c.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    clearTimeout(t);
    return null;
  }
}

/** Adres -> koordinat (Photon, ardından Nominatim). */
export async function geocode(q: string): Promise<Coord | null> {
  if (!q) return null;
  let j = (await fetchJson(
    'https://photon.komoot.io/api/?limit=1&lang=tr&bbox=25.6,35.8,44.9,42.3&q=' +
      encodeURIComponent(q),
  )) as { features?: { geometry?: { coordinates?: number[] } }[] } | null;
  if (j && j.features && j.features[0] && j.features[0].geometry) {
    const c = j.features[0].geometry.coordinates!;
    return { lat: +c[1], lng: +c[0] };
  }
  const k = (await fetchJson(
    'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=tr&accept-language=tr&q=' +
      encodeURIComponent(q),
  )) as { lat: string; lon: string }[] | null;
  if (k && k[0]) return { lat: +k[0].lat, lng: +k[0].lon };
  return null;
}

/** En kısa karayolu mesafesi (km) — OSRM. */
export async function osrmShortest(a: Coord, b: Coord): Promise<number | null> {
  const j = (await fetchJson(
    `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false&alternatives=3`,
    9000,
  )) as { code?: string; routes?: { distance: number }[] } | null;
  if (!j || j.code !== 'Ok' || !j.routes || !j.routes.length) return null;
  return Math.min(...j.routes.map((x) => x.distance)) / 1000;
}
