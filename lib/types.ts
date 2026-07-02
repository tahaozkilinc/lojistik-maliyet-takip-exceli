/* ============================================================
   Veri modeli — orijinal uygulamadaki tüm alanlar korunmuştur.
   ============================================================ */

export type Durum = 'toplama' | 'onayda' | 'onaylandi' | 'reddedildi';
export type LimanDurum = 'devam' | 'tamamlandi' | 'iptal';

/** Para birimi kodları; veri farklı kodlar da içerebileceğinden string tabanı korunur. */
export type ParaBirimi = 'TRY' | 'USD' | 'EUR' | (string & {});

export interface Calisan {
  ad: string;
  unvan?: string;
  email?: string;
  telefon?: string;
}

export interface AnlasmaGecmis {
  birimFiyat: number;
  paraBirimi: ParaBirimi;
  tarih: string;
}

export interface Anlasma {
  id?: string;
  yuklemeLokasyonId: string;
  teslimLokasyonId: string;
  yukTipi?: string;
  birimFiyat: number;
  paraBirimi: ParaBirimi;
  tarih?: string;
  gecmis?: AnlasmaGecmis[];
}

export interface Firma {
  id: string;
  ad: string;
  sehir?: string;
  vergiNo?: string;
  telefon?: string;
  adres?: string;
  notlar?: string;
  calisanlar?: Calisan[];
  anlasmalar?: Anlasma[];
  createdAt?: string;
}

export interface Lokasyon {
  id: string;
  ad: string;
  il?: string;
  sehir?: string;
  ilce?: string;
  tip?: string;
  adres?: string;
  iletisim?: string;
  telefon?: string;
  email?: string;
  notlar?: string;
  fabrika?: boolean;
  lat?: number | null;
  lng?: number | null;
  createdAt?: string;
}

export interface Teklif {
  id: string;
  firmaId: string;
  fiyat: number;
  paraBirimi: ParaBirimi;
  kdvDahil?: boolean;
  teslimSuresi?: string;
  gecerlilik?: string;
  notlar?: string;
  createdAt?: string;
}

export interface ImzaliBelge {
  ad: string;
  tip: string;
  boyut?: string;
  /** data: URL — yalnızca image/* veya application/pdf kabul edilir. */
  data: string;
}

export interface Onay {
  gonderim?: string | null;
  yonetici?: string;
  tarih?: string;
  not?: string;
  imzaliBelge?: ImzaliBelge | null;
  /** Yalnızca navlun dönemsel onayında kullanılır: taşıma kime/hangi departmana devredildi. */
  atandi?: string;
}

export interface Gerceklesen {
  birimFiyat: number;
  paraBirimi: ParaBirimi;
  not?: string;
  tarih?: string;
}

export interface Talep {
  id: string;
  talepNo: string;
  yuklemeLokasyonId: string;
  teslimLokasyonId: string;
  yuklemeNoktasi: string;
  teslimNoktasi: string;
  yukTipi?: string;
  miktar?: number | null;
  birim?: string;
  aracTipi?: string;
  yuklemeTarihi?: string;
  aciklama?: string;
  teklifler: Teklif[];
  secilenTeklifId?: string | null;
  durum: Durum;
  onay?: Onay | null;
  gerceklesen?: Gerceklesen | null;
  mesafeKm?: number | null;
  kusUcusuKm?: number | null;
  createdAt?: string;
}

/**
 * Navlun (deniz + kara) tekliflerinde kullanılan firma kaydı. Ana sistemin
 * Firma (Talep modülü, nakliyeci) listesinden tamamen bağımsızdır — kasıtlı
 * olarak ayrı tutulur, karışmaz.
 */
export interface NavlunFirma {
  id: string;
  ad: string;
  telefon?: string;
  email?: string;
  adres?: string;
  notlar?: string;
  createdAt?: string;
}

/** Bir deniz navlun kaydı için firmadan alınan fiyat teklifi. */
export interface NavlunTeklif {
  id: string;
  /** NavlunFirma.id — Talep modülündeki Firma listesinden bağımsızdır. */
  firmaId: string;
  /** Kullanıcının kendi sipariş/referans kodu (firma bazında farklı olabilir). */
  siparisKodu?: string;
  c20?: number | null;
  c40?: number | null;
  paraBirimi?: ParaBirimi;
  notlar?: string;
  createdAt?: string;
}

