/* ============================================================
   Veri modeli — orijinal uygulamadaki tüm alanlar korunmuştur.
   ============================================================ */

export type Durum = 'toplama' | 'onayda' | 'onaylandi' | 'reddedildi';

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

export interface NavlunKayit {
  id: string;
  donem: string; // YYYY-MM
  tarih?: string;
  hat?: string;
  tasiyici?: string;
  c20?: number | null;
  c40?: number | null;
  paraBirimi?: ParaBirimi;
  notlar?: string;
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
  kur: Kur;
  meta: Meta;
}

export type Coord = { lat: number; lng: number };
