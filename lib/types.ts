/* ============================================================
   Veri modeli — orijinal uygulamadaki tüm alanlar korunmuştur.
   ============================================================ */

export type Durum = 'toplama' | 'onayda' | 'onaylandi' | 'reddedildi';
export type LimanDurum = 'devam' | 'tamamlandi' | 'iptal';

/**
 * Kullanıcı yetki rolü — Supabase'de ayrı bir `profiles` tablosunda tutulur
 * (asla auth kullanıcı meta verisinde değil, bkz. lib/auth.ts).
 * goruntuleyici: yalnızca görüntüler. yonetici: tüm operasyonel işlemler.
 * admin: yonetici + kullanıcı rollerini yönetir.
 */
export type AppRole = 'admin' | 'yonetici' | 'goruntuleyici';

export interface Profile {
  id: string;
  email: string;
  role: AppRole;
}

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

/** Bir nakliye firmasıyla imzalanan sözleşme belgesi (tarama/fotoğraf/PDF). */
export interface Sozlesme {
  id: string;
  baslik?: string;
  /** Sözleşme tarihi (imza tarihi). */
  tarih?: string;
  belge: ImzaliBelge;
  createdAt?: string;
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
  sozlesmeler?: Sozlesme[];
  createdAt?: string;
  /** data: URL (yalnızca görsel — bkz. SAFE_IMAGE_MIME). */
  logo?: string | null;
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
  /** Eski kayıtlar için korunur; form artık göstermez. */
  email?: string;
  /** Eski kayıtlar için korunur; form artık göstermez. */
  adres?: string;
  notlar?: string;
  /** Firma iletişim kişileri. */
  calisanlar?: Calisan[];
  createdAt?: string;
  /** data: URL (yalnızca görsel — bkz. SAFE_IMAGE_MIME). */
  logo?: string | null;
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

/** Taşıma talebi teklif modu — talep içindeki üç ayrı fiyat bölümü. */
export type TasimaMod = 'deniz' | 'kara' | 'hava';

/** Taşıma talebine bir navlun firmasından girilen fiyat teklifi. */
export interface TasimaTeklif {
  id: string;
  /** Teklifin ait olduğu bölüm: deniz | kara | hava. */
  mod: TasimaMod;
  /** NavlunFirma.id — teklif veren firma yalnızca Navlun Firmaları listesinden seçilir. */
  firmaId: string;
  /** Toplam tutar. Deniz modunda navlunFiyat + lokalFiyat toplamıdır. */
  fiyat: number;
  paraBirimi: ParaBirimi;
  notlar?: string;
  createdAt?: string;
  /** Yalnızca deniz modunda kullanılır: konteyner tipi (20′, 40′, 40′ HC, Dökme Yük). */
  konteynerTipi?: string;
  /** Yalnızca deniz modunda kullanılır: ana deniz taşıma (okyanus navlunu) bedeli. */
  navlunFiyat?: number | null;
  /** Yalnızca deniz modunda kullanılır: liman/elleçleme gibi yerel (lokal) masraflar. */
  lokalFiyat?: number | null;
  /** Kara/hava modlarında opsiyonel ek masraf kalemleri (lokal, diğer vb.) — toplam `fiyat`a dahildir. */
  ekMasraflar?: { ad: string; tutar: number }[] | null;
}

/** Deniz/kara/hava fiyatlarının tek talep altında toplandığı taşıma talebi. */
export interface TasimaTalep {
  id: string;
  /** Eski kayıtlar için korunur; kimlik olarak artık siparisNo kullanılır. */
  talepNo: string;
  kalkisYeri: string;
  varisYeri: string;
  yukTipi?: string;
  /** Yükleme / talep tarihi. */
  tarih?: string;
  /** Talebin kimliği: kullanıcının kendi sipariş numarası. */
  siparisNo?: string;
  /** Eski alan adı — geriye dönük uyumluluk için korunur; yeni kayıtlarda yukSahibiFirma kullanılır. */
  tasiyiciFirma?: string;
  /** Yükün ait olduğu / taşındığı firma (müşteri, yük sahibi) — serbest metin. */
  yukSahibiFirma?: string;
  /** Incoterms 2020 teslim şekli kodu (EXW, FOB, CIF, DAP…). */
  incoterm?: string;
  notlar?: string;
  teklifler: TasimaTeklif[];
  secilenTeklifId?: string | null;
  durum: Durum;
  onay?: Onay | null;
  /** Seçilen tekliften sonra firma ile görüşülüp uygulanan indirimli/gerçekleşen fiyat. */
  gerceklesen?: TasimaGerceklesen | null;
  createdAt?: string;
}

/** Taşıma talebinde seçilen tekliften sonra uygulanan indirim/gerçekleşen fiyat kaydı. */
export interface TasimaGerceklesen {
  fiyat: number;
  paraBirimi: ParaBirimi;
  not?: string;
  tarih?: string;
}

export interface Kur {
  USD: number;
  EUR: number;
  /** Motorin (dizel) — Petrol Ofisi Adana, ₺/lt. Manuel girilir. */
  motorin: number;
  /** Brent petrol, $/varil. Manuel girilir. */
  brent: number;
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
  /** Deniz/kara/hava fiyatlarının tek talep altında toplandığı taşıma talepleri. */
  tasimaTalepleri: TasimaTalep[];
  limanTalepleri: LimanTalep[];
  kur: Kur;
  meta: Meta;
}

export type Coord = { lat: number; lng: number };
