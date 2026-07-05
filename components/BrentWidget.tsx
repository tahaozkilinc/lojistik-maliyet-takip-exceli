'use client';
import React, { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';

// TradingView'in resmi (ücretsiz, anahtarsız) embed widget'ı — Brent Crude Oil (UKOIL).
// Statik siteden doğrudan bir fiyat API'sine tarayıcı içi istek CORS/anahtar
// gerektirdiğinden mümkün değil; TradingView'in kendi domaininden servis edilen
// bu script, veriyi kendi sunucularından çekip DOM'a basar (üçüncü parti embed).
const BRENT_SYMBOL = 'TVC:UKOIL';
const SCRIPT_SRC = 'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js';

export function BrentWidget() {
  const { theme } = useStore();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML =
      '<div class="tradingview-widget-container__widget"></div>' +
      '<div class="tradingview-widget-copyright">' +
      '<a href="https://www.tradingview.com/symbols/TVC-UKOIL/" rel="noopener nofollow" target="_blank">' +
      '<span class="blue-text">Brent Petrol</span></a>' +
      '<span> · TradingView</span></div>';
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = SCRIPT_SRC;
    script.async = true;
    script.text = JSON.stringify({
      symbol: BRENT_SYMBOL,
      width: '100%',
      locale: 'tr',
      colorTheme: theme,
      isTransparent: true,
    });
    el.appendChild(script);
  }, [theme]);

  return <div className="tradingview-widget-container" ref={ref} style={{ minWidth: 220, maxWidth: 300, flex: '0 0 auto' }} />;
}
