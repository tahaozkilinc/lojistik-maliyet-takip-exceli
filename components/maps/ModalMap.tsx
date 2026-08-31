'use client';
import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap, CircleMarker } from 'leaflet';

/**
 * Lokasyon modalındaki küçük seçim haritası. Kontrollü bileşen:
 * lat/lng dışarıdan verilir, haritaya tıklanınca onPick çağrılır.
 */
export function ModalMap({
  lat,
  lng,
  onPick,
  flyToken,
}: {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
  flyToken: number;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<CircleMarker | null>(null);
  const LRef = useRef<typeof import('leaflet') | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  // Başlangıç koordinatı yalnızca ilk kurulumda kullanılır.
  const initial = useRef<{ lat: number | null; lng: number | null }>({ lat, lng });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const el = elRef.current;
      if (!el) return;
      let L: typeof import('leaflet');
      try {
        L = await import('leaflet');
      } catch {
        el.innerHTML = '<div style="padding:20px;font-size:12.5px;color:var(--muted)">Harita için internet gerekir. Koordinat girişi yine de çalışır.</div>';
        return;
      }
      if (cancelled) return;
      LRef.current = L;
      // Koordinat henüz girilmemişse Adana bölgesine (ana fabrika bölgesi) yakın
      // açılır — tüm Türkiye'yi gösteren geniş açı yerine.
      const c = initial.current.lat != null && initial.current.lng != null ? { lat: initial.current.lat, lng: initial.current.lng } : { lat: 37.0, lng: 35.32 };
      const map = L.map(el, { scrollWheelZoom: true }).setView([c.lat, c.lng], initial.current.lat != null ? 12 : 9);
      mapRef.current = map;
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OSM', crossOrigin: '' }).addTo(map);
      if (initial.current.lat != null && initial.current.lng != null) {
        markerRef.current = L.circleMarker([initial.current.lat, initial.current.lng], {
          radius: 9,
          color: '#fff',
          weight: 2,
          fillColor: '#c9a227',
          fillOpacity: 1,
        }).addTo(map);
      }
      map.on('click', (e: { latlng: { lat: number; lng: number } }) => onPickRef.current(e.latlng.lat, e.latlng.lng));
      setTimeout(() => mapRef.current && mapRef.current.invalidateSize(), 120);
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // lat/lng değişince işaretçiyi güncelle.
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    if (lat != null && lng != null && isFinite(lat) && isFinite(lng)) {
      markerRef.current = L.circleMarker([lat, lng], { radius: 9, color: '#fff', weight: 2, fillColor: '#c9a227', fillOpacity: 1 }).addTo(map);
    }
  }, [lat, lng]);

  // "Haritada Göster" ile ortala.
  useEffect(() => {
    if (flyToken > 0 && mapRef.current && lat != null && lng != null && isFinite(lat) && isFinite(lng)) {
      mapRef.current.setView([lat, lng], 13);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyToken]);

  return <div className="lk" id="mapModal" ref={elRef} />;
}
