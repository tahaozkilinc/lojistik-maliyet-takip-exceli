'use client';
import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap, TileLayer } from 'leaflet';
import { useStore } from '@/lib/store';
import { hasCoord } from '@/lib/geo';
import { lokasyonStats, limanMasrafStats, findAnlasmalar, toTRY } from '@/lib/calc';
import type { AnlasmaMatch } from '@/lib/calc';
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
      // Başlangıç görünümü Adana bölgesine (ana fabrika bölgesi) odaklıdır — tüm
      // Türkiye'yi gösteren geniş açı yerine yakın bir bölgesel görünümle açılır.
      // minZoom, konumları sığdırma (fitBounds) uzak lokasyonlar yüzünden haritayı
      // tekrar çok geniş açıya götürmesin diye bir taban belirler.
      const map = L.map(el, { scrollWheelZoom: true, minZoom: 7 }).setView([37.0, 35.32], 9);
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
    const urun = ui.haritaUrun !== 'all' ? ui.haritaUrun : undefined;

    db.lokasyonlar
      .filter((l) => hasCoord(l) && (ui.haritaFilter === 'all' || lokTipOf(l) === ui.haritaFilter))
      .filter((l) => !sq || (l.ad + (l.sehir || '') + (l.il || '') + (l.ilce || '') + lokTipOf(l)).toLowerCase().includes(sq))
      .forEach((l) => {
        // Ürün filtresi aktifken bu lokasyondan seçili üründen hiç sefer yoksa
        // pin soluklaştırılır — konum yine görünür kalır (kaybolmaz), ama
        // fiyatı olan lokasyonlar öne çıkar. Sefer geçmişi yoksa, gerçekleşen
        // fiyat yerine bu hat için anlaşmalı (sözleşmeli) fiyat varsa o gösterilir.
        const st = !l.fabrika ? lokasyonStats(db, l.id, fabrikaId, urun) : null;
        const seferYok = !!urun && !!st && !st.fiyatli;
        const anlMatches: AnlasmaMatch[] = seferYok && fabrikaId ? findAnlasmalar(db, l.id, fabrikaId, urun) : [];
        const enUcuzAnl = anlMatches.length
          ? anlMatches.reduce((best, cur) =>
              toTRY(db, cur.anlasma.birimFiyat, cur.anlasma.paraBirimi) < toTRY(db, best.anlasma.birimFiyat, best.anlasma.paraBirimi) ? cur : best,
            )
          : null;
        const noData = seferYok && !enUcuzAnl;
        const m = L.circleMarker([l.lat as number, l.lng as number], {
          radius: noData ? 7 : 9,
          color: enUcuzAnl ? '#b9821a' : '#fff',
          weight: noData ? 1 : enUcuzAnl ? 3 : 2,
          fillColor: noData ? '#aab3bd' : lokRenk(l),
          fillOpacity: noData ? 0.45 : 1,
        }).addTo(map);
        const s = l.fabrika
          ? ''
          : (() => {
              if (!st || !st.fiyatli) {
                if (!urun) return '';
                if (enUcuzAnl) {
                  const firmaTxt = escapeHtml(enUcuzAnl.firma.ad) + (anlMatches.length > 1 ? ` +${anlMatches.length - 1} firma` : '');
                  return (
                    `<br><b>${escapeHtml(urun)} · Anlaşmalı fiyat:</b> ${money(enUcuzAnl.anlasma.birimFiyat, enUcuzAnl.anlasma.paraBirimi)}` +
                    ` <span style="color:#8a98a8">(${firmaTxt})</span>` +
                    `<br><span style="color:#b9821a;font-size:11px">Henüz sefer yapılmadı — anlaşmalı fiyat gösteriliyor</span>`
                  );
                }
                return `<br><span style="color:#8a98a8">${escapeHtml(urun)}: sefer ya da anlaşmalı fiyat kaydı yok</span>`;
              }
              const usd = db.kur.USD ? st.avg / db.kur.USD : null;
              const tutar = usd != null ? money(usd, 'USD') : money(st.avg, 'TRY');
              const label = urun ? `${escapeHtml(urun)} · Fabrikaya ort` : 'Fabrikaya ort';
              return `<br><b>${label}:</b> ${tutar}${usd != null ? ` <span style="color:#8a98a8">(${money(st.avg, 'TRY')})</span>` : ''} · ${st.sefer} sefer`;
            })();
        const extra = (() => {
          if (l.tip !== 'Liman' && l.tip !== 'Depo') return '';
          let out = '';
          if (l.tip === 'Depo' && l.depolamaMaliyeti) {
            const dm = l.depolamaMaliyeti;
            out += `<br><b>Depolama:</b> ${money(dm.fiyat, dm.paraBirimi)}${dm.birim ? ' / ' + escapeHtml(dm.birim) : ''}`;
          }
          const lm = limanMasrafStats(db, l.id);
          if (lm.seferSayisi) {
            out += `<br><b>Liman/depo masrafı:</b> ${money(lm.toplamTRY, 'TRY')} toplam · ${lm.seferSayisi} kayıt`;
          }
          return out;
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
  }, [mapReady, db.lokasyonlar, db.talepler, db.limanTalepleri, db.firmalar, ui.haritaFilter, ui.haritaUrun, ui.search]);

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
