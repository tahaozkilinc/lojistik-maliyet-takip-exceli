/* ============================================================
   İş mantığı / hesaplamalar — orijinal uygulamadan birebir.
   Global DB yerine saf fonksiyonlara `db` parametre olarak verilir.
   ============================================================ */
import type { DB, Talep, Teklif, Lokasyon, Anlasma, Firma, Durum } from './types';
import { hasCoord, haversine } from './geo';

export function lokById(db: DB, id: string): Lokasyon | undefined {
  return db.lokasyonlar.find((l) => l.id === id);
}

/** Bir yedeği geri yüklemeden önce kullanıcıya gösterilecek, karşılaştırılabilir kayıt türleri. */
export const KAYIT_ALANLARI: { key: keyof DB; label: string }[] = [
  { key: 'talepler', label: 'Nakliye Talepleri' },
  { key: 'firmalar', label: 'Firmalar' },
  { key: 'lokasyonlar', label: 'Lokasyonlar' },
  { key: 'denizNavlun', label: 'Deniz Navlun Kayıtları' },
  { key: 'karaNavlun', label: 'Kara Navlun Kayıtları' },
  { key: 'navlunFirmalari', label: 'Navlun Firmaları' },
  { key: 'tasimaTalepleri', label: 'Taşıma Talepleri' },
  { key: 'limanTalepleri', label: 'Liman/Depo Talepleri' },
];

export function recordCount(db: DB, key: keyof DB): number {
  const v = db[key];
  return Array.isArray(v) ? v.length : 0;
}

/** Tutarı TRY'ye çevirir (kur DB'den). */
export function toTRY(db: DB, amount: number, cur: string): number {
  if (cur === 'TRY') return amount;
  if (cur === 'USD') return amount * (db.kur.USD || 1);
  if (cur === 'EUR') return amount * (db.kur.EUR || 1);
  return amount;
}

export function firmName(db: DB, id: string): string {
  const f = db.firmalar.find((x) => x.id === id);
  return f ? f.ad : '(silinmiş firma)';
}

/** Navlun'a özel firma listesinden ad döner — ana Firma listesinden bağımsızdır. */
export function navlunFirmName(db: DB, id: string): string {
  const f = db.navlunFirmalari.find((x) => x.id === id);
  return f ? f.ad : '(silinmiş firma)';
}

export interface NavlunFirmaTeklifItem {
  id: string;
  kayitId: string;
  /** Kaydın bulunduğu koleksiyon — detay ekranında doğru düzenleme penceresini açmak için. */
  kaynak: 'denizNavlun' | 'karaNavlun' | 'tasimaTalep';
  tur: 'deniz' | 'kara' | 'hava';
  hat: string;
  tarih?: string;
  fiyat: number;
  paraBirimi: string;
  durum: Durum;
  secildi: boolean;
}

/**
 * Bir navlun firmasının verdiği tüm teklifleri döner. Dört kaynağı kapsar:
 * (1) Deniz/Kara Navlun'daki çok-teklif kıyaslama akışında eklenen kayıtlar,
 * (2) kıyaslama kullanılmadan doğrudan bu firmaya (firmaId ile) atanan Deniz/
 * Kara Navlun kayıtları, (3) Navlun Firmaları listesi eklenmeden ÖNCE
 * girilmiş, taşıyıcısı yalnızca serbest metin (tasiyici) olarak tutulan eski
 * kayıtlar — firmanın adıyla (büyük/küçük harf ve boşluk gözetmeksizin)
 * birebir eşleşiyorsa sayılır — (4) Taşıma Talepleri (deniz/kara/hava)
 * modülündeki teklifler; TasimaTeklif.firmaId de yalnızca Navlun
 * Firmaları'ndan seçildiğinden bu da sayılmalıdır. (4) kapsam dışı
 * bırakılsaydı Taşıma Talepleri üzerinden toplanan fiyatlar "Verilen Teklif"
 * sayısına hiç yansımazdı.
 */
