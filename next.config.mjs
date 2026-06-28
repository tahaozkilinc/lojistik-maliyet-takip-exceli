/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Bu uygulama tamamen istemci tarafında (localStorage) çalışır; statik dışa
  // aktarım sayesinde herhangi bir sunucu/veritabanı gerektirmez.
  output: 'export',
  images: { unoptimized: true },
  eslint: {
    // Üretim derlemesi lint hatalarında durmasın; lint ayrıca CI'da çalıştırılır.
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
