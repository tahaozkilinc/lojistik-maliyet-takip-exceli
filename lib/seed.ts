/* ============================================================
   Tohumlama, göç (migrate) ve güvenli veri temizleme.
   ============================================================ */
import type { DB } from './types';
import { uid } from './format';
import { SAFE_FILE_DATA_URL } from './constants';

export function emptyDB(): DB {
  return {
    firmalar: [],
    lokasyonlar: [],
    talepler: [],
    denizNavlun: [],
    karaNavlun: [],
    navlunFirmalari: [],
    limanTalepleri: [],
    kur: { USD: 34.5, EUR: 37.2 },
    meta: { firma: 'Sunar Yatırım A.Ş.', departman: 'Dış Ticaret & Lojistik' },
  };
}

/**
 * Güvenlik: dışarıdan gelen (yedek dosyası / localStorage) JSON'u prototip
 * kirlenmesine (prototype pollution) karşı temizler. __proto__, constructor,
 * prototype anahtarları atılır; yapı yeniden oluşturulur.
 */
export function sanitizeParsed<T>(value: T): T {
  const seen = new WeakSet<object>();
  const walk = (v: unknown): unknown => {
    if (v === null || typeof v !== 'object') return v;
    if (seen.has(v as object)) return undefined;
    seen.add(v as object);
    if (Array.isArray(v)) return v.map(walk);
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(v as Record<string, unknown>)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      out[key] = walk((v as Record<string, unknown>)[key]);
    }
    return out;
  };
  return walk(value) as T;
}

/**
 * Güvenlik: imzalı belge data: URL'leri yalnızca güvenli görsel/PDF biçimiyse
 * korunur. data:text/html ve image/svg+xml gibi script çalıştırabilen içerikler
 * atılır (XSS önlemi).
 */
export function sanitizeBelgeUrls(db: DB): DB {
  db.talepler.forEach((t) => {
    const b = t.onay && t.onay.imzaliBelge;
    if (b && b.data && !SAFE_FILE_DATA_URL.test(b.data)) {
      if (t.onay) t.onay.imzaliBelge = null;
    }
  });
  db.denizNavlun.forEach((n) => {
    const b = n.onay && n.onay.imzaliBelge;
    if (b && b.data && !SAFE_FILE_DATA_URL.test(b.data)) {
      if (n.onay) n.onay.imzaliBelge = null;
    }
  });
  db.karaNavlun.forEach((n) => {
    const b = n.onay && n.onay.imzaliBelge;
    if (b && b.data && !SAFE_FILE_DATA_URL.test(b.data)) {
      if (n.onay) n.onay.imzaliBelge = null;
    }
  });
  return db;
}

/** Yüklenen veriyi varsayılanlarla birleştirir ve temizler. */
export function normalizeDB(raw: unknown, fallbackMeta?: DB['meta']): DB {
  const base = emptyDB();
  if (fallbackMeta) base.meta = fallbackMeta;
  const clean = sanitizeParsed(raw) as Partial<DB> | null;
  if (!clean || typeof clean !== 'object') return base;
  const rawTalepler = Array.isArray(clean.talepler) ? clean.talepler : base.talepler;
  const db: DB = {
    firmalar: Array.isArray(clean.firmalar) ? clean.firmalar : base.firmalar,
    lokasyonlar: Array.isArray(clean.lokasyonlar) ? clean.lokasyonlar : base.lokasyonlar,
    // teklifler eksikse boş dizi ver — yoksa TalepDetail render'da çöküyor.
    talepler: rawTalepler.map((t) => (!Array.isArray(t.teklifler) ? { ...t, teklifler: [] } : t)),
    denizNavlun: Array.isArray(clean.denizNavlun) ? clean.denizNavlun : base.denizNavlun,
    karaNavlun: Array.isArray(clean.karaNavlun) ? clean.karaNavlun : base.karaNavlun,
    navlunFirmalari: Array.isArray(clean.navlunFirmalari) ? clean.navlunFirmalari : base.navlunFirmalari,
    limanTalepleri: (Array.isArray(clean.limanTalepleri) ? clean.limanTalepleri : base.limanTalepleri).map(
      (lt) => (!Array.isArray(lt.masraflar) ? { ...lt, masraflar: [] } : lt),
    ),
    kur: clean.kur && typeof clean.kur === 'object' ? { ...base.kur, ...clean.kur } : base.kur,
    meta: clean.meta && typeof clean.meta === 'object' ? { ...base.meta, ...clean.meta } : base.meta,
  };
  return sanitizeBelgeUrls(db);
}

