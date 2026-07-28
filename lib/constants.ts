/* ============================================================
   Sabitler — orijinal uygulamadan birebir.
   ============================================================ */
import { SUPABASE_URL } from './supabaseConfig';

export const LS_KEY = 'nakliye_fiyat_yonetim_v1';
export const THEME_KEY = 'nfy_theme';
export const EMBED_FLAG_KEY = 'nfy_embed';
/** Henüz merkezi veritabanına kaydedilmemiş yerel değişiklik var mı (senkronizasyon kaybını önlemek için). */
export const DIRTY_KEY = 'nfy_unsynced';
/**
 * Bu cihazın en son sunucuyla eşleştiği bilinen ortak durum ("base") —
 * üç yönlü birleştirmenin doğru çalışması için sayfa yeniden
 * yüklendiğinde/tarayıcı kapandığında da hayatta kalması gerekir (bkz.
 * lib/store.tsx'teki baseRef ve lib/merge.ts).
 */
export const BASE_KEY = 'nfy_base_v1';

export const PARA: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€' };
export const PARA_KODLARI = ['TRY', 'USD', 'EUR'];

export const BIRIMLER = ['ton', 'palet', 'araç', 'kg', 'm³', 'sefer'];
export const ARAC = [
  'Tır (Tenteli)',
  'Tır (Frigo)',
  'Kamyon',
  'Kırkayak',
  'Lowbed',
  'Konteyner',
  'Silobas',
  'Damperli',
];
export const YUK_TIPLERI = ['Mısır', 'Mısır Özü', 'Ayçekirdeği', 'Soya'];

/** Incoterms 2020 teslim şekilleri. */
export const INCOTERMS: { kod: string; ad: string }[] = [
  { kod: 'EXW', ad: 'EXW — Ex Works (İşyerinde Teslim)' },
  { kod: 'FCA', ad: 'FCA — Free Carrier (Taşıyıcıya Teslim)' },
  { kod: 'FAS', ad: 'FAS — Free Alongside Ship (Gemi Doğrultusunda Teslim)' },
  { kod: 'FOB', ad: 'FOB — Free On Board (Gemide Teslim)' },
  { kod: 'CFR', ad: 'CFR — Cost and Freight (Mal Bedeli ve Navlun)' },
  { kod: 'CIF', ad: 'CIF — Cost, Insurance and Freight (Mal Bedeli, Sigorta ve Navlun)' },
  { kod: 'CPT', ad: 'CPT — Carriage Paid To (Taşıma Ödenmiş)' },
  { kod: 'CIP', ad: 'CIP — Carriage and Insurance Paid To (Taşıma ve Sigorta Ödenmiş)' },
  { kod: 'DAP', ad: 'DAP — Delivered At Place (Belirlenen Yerde Teslim)' },
  { kod: 'DPU', ad: 'DPU — Delivered At Place Unloaded (Boşaltılmış Teslim)' },
  { kod: 'DDP', ad: 'DDP — Delivered Duty Paid (Gümrük Vergisi Ödenmiş Teslim)' },
];

export const TEL_PH = '+90 5XX XXX XX XX';

/**
 * Güvenlik: ıslak imzalı belgeler için izin verilen MIME tipleri. Yalnızca
 * komut çalıştırılamayan (non-scriptable) görsel biçimleri ve PDF kabul edilir.
 * image/svg+xml KASITLI olarak hariç tutulur (SVG gömülü script taşıyabilir ve
 * yeni sekmede açıldığında uygulama kaynağında XSS'e yol açabilir).
 */
export const SAFE_FILE_MIME = /^(image\/(png|jpe?g|gif|webp|bmp|avif)|application\/pdf)$/i;
export const SAFE_FILE_DATA_URL = /^data:(image\/(png|jpe?g|gif|webp|bmp|avif)|application\/pdf)(;base64)?,/i;

/** Firma logoları için: PDF hariç, yalnızca görsel (aynı SVG hariç tutma nedeniyle). */
export const SAFE_IMAGE_MIME = /^image\/(png|jpe?g|gif|webp|bmp|avif)$/i;
export const SAFE_IMAGE_DATA_URL = /^data:image\/(png|jpe?g|gif|webp|bmp|avif)(;base64)?,/i;
export const LOGO_MAX_BYTES = 800 * 1024;

/**
 * Dosya ekleri (logo, imzalı belgeler) artık app_db satırının İÇİNE
 * gömülmez; Supabase Storage'a yüklenir (bkz. lib/storage.ts ve
 * supabase/migrations/0009_dosya_deposu.sql) — büyüyen tek satırın yol
 * açtığı yavaş açılış/kaydetme zaman aşımlarını kökten gidermek içindir.
 * Eski (bu değişiklikten önce yüklenmiş) kayıtlar hâlâ yukarıdaki data:
 * URL biçimindedir ve öyle çalışmaya devam eder — yalnızca YENİ yüklemeler
 * aşağıdaki biçimleri kullanır.
 */
