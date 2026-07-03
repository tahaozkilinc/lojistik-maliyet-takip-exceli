import type { Metadata, Viewport } from 'next';
import './globals.css';
import { StoreProvider } from '@/lib/store';

export const metadata: Metadata = {
  title: 'Nakliye Fiyat & Onay Yönetimi',
  description:
    'Lojistik maliyet takibi — nakliye fiyat toplama, karşılaştırma, yönetim onayı, anlaşmalı fiyatlar, deniz navlun ve raporlama.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f2942',
};

// Tema yanıp sönmesini (FOUC) önlemek için boyamadan önce data-theme ayarlanır.
const themeScript = `(function(){try{var t=localStorage.getItem('nfy_theme');if(t==='dark'){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