/** Boşsa demo veri üretir (orijinal seedIfEmpty). */
export function seedIfEmpty(db: DB): void {
  if (db.talepler.length || db.firmalar.length || db.lokasyonlar.length) return;
  const now = () => new Date().toISOString();
  const fab = {
    id: uid('l'),
    ad: 'Sunar Mısır',
    il: 'Adana',
    sehir: 'Adana',
    ilce: 'Sarıçam',
    tip: 'Fabrika',
    adres: 'Organize Sanayi Bölgesi / Adana',
    iletisim: '',
    telefon: '',
    email: '',
    notlar: 'Varsayılan teslim noktası',
    fabrika: true,
    lat: 37.0671,
    lng: 35.4126,
    createdAt: now(),
  };
  const l1 = {
    id: uid('l'),
    ad: 'Konya Silosu',
    il: 'Konya',
    sehir: 'Konya',
    ilce: 'Selçuklu',
    tip: 'Silo',
    adres: '',
    iletisim: 'Ali Vural',
    telefon: '+90 332 000 00 00',
    email: '',
    notlar: 'Mısır tedarik noktası',
    fabrika: false,
    lat: 37.9136,
    lng: 32.4925,
    createdAt: now(),
  };
  const l2 = {
    id: uid('l'),
    ad: 'Şanlıurfa Toplama',
    il: 'Şanlıurfa',
    sehir: 'Şanlıurfa',
    ilce: 'Haliliye',
    tip: 'Tedarikçi',
    adres: '',
    iletisim: '',
    telefon: '',
    email: '',
    notlar: 'Soya / mısır',
    fabrika: false,
    lat: 37.1591,
    lng: 38.7969,
    createdAt: now(),
  };
  db.lokasyonlar = [fab, l1, l2];
  const f1 = {
    id: uid('f'),
    ad: 'Çukurova Lojistik A.Ş.',
    sehir: 'Adana',
    vergiNo: '1234567890',
    telefon: '+90 322 000 00 00',
    adres: 'Seyhan / Adana',
    notlar: 'Konya-Adana hattında güçlü, frigo filosu geniş.',
    calisanlar: [
      {
        ad: 'Mehmet Yıldız',
        unvan: 'Operasyon Md.',
        email: 'mehmet@cukurovalojistik.com',
        telefon: '+90 532 000 00 01',
      },
    ],
    anlasmalar: [
      { id: uid('a'), yuklemeLokasyonId: l1.id, teslimLokasyonId: fab.id, birimFiyat: 560, paraBirimi: 'TRY', tarih: '', gecmis: [] },
    ],
    createdAt: now(),
  };
  const f2 = {
    id: uid('f'),
    ad: 'Akdeniz Nakliyat',
    sehir: 'Mersin',
    vergiNo: '9876543210',
    telefon: '+90 324 000 00 00',
    adres: 'Akdeniz / Mersin',
    notlar: 'İç Anadolu yükleme tecrübesi yüksek.',
    calisanlar: [
      { ad: 'Ayşe Demir', unvan: 'Satış', email: 'ayse@akdeniznak.com', telefon: '+90 533 000 00 02' },
    ],
    anlasmalar: [],
    createdAt: now(),
  };
  const f3 = {
    id: uid('f'),
    ad: 'Toros Transport',
    sehir: 'Adana',
    vergiNo: '5556667770',
    telefon: '+90 322 111 11 11',
    adres: 'Yüreğir / Adana',
    notlar: '',
    calisanlar: [
      { ad: 'Kemal Aslan', unvan: 'Filo Sorumlusu', email: 'kemal@torostransport.com', telefon: '+90 534 000 00 03' },
    ],
    anlasmalar: [],
    createdAt: now(),
  };
  db.firmalar = [f1, f2, f3];
  const t = {
    id: uid('t'),
    talepNo: 'NT-' + new Date().getFullYear() + '-001',
    yuklemeLokasyonId: l1.id,
    teslimLokasyonId: fab.id,
    yuklemeNoktasi: 'Konya Silosu',
    teslimNoktasi: 'Sunar Mısır',
    yukTipi: 'Mısır',
    miktar: 28,
    birim: 'ton',
    aracTipi: 'Tır (Tenteli)',
    yuklemeTarihi: new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10),
    aciklama: 'Sabah 08:00 yükleme. Yağmura karşı tente şart.',
    teklifler: [
      { id: uid('q'), firmaId: f1.id, fiyat: 580, paraBirimi: 'TRY', kdvDahil: false, teslimSuresi: '1 gün', gecerlilik: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10), notlar: 'Peşin ödeme', createdAt: now() },
      { id: uid('q'), firmaId: f2.id, fiyat: 545, paraBirimi: 'TRY', kdvDahil: false, teslimSuresi: '1 gün', gecerlilik: new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10), notlar: '', createdAt: now() },
      { id: uid('q'), firmaId: f3.id, fiyat: 610, paraBirimi: 'TRY', kdvDahil: true, teslimSuresi: '2 gün', gecerlilik: '', notlar: 'KDV dahil fiyat', createdAt: now() },
    ],
    secilenTeklifId: null,
    durum: 'toplama' as const,
    onay: null,
    createdAt: now(),
  };
  const yil = new Date().getFullYear();
  const seedNav = (ay: number, hat: string, c20: number, c40: number) => ({
    id: uid('n'),
    donem: yil + '-' + String(ay).padStart(2, '0'),
    tarih: yil + '-' + String(ay).padStart(2, '0') + '-15',
    hat,
    tasiyici: '',
    c20,
    c40,
    paraBirimi: 'USD',
    notlar: '',
    createdAt: now(),
  });
  db.denizNavlun = [
    seedNav(1, 'Mersin → Shanghai', 1850, 2950),
    seedNav(2, 'Mersin → Shanghai', 1780, 2880),
    seedNav(3, 'Mersin → Shanghai', 1920, 3100),
    seedNav(4, 'Mersin → Shanghai', 2050, 3250),
    seedNav(5, 'Mersin → Shanghai', 1990, 3180),
  ];
  db.talepler = [t];
}

