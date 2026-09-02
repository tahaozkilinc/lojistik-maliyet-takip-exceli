'use client';
import React, { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { escapeHtml } from '@/lib/format';

// TradingView'in resmi (ücretsiz, anahtarsız) tek-sembol fiyat widget'ı.
// Veri TradingView'in kendi sunucularından canlı çekilir (üçüncü parti embed);
// statik siteden doğrudan borsa API'sine erişim CORS/anahtar gerektirdiğinden
// bu resmi embed kullanılır. Tema değişince widget yeniden kurulur.
const SCRIPT_SRC = 'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js';

export function TvQuote({ symbol, href, label }: { symbol: string; href: string; label: string }) {
  const { theme } = useStore();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Güvenlik: href/label şu an her zaman sabit (hardcoded) değerlerle
    // çağrılıyor, ama innerHTML'e gömülmeden önce yine de kaçışlanır
    // (XSS) ve href yalnızca http(s) şemasına izin verir (javascript:
    // gibi tehlikeli şemaları engeller) — ileride bu prop'lar dinamik bir
    // kaynaktan (DB, URL parametresi) beslenirse güvenlik açığı oluşmasın.
    const safeHref = /^https?:\/\//i.test(href) ? href : '#';
    el.innerHTML =
      '<div class="tradingview-widget-container__widget"></div>' +
      '<div class="tradingview-widget-copyright" style="font-size:11px">' +
      `<a href="${escapeHtml(safeHref)}" rel="noopener nofollow" target="_blank">` +
      `<span class="blue-text">${escapeHtml(label)}</span></a>` +
      '<span> · TradingView</span></div>';
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = SCRIPT_SRC;
    script.async = true;
    script.text = JSON.stringify({
      symbol,
      width: '100%',
      locale: 'tr',
      colorTheme: theme,
      isTransparent: true,
    });
    el.appendChild(script);
  }, [theme, symbol, href, label]);

  return <div className="tradingview-widget-container" ref={ref} style={{ minWidth: 220, flex: '1 1 240px', maxWidth: 340 }} />;
}
