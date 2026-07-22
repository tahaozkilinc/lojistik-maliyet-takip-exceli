'use client';
import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap, TileLayer } from 'leaflet';
import { useStore } from '@/lib/store';
import { hasCoord } from '@/lib/geo';
import { lokasyonStats, limanMasrafStats } from '@/lib/calc';
import { money, escapeHtml } from '@/lib/format';
import { TIP_RENK } from '@/lib/constants';
import type { Lokasyon } from '@/lib/types';

function lokRenk(l: Lokasyon) {
  return l.fabrika ? '#c9a227' : TIP_RENK[l.tip || ''] || '#1d4d7e';
}
function lokTipOf(l: Lokasyon) {
  return l.fabrika ? 'Fabrika' : l.tip || 'Diğer';
}

export function MainMap() {
  const { db, ui } = useStore();
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const LRef = useRef<typeof import('leaflet') | null>(null);
  const tileLayerRef = useRef<TileLayer | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Leaflet'i yükle ve tile layer'ı bir kez kur; bileşen unmount olduğunda temizle.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const el = elRef.current;
      if (!el) return;
      let L: typeof import('leaflet');
      try {
        L = await import('leaflet');
      } catch {
        if (!cancelled) setFailed(true);
        return;
      }
      if (cancelled) return;
      LRef.current = L;
      const map = L.map(el, { scrollWheelZoom: true }).setView([39.0, 35.2], 5);
      mapRef.current = map;
      tileLayerRef.current = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
        crossOrigin: '',
      }).addTo(map);
      setTimeout(() => mapRef.current && mapRef.current.invalidateSize(), 120);
      if (!cancelled) setMapReady(true);
    })();
    return () => {
      cancelled = true;
      setMapReady(false);
      tileLayerRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Veri, chip filtresi veya arama değişince sadece pin'leri güncelle; tile layer dokunulmaz.
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    const tileLayer = tileLayerRef.current;
    if (!L || !map || !mapReady) return;

    // Tile layer dışındaki tüm layer'ları kaldır.
    map.eachLayer((layer) => {
      if (layer !== tileLayer) map.removeLayer(layer);
    });

    const pts: [number, number][] = [];
    const fabrikaId = db.lokasyonlar.find((l) => l.fabrika)?.id;
    const sq = ui.search.toLowerCase().trim();

    db.lokasyonlar
      .filter((l) => hasCoord(l) && (ui.haritaFilter === 'all' || lokTipOf(l) === ui.haritaFilter))
      .filter((l) => !sq || (l.ad + (l.sehir || '') + (l.il || '') + (l.ilce || '') + lokTipOf(l)).toLowerCase().includes(sq))
      .forEach((l) => {
        const m = L.circleMarker([l.lat as number, l.lng as number], {
          radius: 9,
          color: '#fff',
          weight: 2,
          fillColor: lokRenk(l),
          fillOpacity: 1,
        }).addTo(map);
        const s = l.fabrika
          ? ''
          : (() => {
              const st = lokasyonStats(db, l.id, fabrikaId);
              if (!st.fiyatli) return '';
              const usd = db.kur.USD ? st.avg / db.kur.USD : null;
              const tutar = usd != null ? money(usd, 'USD') : money(st.avg, 'TRY');
              return `<br><b>Fabrikaya ort:</b> ${tutar}${usd != null ? ` <span style="color:#8a98a8">(${money(st.avg, 'TRY')})</span>` : ''} · ${st.sefer} sefer`;
            })();
        const extra = (() => {
          if (l.tip === 'Liman') {
            const lm = limanMasrafStats(db, l.id);
            if (!lm.seferSayisi) return '';
            return `<br><b>Liman masrafı:</b> ${money(lm.toplamTRY, 'TRY')} toplam · ${lm.seferSayisi} kayıt`;
          }
          if (l.tip === 'Depo' && l.depolamaMaliyeti) {
            const dm = l.depolamaMaliyeti;
            return `<br><b>Depolama:</b> ${money(dm.fiyat, dm.paraBirimi)}${dm.birim ? ' / ' + escapeHtml(dm.birim) : ''}`;
          }
          return '';
        })();
        m.bindPopup(
          `<b>${escapeHtml(l.ad)}</b>${l.fabrika ? ' ★' : ''}<br>${escapeHtml(
            [l.ilce, l.il].filter(Boolean).join(' / ') || l.sehir || '',
          )}${l.tip ? ' · ' + escapeHtml(l.tip) : ''}${s}${extra}`,
        );
        pts.push([l.lat as number, l.lng as number]);
      });
    if (pts.length) map.fitBounds(pts, { padding: [50, 50], maxZoom: 12 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, db.lokasyonlar, db.talepler, db.limanTalepleri, ui.haritaFilter, ui.search]);

  if (failed) {
    return (
      <div className="empty" style={{ padding: 60 }}>
        <h3>Harita yüklenemedi</h3>
        <p>Harita için internet bağlantısı gerekir (OpenStreetMap). Bağlantıyı kontrol edip sayfayı yenileyin.</p>
      </div>
    );
  }
  return <div id="mapMain" ref={elRef} />;
}