/** Eski veri yapısını yeni şemaya taşır (orijinal migrate). Değişiklik olduysa true döner. */
export function migrate(db: DB): boolean {
  if (!Array.isArray(db.lokasyonlar)) db.lokasyonlar = [];
  if (!Array.isArray(db.denizNavlun)) db.denizNavlun = [];
  if (!Array.isArray(db.karaNavlun)) db.karaNavlun = [];
  if (!Array.isArray(db.navlunFirmalari)) db.navlunFirmalari = [];
  if (!Array.isArray(db.limanTalepleri)) { db.limanTalepleri = []; }
  db.limanTalepleri.forEach((lt) => { if (!Array.isArray(lt.masraflar)) { lt.masraflar = []; dirty = true; } });
  if (
    !(
      db.talepler.length ||
      db.firmalar.length ||
      db.lokasyonlar.length ||
      db.denizNavlun.length ||
      db.karaNavlun.length
    )
  )
    return false;
  let dirty = false;
  let fab = db.lokasyonlar.find((l) => l.fabrika);
  if (!fab) {
    fab = {
      id: uid('l'),
      ad: 'Sunar Mısır',
      sehir: 'Adana',
      tip: 'Fabrika',
      adres: '',
      iletisim: '',
      telefon: '',
      email: '',
      notlar: 'Varsayılan teslim noktası',
      fabrika: true,
      createdAt: new Date().toISOString(),
    };
    db.lokasyonlar.unshift(fab);
    dirty = true;
  }
  db.talepler.forEach((t) => {
    if (!Array.isArray(t.teklifler)) {
      t.teklifler = [];
      dirty = true;
    }
    if (!t.yuklemeLokasyonId && t.yuklemeNoktasi) {
      let l = db.lokasyonlar.find((x) => x.ad.toLowerCase() === t.yuklemeNoktasi.toLowerCase());
      if (!l) {
        l = {
          id: uid('l'),
          ad: t.yuklemeNoktasi,
          sehir: '',
          tip: 'Yükleme Noktası',
          adres: '',
          iletisim: '',
          telefon: '',
          email: '',
          notlar: '',
          fabrika: false,
          createdAt: new Date().toISOString(),
        };
        db.lokasyonlar.push(l);
      }
      t.yuklemeLokasyonId = l.id;
      dirty = true;
    }
    if (!t.teslimLokasyonId && t.teslimNoktasi) {
      let l = db.lokasyonlar.find((x) => x.ad.toLowerCase() === t.teslimNoktasi.toLowerCase());
      if (!l) {
        l = {
          id: uid('l'),
          ad: t.teslimNoktasi,
          sehir: '',
          tip: 'Diğer',
          adres: '',
          iletisim: '',
          telefon: '',
          email: '',
          notlar: '',
          fabrika: false,
          createdAt: new Date().toISOString(),
        };
        db.lokasyonlar.push(l);
      }
      t.teslimLokasyonId = l.id;
      dirty = true;
    }
  });
  // anlaşmaları v2'ye normalize et: (hat+ürün) başına tek güncel fiyat + gecmis[]
  db.firmalar.forEach((f) => {
    if (!Array.isArray(f.anlasmalar) || !f.anlasmalar.length) return;
    if (f.anlasmalar.every((a) => a.gecmis !== undefined && a.id)) return; // zaten v2
    const groups: Record<string, typeof f.anlasmalar> = {};
    f.anlasmalar.forEach((a) => {
      const k = (a.yuklemeLokasyonId || '') + '|' + (a.teslimLokasyonId || '') + '|' + (a.yukTipi || '');
      (groups[k] = groups[k] || []).push(a);
    });
    const yeni: typeof f.anlasmalar = [];
    Object.values(groups).forEach((rows) => {
      rows.sort((x, y) => (x.tarih || '').localeCompare(y.tarih || ''));
      const cur = rows[rows.length - 1];
      const gecmis = rows
        .slice(0, -1)
        .map((r) => ({ birimFiyat: Number(r.birimFiyat) || 0, paraBirimi: r.paraBirimi || 'TRY', tarih: r.tarih || '' }))
        .concat(Array.isArray(cur.gecmis) ? cur.gecmis : []);
      yeni.push({
        id: cur.id || uid('a'),
        yuklemeLokasyonId: cur.yuklemeLokasyonId,
        teslimLokasyonId: cur.teslimLokasyonId,
        yukTipi: cur.yukTipi || '',
        birimFiyat: Number(cur.birimFiyat) || 0,
        paraBirimi: cur.paraBirimi || 'TRY',
        tarih: cur.tarih || '',
        gecmis,
      });
    });
    f.anlasmalar = yeni;
    dirty = true;
  });
  db.denizNavlun.forEach((n) => {
    if (!Array.isArray(n.teklifler)) {
      n.teklifler = [];
      dirty = true;
    }
  });
  db.karaNavlun.forEach((n) => {
    if (!Array.isArray(n.teklifler)) {
      n.teklifler = [];
      dirty = true;
    }
  });
  // Navlun firma listesi ana Firma listesinden ayrıldı; daha önce ana listeden
  // seçilmiş tekliflerin firma adı kaybolmasın diye eksik kayıtları kopyalar.
  const ensureNavlunFirma = (firmaId: string | undefined) => {
    if (!firmaId) return;
    if (db.navlunFirmalari.some((nf) => nf.id === firmaId)) return;
    const f = db.firmalar.find((x) => x.id === firmaId);
    if (!f) return;
    db.navlunFirmalari.push({
      id: f.id,
      ad: f.ad,
      telefon: f.telefon || '',
      adres: f.adres || '',
      notlar: f.notlar || '',
      createdAt: f.createdAt,
    });
    dirty = true;
  };
  db.denizNavlun.forEach((n) => (n.teklifler || []).forEach((t) => ensureNavlunFirma(t.firmaId)));
  db.karaNavlun.forEach((n) => (n.teklifler || []).forEach((t) => ensureNavlunFirma(t.firmaId)));
  return dirty;
}
