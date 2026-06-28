/* ============================================================
   Sabitler — orijinal uygulamadan birebir.
   ============================================================ */

export const LS_KEY = 'nakliye_fiyat_yonetim_v1';
export const THEME_KEY = 'nfy_theme';
export const EMBED_FLAG_KEY = 'nfy_embed';

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

export const TEL_PH = '+90 5XX XXX XX XX';

/**
 * Güvenlik: ıslak imzalı belgeler için izin verilen MIME tipleri. Yalnızca
 * komut çalıştırılamayan (non-scriptable) görsel biçimleri ve PDF kabul edilir.
 * image/svg+xml KASITLI olarak hariç tutulur (SVG gömülü script taşıyabilir ve
 * yeni sekmede açıldığında uygulama kaynağında XSS'e yol açabilir).
 */
export const SAFE_FILE_MIME = /^(image\/(png|jpe?g|gif|webp|bmp|avif)|application\/pdf)$/i;
export const SAFE_FILE_DATA_URL = /^data:(image\/(png|jpe?g|gif|webp|bmp|avif)|application\/pdf)(;base64)?,/i;

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

export type ViewKey =
  | 'dashboard'
  | 'talepler'
  | 'detail'
  | 'onaylar'
  | 'firmalar'
  | 'firmaDetay'
  | 'lokasyonlar'
  | 'haritalar'
  | 'analiz'
  | 'denizNavlun';

export const TITLES: Record<string, [string, string]> = {
  dashboard: ['Panel', 'Genel bakış ve özet'],
  talepler: ['Nakliye Talepleri', 'Fiyat toplama ve karşılaştırma'],
  onaylar: ['Onay Merkezi', 'Yönetim onayı ve ıslak imza arşivi'],
  firmalar: ['Nakliye Firmaları', 'Firma kartları ve iletişim'],
  firmaDetay: ['Firma Detayı', 'Anlaşmalı fiyatlar ve geçmiş'],
  lokasyonlar: ['Lokasyonlar', 'Yükleme noktaları ve fabrikaya ortalama navlun'],
  haritalar: ['Haritalar', 'Tüm lokasyonlar harita üzerinde'],
  analiz: ['Fiyat Analizi', 'Güzergah ve firma performansı'],
  denizNavlun: ['Deniz Navlun Takibi', "20′ ve 40′ konteyner navlunları — aylık & yıllık"],
  detail: ['Talep Detayı', ''],
};