export function navlunFirmaTeklifleri(db: DB, firmaId: string): NavlunFirmaTeklifItem[] {
  const out: NavlunFirmaTeklifItem[] = [];
  const hatOf = (n: { hat?: string; kalkisYeri?: string; varisYeri?: string }) =>
    n.hat || [n.kalkisYeri, n.varisYeri].filter(Boolean).join(' → ') || '—';
  const firma = db.navlunFirmalari.find((x) => x.id === firmaId);
  const norm = (s: string) => s.trim().toLocaleLowerCase('tr-TR');
  const adNorm = firma ? norm(firma.ad) : '';
  const eskiKayitEslesir = (n: { firmaId?: string; tasiyici?: string }) =>
    !n.firmaId && !!n.tasiyici && !!adNorm && norm(n.tasiyici) === adNorm;

  db.denizNavlun.forEach((n) => {
    const teklifler = (n.teklifler || []).filter((t) => t.firmaId === firmaId);
    if (teklifler.length) {
      teklifler.forEach((t) => {
        out.push({
          id: t.id,
          kayitId: n.id,
          kaynak: 'denizNavlun',
          tur: 'deniz',
          hat: hatOf(n),
          tarih: t.createdAt || n.tarih,
          fiyat: (t.c40 ?? t.c20 ?? 0) as number,
          paraBirimi: t.paraBirimi || 'USD',
          durum: n.durum || 'toplama',
          secildi: n.secilenTeklifId === t.id,
        });
      });
    } else if (n.firmaId === firmaId || eskiKayitEslesir(n)) {
      out.push({
        id: n.id,
        kayitId: n.id,
        kaynak: 'denizNavlun',
        tur: 'deniz',
        hat: hatOf(n),
        tarih: n.tarih,
        fiyat: (n.c40 ?? n.c20 ?? 0) as number,
        paraBirimi: n.paraBirimi || 'USD',
        durum: n.durum || 'toplama',
        secildi: true,
      });
    }
  });

  db.karaNavlun.forEach((n) => {
    const teklifler = (n.teklifler || []).filter((t) => t.firmaId === firmaId);
    if (teklifler.length) {
      teklifler.forEach((t) => {
        out.push({
          id: t.id,
          kayitId: n.id,
          kaynak: 'karaNavlun',
          tur: 'kara',
          hat: hatOf(n),
          tarih: t.createdAt || n.tarih,
          fiyat: t.fiyat ?? 0,
          paraBirimi: t.paraBirimi || 'TRY',
          durum: n.durum || 'toplama',
          secildi: n.secilenTeklifId === t.id,
        });
      });
    } else if (n.firmaId === firmaId || eskiKayitEslesir(n)) {
      out.push({
        id: n.id,
        kayitId: n.id,
        kaynak: 'karaNavlun',
        tur: 'kara',
        hat: hatOf(n),
        tarih: n.tarih,
        fiyat: n.fiyat ?? 0,
        paraBirimi: n.paraBirimi || 'TRY',
        durum: n.durum || 'toplama',
        secildi: true,
      });
    }
  });

  // Taşıma Talepleri (deniz/kara/hava) — teklifler her zaman doğrudan bu
  // firma listesinden (firmaId zorunlu alan) seçildiğinden eski kayıt/serbest
  // metin eşleşmesine gerek yoktur.
  db.tasimaTalepleri.forEach((t) => {
    const teklifler = (t.teklifler || []).filter((q) => q.firmaId === firmaId);
    teklifler.forEach((q) => {
      out.push({
        id: q.id,
        kayitId: t.id,
        kaynak: 'tasimaTalep',
        tur: q.mod,
        hat: `${t.kalkisYeri} → ${t.varisYeri}`,
        tarih: q.createdAt || t.tarih,
        fiyat: q.fiyat ?? 0,
        paraBirimi: q.paraBirimi || 'USD',
        durum: t.durum || 'toplama',
        secildi: t.secilenTeklifId === q.id,
      });
    });
  });

  return out.sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''));
}

