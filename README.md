# Nakliye Fiyat & Onay Yönetimi

Lojistik nakliye maliyetlerini yönetmek için geliştirilmiş, **Next.js** tabanlı tek sayfalık uygulama. Tek dosyalık orijinal HTML uygulamasının fonksiyon kaybı olmadan Next.js (App Router) + React + TypeScript mimarisine birebir taşınmış halidir.

> Tüm veriler tarayıcıda (`localStorage`) saklanır — **sunucu veya veritabanı gerektirmez**. Uygulama statik olarak dışa aktarılır (`next build` → `out/`).

## Özellikler

- **Panel** — özet istatistikler, onay bekleyenler ve son talepler.
- **Nakliye Talepleri** — fiyat toplama, çoklu teklif karşılaştırma, en uygun teklifin otomatik işaretlenmesi, toplu onaya gönderme.
- **Onay Merkezi** — fiyat revizesi (canlı toplam hesabı), yönetim onayı/reddi, ıslak imzalı belge arşivi, toplu onay formu yazdırma.
- **Nakliye Firmaları** — firma kartları, iletişim kişileri, hat bazlı teklif performansı, anlaşmalı fiyatlar ve fiyat geçmişi.
- **Lokasyonlar** — yükleme noktaları, fabrikaya ürün bazlı ortalama navlun, koordinat (harita) yönetimi.
- **Haritalar** — tüm lokasyonların OpenStreetMap üzerinde gösterimi (Leaflet).
- **Fiyat Analizi** — güzergah ve firma performansı, döviz kurları.
- **Deniz Navlun** — 20′/40′ konteyner navlunlarının aylık & yıllık takibi, SVG grafik.
- **Yedekleme** — JSON dışa/içe aktarma; anlaşmalı fiyatların Excel (`.xls`) çıktısı.
- **Tema** — açık/koyu mod (tercih `localStorage`'da saklanır).
- **Raporlama** — tekli ve toplu onay formlarının yazdırılması (kaşe & imza alanlı).

## Teknolojiler

- [Next.js 15](https://nextjs.org/) (App Router, statik dışa aktarım)
- React 19 + TypeScript (strict)
- [Leaflet](https://leafletjs.com/) — haritalar
- Harici veritabanı/sunucu bağımlılığı yoktur.

## Geliştirme

```bash
npm install        # bağımlılıkları kur
npm run dev        # geliştirme sunucusu (http://localhost:3000)
npm run build      # üretim derlemesi + statik dışa aktarım (out/)
npm run lint       # ESLint
npm run typecheck  # TypeScript tip kontrolü
```

Statik çıktıyı yerel olarak servis etmek için (`out/` derlendikten sonra):

```bash
npx serve out      # veya: npx http-server out
```

## Proje Yapısı

```
app/                 # Next.js App Router (layout, ana sayfa, global stiller, ikon)
components/          # Arayüz bileşenleri
  views/             #   Sekme görünümleri (Panel, Talepler, Onaylar, ...)
  modals/            #   Modal formları (Talep, Teklif, Onay, Firma, Lokasyon, ...)
  maps/              #   Leaflet harita bileşenleri
  print/             #   Yazdırma raporları
lib/                 # İş mantığı ve veri katmanı
  types.ts           #   Veri modeli (TypeScript)
  store.tsx          #   Merkezi durum + localStorage kalıcılığı
  calc.ts            #   Hesaplamalar (TRY çevrimi, en uygun teklif, istatistikler)
  geo.ts             #   Coğrafi yardımcılar (plus code, haversine, OSRM, geocode)
  seed.ts            #   Tohum verisi, göç (migrate) ve güvenli veri temizleme
  seedData.ts        #   Gömülü başlangıç verisi
  export.ts          #   Excel/JSON dışa aktarma ve güvenli belge önizleme
reference/           # Orijinal tek dosyalık HTML uygulaması (referans)
```

## Güvenlik

Bu sürümde güvenlik açıklarına karşı özel önlemler alınmıştır:

- **XSS**: Arayüz tamamen JSX ile render edilir; React otomatik kaçış yapar. `innerHTML`
  yalnızca sabit (kullanıcı girdisi içermeyen) metinlerde kullanılır. Leaflet popup
  içerikleri açıkça kaçışlanır.
- **Yedek içe aktarma**: Dış JSON, prototip kirlenmesine (`__proto__`/`constructor`/
  `prototype`) karşı temizlenir ve yapı yeniden oluşturulur.
- **Belge önizleme**: Islak imzalı belgeler yalnızca script çalıştıramayan görsel
  biçimleri (PNG/JPG/GIF/WebP/BMP/AVIF) ve PDF olarak kabul edilir; SVG ve
  `data:text/html` gibi içerikler reddedilir. Önizleme, MIME tipi sabitlenmiş bir
  `Blob` üzerinden açılır (`document.write` kullanılmaz).
- **Bağımlılıklar**: `npm audit` ile 0 güvenlik açığı.

## Lisans

Özel/şirket içi kullanım.
