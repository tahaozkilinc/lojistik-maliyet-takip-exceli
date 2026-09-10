'use client';
import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap } from 'leaflet';
import { useStore } from '@/lib/store';
import { hasCoord } from '@/lib/geo';
import { efektifTotalTRY } from '@/lib/calc';
import { money, escapeHtml } from '@/lib/format';
import type { Talep } from '@/lib/types';

interface LocAgg {
  ad: string;
  lat: number;
  lng: number;
  sefer: number;
  toplamTRY: number;
}

/**
 * Fiyat Analizi → PDF Rapor sekmesindeki EKRAN ÖNİZLEMESİ için salt-okunur,
 * basit bir harita. Ana harita (MainMap) gibi kalıcı filtre/arama durumu
 * yoktur — yalnızca o an hesaplanmış rapor satırlarındaki yükleme
 * lokasyonlarını gösterir. Canlı harita, yazdırılan/PDF çıktısında GÜVENİLİR
 * biçimde görünemeyeceğinden (tile'lar ağdan asenkron yüklenir, window.print
 * mount'tan 150ms sonra tetiklenir — bkz. PrintHost) yazdırılan raporda yer
 * almaz; bu bileşen yalnızca ekranda gösterilir.
 */
export function ReportMap({ rows }: { rows: Talep[] }) {
  const { db } = useStore();
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [failed, setFailed] = useState(false);

  const aggs: LocAgg[] = [];
  {
    const byId = new Map<string, LocAgg>();
    rows.forEach((t) => {
      const l = db.lokasyonlar.find((x) => x.id === t.yuklemeLokasyonId);
      if (!l || !hasCoord(l)) return;
      let a = byId.get(l.id);
      if (!a) {
        a = { ad: l.ad, lat: l.lat, lng: l.lng, sefer: 0, toplamTRY: 0 };
        byId.set(l.id, a);
      }
      a.sefer++;
      a.toplamTRY += efektifTotalTRY(db, t);
    });
    aggs.push(...byId.values());
  }

  useEffect(() => {
    const el = elRef.current;
    if (!el || !aggs.length) return;
    let cancelled = false;
    let map: LeafletMap | null = null;
    (async () => {
      let L: typeof import('leaflet');
      try {
        L = await import('leaflet');
      } catch {
        if (!cancelled) setFailed(true);
        return;
      }
      if (cancelled) return;
      map = L.map(el, { scrollWheelZoom: true });
      mapRef.current = map;
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
        crossOrigin: '',
      }).addTo(map);

      const pts: [number, number][] = [];
      aggs.forEach((a) => {
        const marker = L.circleMarker([a.lat, a.lng], {
          radius: 9,
          color: '#fff',
          weight: 2,
          fillColor: '#c9a227',
          fillOpacity: 1,
        }).addTo(map as LeafletMap);
        marker.bindPopup(`<b>${escapeHtml(a.ad)}</b><br>${a.sefer} sefer · <b>${money(a.toplamTRY, 'TRY')}</b> toplam`);
        pts.push([a.lat, a.lng]);
      });
      map.fitBounds(pts, { padding: [40, 40], maxZoom: 11 });
      setTimeout(() => mapRef.current && mapRef.current.invalidateSize(), 120);
    })();
    return () => {
      cancelled = true;
      if (map) map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, db.lokasyonlar]);

  if (failed) {
    return (
      <div className="empty" style={{ padding: 40 }}>
        <p>Harita yüklenemedi — internet bağlantısını kontrol edin.</p>
      </div>
    );
  }
  if (!aggs.length) {
    return (
      <div className="empty" style={{ padding: 40 }}>
        <p>Seçili tarih aralığında konumu bilinen yükleme lokasyonu bulunamadı.</p>
      </div>
    );
  }
  return <div style={{ height: 380, borderRadius: 10, overflow: 'hidden' }} ref={elRef} />;
}