export function lokName(db: DB, id: string): string {
  const l = db.lokasyonlar.find((x) => x.id === id);
  return l ? l.ad : '';
}

export function defaultTeslimId(db: DB): string {
  const f = db.lokasyonlar.find((l) => l.fabrika);
  return f ? f.id : db.lokasyonlar[0] ? db.lokasyonlar[0].id : '';
}

/** Bir talebin en uygun (en düşük TRY) teklif kimliği. */
export function bestQuoteId(db: DB, talep: Talep): string | null {
  let best: string | null = null;
  let min = Infinity;
  talep.teklifler.forEach((q) => {
    const v = toTRY(db, q.fiyat, q.paraBirimi);
    if (v < min) {
      min = v;
      best = q.id;
    }
  });
  return best;
}

export function qTotal(db: DB, q: Teklif, t: Talep): number {
  return toTRY(db, q.fiyat, q.paraBirimi) * (Number(t.miktar) || 0);
}

export function selectedQuote(t: Talep): Teklif | null {
  return t.teklifler.find((x) => x.id === t.secilenTeklifId) || null;
}

export interface GerceklesenBirim {
  firmaId: string;
  birimFiyat: number;
  paraBirimi: string;
  indirimli: boolean;
  orijinal: number;
  orijinalPara: string;
}

export function gerceklesenBirim(t: Talep): GerceklesenBirim | null {
  const q = selectedQuote(t);
  if (!q) return null;
  if (
    t.gerceklesen &&
    t.gerceklesen.birimFiyat != null &&
    isFinite(+t.gerceklesen.birimFiyat)
  ) {
    return {
      firmaId: q.firmaId,
      birimFiyat: +t.gerceklesen.birimFiyat,
      paraBirimi: t.gerceklesen.paraBirimi || q.paraBirimi,
      indirimli: true,
      orijinal: q.fiyat,
      orijinalPara: q.paraBirimi,
    };
  }
  return {
    firmaId: q.firmaId,
    birimFiyat: q.fiyat,
    paraBirimi: q.paraBirimi,
    indirimli: false,
    orijinal: q.fiyat,
    orijinalPara: q.paraBirimi,
  };
}

export function gercTotalTRY(db: DB, t: Talep): number {
  const g = gerceklesenBirim(t);
  return g ? toTRY(db, g.birimFiyat, g.paraBirimi) * (Number(t.miktar) || 0) : 0;
}

/**
 * Bir talebin liste/özet ekranlarında gösterilecek "nihai" birim fiyatı:
 * teklif seçilmişse ve gerçekleşen (indirimli) fiyat girildiyse o fiyat;
 * seçilmişse ama indirim girilmediyse seçilen teklif; hiç seçim yapılmadıysa
 * en uygun (en düşük) teklif. Talep listeleri, Onay Merkezi ve Fiyat
 * Analizi'nde "fiyat" gösterilen HER yerde bu fonksiyon kullanılmalıdır —
 * aksi halde girilen indirim yok sayılıp orijinal (indirimsiz) teklif fiyatı
 * gösterilir.
 */
export function efektifFiyat(db: DB, t: Talep): GerceklesenBirim | null {
  const g = gerceklesenBirim(t);
  if (g) return g;
  const q = t.teklifler.find((x) => x.id === bestQuoteId(db, t));
  if (!q) return null;
  return { firmaId: q.firmaId, birimFiyat: q.fiyat, paraBirimi: q.paraBirimi, indirimli: false, orijinal: q.fiyat, orijinalPara: q.paraBirimi };
}

/** efektifFiyat()'ın tonaj ile çarpılmış TRY karşılığı (talep listelerindeki "Toplam Tutar" içindir). */
export function efektifTotalTRY(db: DB, t: Talep): number {
  const e = efektifFiyat(db, t);
  return e ? toTRY(db, e.birimFiyat, e.paraBirimi) * (Number(t.miktar) || 0) : 0;
}

