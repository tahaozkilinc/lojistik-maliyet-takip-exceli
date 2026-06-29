/** @type {import('next').NextConfig} */

// GitHub Pages proje sitesi alt yolda (örn. /lojistik-maliyet-takip-exceli)
// servis edildiğinden, varlık (asset) yolları için basePath verilir. Bu değer
// CI'da actions/configure-pages çıktısından (PAGES_BASE_PATH) gelir; yerel
// geliştirmede boştur.
const basePath = process.env.PAGES_BASE_PATH || '';

const nextConfig = {
  reactStrictMode: true,
  // Bu uygulama tamamen istemci tarafında (localStorage) çalışır; statik dışa
  // aktarım sayesinde herhangi bir sunucu/veritabanı gerektirmez.
  output: 'export',
  images: { unoptimized: true },
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  eslint: {
    // Üretim derlemesi lint hatalarında dursun; lint ayrıca CI'da çalıştırılır.
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