export interface NavlunKayit {
  id: string;
  donem: string; // YYYY-MM
  tarih?: string;
  /** Bileşik güzergah ("Kalkış → Varış") — filtre/grafik/analizler bu alanı kullanır. */
  hat?: string;
  /** Güzergahın ayrı girilen kalkış noktası. */
  kalkisYeri?: string;
  /** Güzergahın ayrı girilen varış noktası. */
  varisYeri?: string;
  tasiyici?: string;
  /** NavlunFirma.id — taşımayı yapan firma, Navlun Firmaları listesinden seçilir. */
  firmaId?: string;
  /** Gerçekleşen taşımanın sipariş numarası. */
  siparisNo?: string;
  c20?: number | null;
  c40?: number | null;
  paraBirimi?: ParaBirimi;
  notlar?: string;
  createdAt?: string;
  /** Firmalardan alınan teklifler (kıyaslama için); Talep'in teklif sistemine benzer ama ayrıdır. */
  teklifler?: NavlunTeklif[];
  secilenTeklifId?: string | null;
  /** Dönemsel anlaşma onay durumu — Talep'in sevkiyat bazlı onayından bağımsızdır. */
  durum?: Durum;
  onay?: Onay | null;
}

/** Bir kara navlun kaydı için firmadan alınan fiyat teklifi. */
export interface KaraNavlunTeklif {
  id: string;
  /** NavlunFirma.id — Talep modülündeki Firma listesinden bağımsızdır. */
  firmaId: string;
  /** Kullanıcının kendi sipariş/referans kodu (firma bazında farklı olabilir). */
  siparisKodu?: string;
  fiyat?: number | null;
  paraBirimi?: ParaBirimi;
  notlar?: string;
  createdAt?: string;
}

export interface KaraNavlunKayit {
  id: string;
  donem: string; // YYYY-MM
  tarih?: string;
  /** Bileşik güzergah ("Kalkış → Varış") — filtre/grafik/analizler bu alanı kullanır. */
  hat?: string;
  /** Güzergahın ayrı girilen kalkış noktası. */
  kalkisYeri?: string;
  /** Güzergahın ayrı girilen varış noktası. */
  varisYeri?: string;
  tasiyici?: string;
  /** NavlunFirma.id — taşımayı yapan firma, Navlun Firmaları listesinden seçilir. */
  firmaId?: string;
  /** Gerçekleşen taşımanın sipariş numarası. */
  siparisNo?: string;
  aracTipi?: string;
  fiyat?: number | null;
  birim?: string;
  paraBirimi?: ParaBirimi;
  notlar?: string;
  createdAt?: string;
  teklifler?: KaraNavlunTeklif[];
  secilenTeklifId?: string | null;
  durum?: Durum;
  onay?: Onay | null;
}

export interface LimanMasraf {
  id: string;
  masrafTipi: string;
  aciklama?: string;
  firmaId?: string;
  fiyat: number;
  paraBirimi: ParaBirimi;
  kdvDahil?: boolean;
  createdAt?: string;
}

export interface LimanTalep {
  id: string;
  talepNo: string;
  limanId: string;
  gemiAdi?: string;
  seferNo?: string;
  yukTipi?: string;
  konteynerSayisi?: number | null;
  konteynerTipi?: string;
  masraflar: LimanMasraf[];
  durum: LimanDurum;
  notlar?: string;
  girisTarihi?: string;
  cikisTarihi?: string;
  createdAt?: string;
}

export interface Kur {
  USD: number;
  EUR: number;
  [k: string]: number;
}

export interface Meta {
  firma: string;
  departman: string;
}

export interface DB {
  firmalar: Firma[];
  lokasyonlar: Lokasyon[];
  talepler: Talep[];
  denizNavlun: NavlunKayit[];
  karaNavlun: KaraNavlunKayit[];
  /** Navlun (deniz + kara) tekliflerinde kullanılan, ana Firma listesinden bağımsız firma kaydı. */
  navlunFirmalari: NavlunFirma[];
  limanTalepleri: LimanTalep[];
  kur: Kur;
  meta: Meta;
}

export type Coord = { lat: number; lng: number };