export function indirimYuzde(db: DB, t: Talep): number | null {
  const g = gerceklesenBirim(t);
  if (!g || !g.indirimli) return null;
  const o = toTRY(db, g.orijinal, g.orijinalPara);
  const y = toTRY(db, g.birimFiyat, g.paraBirimi);
  if (!o) return null;
  return ((o - y) / o) * 100;
}

export interface LokasyonStats {
  sefer: number;
  fiyatli: number;
  avg: number;
  min: number;
  max: number;
  son: number;
}

export function lokasyonStats(db: DB, locId: string, teslimId?: string): LokasyonStats {
  const ts = [...db.talepler.filter((t) => t.yuklemeLokasyonId === locId && (!teslimId || t.teslimLokasyonId === teslimId))].sort(
    (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(),
  );
  const prices: number[] = [];
  ts.forEach((t) => {
    const e = efektifFiyat(db, t);
    if (e) prices.push(toTRY(db, e.birimFiyat, e.paraBirimi));
  });
  return {
    sefer: ts.length,
    fiyatli: prices.length,
    avg: prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
    min: prices.length ? Math.min(...prices) : 0,
    max: prices.length ? Math.max(...prices) : 0,
    son: prices.length ? prices[prices.length - 1] : 0,
  };
}

export interface LimanMasrafStats {
  seferSayisi: number;
  toplamTRY: number;
}

/** Bir limanın tüm kayıtlarındaki masraf kalemlerinin (TRY) toplamı ve sefer sayısı — harita popup'u içindir. */
export function limanMasrafStats(db: DB, limanId: string): LimanMasrafStats {
  const kayitlar = db.limanTalepleri.filter((lt) => lt.limanId === limanId);
  let toplamTRY = 0;
  kayitlar.forEach((lt) => {
    (lt.masraflar || []).forEach((m) => {
      toplamTRY += toTRY(db, m.fiyat, m.paraBirimi);
    });
  });
  return { seferSayisi: kayitlar.length, toplamTRY };
}

export interface UrunStat {
  urun: string;
  sefer: number;
  fiyatli: number;
  avg: number;
  son: number;
}

export function lokasyonStatsByProduct(db: DB, locId: string): UrunStat[] {
  const m: Record<string, { prices: number[]; sefer: number; son: number }> = {};
  [...db.talepler.filter((t) => t.yuklemeLokasyonId === locId)]
    .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
    .forEach((t) => {
      const k = (t.yukTipi || 'Diğer').trim() || 'Diğer';
      if (!m[k]) m[k] = { prices: [], sefer: 0, son: 0 };
      m[k].sefer++;
      const e = efektifFiyat(db, t);
      if (e) {
        const v = toTRY(db, e.birimFiyat, e.paraBirimi);
        m[k].prices.push(v);
        m[k].son = v;
      }
    });
  return Object.keys(m)
    .map((k) => ({
      urun: k,
      sefer: m[k].sefer,
      fiyatli: m[k].prices.length,
      avg: m[k].prices.length ? m[k].prices.reduce((a, b) => a + b, 0) / m[k].prices.length : 0,
      son: m[k].son,
    }))
    .sort((a, b) => b.sefer - a.sefer);
}

export interface AnlasmaMatch {
  firma: Firma;
  anlasma: Anlasma;
}

export function findAnlasmalar(
  db: DB,
  yukId: string,
  tesId: string,
  urun?: string,
): AnlasmaMatch[] {
  const out: AnlasmaMatch[] = [];
  db.firmalar.forEach((f) =>
    (f.anlasmalar || []).forEach((a) => {
      if (
        a.yuklemeLokasyonId === yukId &&
        a.teslimLokasyonId === tesId &&
        (!a.yukTipi || !urun || a.yukTipi === urun) &&
        a.birimFiyat != null &&
        (a.birimFiyat as unknown) !== ''
      ) {
        out.push({ firma: f, anlasma: a });
      }
    }),
  );
  return out;
}

export interface SonIslem {
  firmaId: string;
  birimFiyat: number;
  paraBirimi: string;
  tarih?: string;
  durum?: string;
  yukTipi?: string;
  indirimli: boolean;
}

export function sonIslem(
  db: DB,
  yukId: string,
  tesId: string,
  exId?: string,
): SonIslem | null {
  const ts = db.talepler
    .filter(
      (t) =>
        t.id !== exId &&
        t.yuklemeLokasyonId === yukId &&
        t.teslimLokasyonId === tesId &&
        t.secilenTeklifId,
    )
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  if (!ts.length) return null;
  const t = ts[0];
  const g = gerceklesenBirim(t);
  return g
    ? {
        firmaId: g.firmaId,
        birimFiyat: g.birimFiyat,
        paraBirimi: g.paraBirimi,
        tarih: t.createdAt,
        durum: t.durum,
        yukTipi: t.yukTipi,
        indirimli: g.indirimli,
      }
    : null;
}

export interface FirmaSonFiyat {
  birimFiyat: number;
  paraBirimi: string;
  tarih?: string;
  indirimli: boolean;
}

export function firmaSonFiyat(
  db: DB,
  firmaId: string,
  yukId: string,
  tesId: string,
  exId?: string,
): FirmaSonFiyat | null {
  let best: FirmaSonFiyat | null = null;
  db.talepler.forEach((t) => {
    if (t.id === exId) return;
    if (t.yuklemeLokasyonId !== yukId || t.teslimLokasyonId !== tesId) return;
    t.teklifler
      .filter((q) => q.firmaId === firmaId)
      .forEach((q) => {
        let bf = q.fiyat;
        let bp = q.paraBirimi;
        let ind = false;
        if (
          t.secilenTeklifId === q.id &&
          t.gerceklesen &&
          t.gerceklesen.birimFiyat != null
        ) {
          bf = +t.gerceklesen.birimFiyat;
          bp = t.gerceklesen.paraBirimi || q.paraBirimi;
          ind = true;
        }
        if (!best || new Date(q.createdAt || 0) > new Date(best.tarih || 0)) {
          best = { birimFiyat: bf, paraBirimi: bp, tarih: q.createdAt, indirimli: ind };
        }
      });
  });
  return best;
}

export interface RouteKm {
  km: number;
  approx: boolean;
}

export function routeKmInfo(db: DB, t: Talep): RouteKm | null {
  if (t.mesafeKm) return { km: t.mesafeKm, approx: false };
  const yL = lokById(db, t.yuklemeLokasyonId);
  const tL = lokById(db, t.teslimLokasyonId);
  if (yL && tL && hasCoord(yL) && hasCoord(tL))
    return { km: Math.round(haversine(yL, tL) * 1.3 * 10) / 10, approx: true };
  return null;
}

/**
 * Bir lokasyon çifti için mesafe: bu hatta daha önce kesin (OSRM) mesafesi
 * hesaplanmış bir talep varsa onu kullanır; yoksa kuş uçuşu × 1.3 tahmini verir.
 */
export function lokRouteKmInfo(db: DB, yukId: string, tesId: string): RouteKm | null {
  const withExact = db.talepler.find((t) => t.yuklemeLokasyonId === yukId && t.teslimLokasyonId === tesId && t.mesafeKm);
  if (withExact && withExact.mesafeKm) return { km: withExact.mesafeKm, approx: false };
  const yL = lokById(db, yukId);
  const tL = lokById(db, tesId);
  if (yL && tL && hasCoord(yL) && hasCoord(tL))
    return { km: Math.round(haversine(yL, tL) * 1.3 * 10) / 10, approx: true };
  return null;
}
