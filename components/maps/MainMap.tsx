'use client';
import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap } from 'leaflet';
import { useStore } from '@/lib/store';
import { hasCoord } from '@/lib/geo';
import { lokasyonStats } from '@/lib/calc';
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
  const [failed, setFailed] = useState(false);

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
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      const map = L.map(el, { scrollWheelZoom: true }).setView([39.0, 35.2], 5);
      mapRef.current = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      }).addTo(map);
      const pts: [number, number][] = [];
      const fabrikaId = db.lokasyonlar.find((l) => l.fabrika)?.id;
      db.lokasyonlar
        .filter((l) => hasCoord(l) && (ui.haritaFilter === 'all' || lokTipOf(l) === ui.haritaFilter))
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
                return st.fiyatli ? `<br><b>Fabrikaya ort:</b> ${money(st.avg, 'TRY')} · ${st.sefer} sefer` : '';
              })();
          m.bindPopup(
            `<b>${escapeHtml(l.ad)}</b>${l.fabrika ? ' ★' : ''}<br>${escapeHtml(
              [l.ilce, l.il].filter(Boolean).join(' / ') || l.sehir || '',
            )}${l.tip ? ' · ' + escapeHtml(l.tip) : ''}${s}`,
          );
          pts.push([l.lat as number, l.lng as number]);
        });
      if (pts.length) map.fitBounds(pts, { padding: [50, 50], maxZoom: 12 });
      setTimeout(() => mapRef.current && mapRef.current.invalidateSize(), 120);
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.lokasyonlar, db.talepler, ui.haritaFilter]);

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
