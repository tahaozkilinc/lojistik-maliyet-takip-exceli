import type { MetadataRoute } from 'next';

// Statik dışa aktarım (output: export) manifest rotasının statik olmasını şart koşar.
export const dynamic = 'force-static';

// Telefona "Ana ekrana ekle" ile kurulduğunda kullanılan PWA manifest'i.
// İkon yolları göreli olduğundan GitHub Pages alt yolu (basePath) ile de çalışır.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nakliye Fiyat & Onay Yönetimi',
    short_name: 'Nakliye',
    description: 'Lojistik maliyet takibi — nakliye fiyat toplama, karşılaştırma ve yönetim onayı.',
    start_url: './',
    display: 'standalone',
    background_color: '#0f2942',
    theme_color: '#0f2942',
    icons: [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