export const BELGELER_BUCKET = 'belgeler';
export const LOGOLAR_BUCKET = 'logolar';
/** "storage:<dosya-adı>" işaretleyicisi — yalnızca kendi ürettiğimiz kesin kalıba uyan değerler kabul edilir. */
export const STORAGE_BELGE_REF = /^storage:[a-z0-9_]+\.[a-z0-9]{1,10}$/;
/** Herkese açık logo deposundaki bir dosyanın tam URL'i — yalnızca KENDİ projemizin logolar deposuna işaret edenler kabul edilir. */
export const STORAGE_LOGO_URL_RE = new RegExp(
  '^' + SUPABASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/storage/v1/object/public/logolar/[a-z0-9_]+\\.[a-z0-9]{1,10}$',
);

export const AYLAR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];
export const AYLAR_K = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
];

export const TIP_RENK: Record<string, string> = {
  Fabrika: '#c9a227',
  Liman: '#2563eb',
  Lidaş: '#16a34a',
  Depo: '#ea580c',
  Antrepo: '#0891b2',
  Diğer: '#64748b',
};

export const LOK_TIP = ['Depo', 'Lidaş', 'Antrepo', 'Fabrika', 'Liman', 'Diğer'];
export const LIMAN_MASRAF_TIPLERI = ['THC', 'Liman Ücreti', 'Ardiye', 'Depolama', 'Elleçleme', 'İşçilik', 'Acente', 'Gümrük', 'Sigorta', 'Diğer'];
export const KONTEYNER_TIPLERI = ["20'", "40'", "40' HC", 'Dökme Yük'];

export type ViewKey =
  | 'dashboard'
  | 'talepler'
  | 'detail'
  | 'onaylar'
  | 'firmalar'
  | 'firmaDetay'
  | 'lokasyonlar'
  | 'lokasyonDetay'
  | 'limanTalepleri'
  | 'limanTalepDetay'
  | 'haritalar'
  | 'analiz'
  | 'navlunPanel'
  | 'denizNavlun'
  | 'karaNavlun'
  | 'navlunFirmalar'
  | 'navlunFirmaDetay'
  | 'tasimaTalepleri'
  | 'tasimaTalepDetay'
  | 'kullaniciRolleri'
  | 'yedekGecmisi';

export const TITLES: Record<string, [string, string]> = {
  dashboard: ['Panel', 'Genel bakış ve özet'],
  talepler: ['Nakliye Talepleri', 'Fiyat toplama ve karşılaştırma'],
  onaylar: ['Onay Merkezi', 'Yönetim onayı ve ıslak imza arşivi'],
  firmalar: ['Nakliye Firmaları', 'Firma kartları ve iletişim'],
  firmaDetay: ['Firma Detayı', 'Anlaşmalı fiyatlar ve geçmiş'],
  lokasyonlar: ['Lokasyonlar', 'Yükleme noktaları ve fabrikaya ortalama navlun'],
  lokasyonDetay: ['Lokasyon Detayı', 'Geçmiş teklifler ve fiyat geçmişi'],
  limanTalepleri: ['Liman ve Depo Masrafı', 'Liman ve depo operasyonları, masraf takibi'],
  limanTalepDetay: ['Liman / Depo Masraf Detayı', ''],
  haritalar: ['Haritalar', 'Tüm lokasyonlar harita üzerinde'],
  analiz: ['Fiyat Analizi', 'Güzergah ve firma performansı'],
  navlunPanel: ['Navlun Paneli', 'Navlun fiyat analizi'],
  denizNavlun: ['Deniz Navlun Takibi', "20′ ve 40′ konteyner navlunları — aylık & yıllık"],
  karaNavlun: ['Kara Navlun Takibi', 'Kara nakliyesi fiyat karşılaştırması — aylık & yıllık'],
  navlunFirmalar: ['Navlun Firmaları', 'Deniz/kara navlun tekliflerinde kullanılan firmalar'],
  navlunFirmaDetay: ['Navlun Firması Detayı', 'Verilen teklifler ve geçmiş'],
  tasimaTalepleri: ['Taşıma Talepleri', 'Deniz · Kara · Hava fiyat toplama ve karşılaştırma'],
  tasimaTalepDetay: ['Taşıma Talebi Detayı', ''],
  detail: ['Talep Detayı', ''],
  kullaniciRolleri: ['Kullanıcı Rolleri', 'Admin · Yönetici · Görüntüleyici yetkilerini yönetin'],
  yedekGecmisi: ['Yedek Geçmişi', 'Otomatik kurtarma noktaları — sorun olursa geri dönün'],
};

/** Rol etiketleri (Türkçe görünen ad) ve açıklamaları — Kullanıcı Rolleri ekranı ve Profil içindir. */
export const ROL_ETIKET: Record<string, string> = {
  admin: 'Admin',
  yonetici: 'Yönetici',
  goruntuleyici: 'Görüntüleyici',
};
export const ROL_ACIKLAMA: Record<string, string> = {
  admin: 'Tüm yetkiler + kullanıcı rollerini yönetir',
  yonetici: 'Talep, teklif, onay, fiyat — tüm operasyonel işlemler',
  goruntuleyici: 'Yalnızca görüntüler; hiçbir kayıt ekleyemez/değiştiremez',
};
