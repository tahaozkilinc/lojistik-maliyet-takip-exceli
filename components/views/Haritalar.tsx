'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { TIP_RENK, YUK_TIPLERI } from '@/lib/constants';
import { hasCoord } from '@/lib/geo';
import type { Lokasyon } from '@/lib/types';
import { MainMap } from '@/components/maps/MainMap';

function lokTipOf(l: Lokasyon) {
  return l.fabrika ? 'Fabrika' : l.tip || 'Diğer';
}

export function Haritalar() {
  const { db, ui, setUi } = useStore();
  const lcount = (t: string) => db.lokasyonlar.filter((l) => lokTipOf(l) === t && hasCoord(l)).length;
  const order = ['Fabrika', 'Liman', 'Lidaş', 'Depo', 'Antrepo', 'Diğer'];
  const present = [...new Set(db.lokasyonlar.map(lokTipOf))];
  const shown = order.filter((t) => present.includes(t)).concat(present.filter((t) => !order.includes(t)));
  const sq = ui.search.toLowerCase().trim();
  const flist = db.lokasyonlar.filter((l) => {
    if (ui.haritaFilter !== 'all' && lokTipOf(l) !== ui.haritaFilter) return false;
    if (sq && !(l.ad + (l.sehir || '') + (l.il || '') + (l.ilce || '') + lokTipOf(l)).toLowerCase().includes(sq)) return false;
    return true;
  });
  const konumlu = flist.filter(hasCoord).length;

  const chip = (k: string, l: string, renk?: string) => (
    <button
      key={k}
      className={'chip-filter ' + (ui.haritaFilter === k ? 'on' : '')}
      onClick={() => setUi({ haritaFilter: k })}
    >
      {renk ? (
        <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: renk, marginRight: 6, verticalAlign: 0 }} />
      ) : null}
      {l}
      <span className="c">{k === 'all' ? db.lokasyonlar.filter(hasCoord).length : lcount(k)}</span>
    </button>
  );

  const ucount = (u: string) => db.talepler.filter((t) => (t.yukTipi || '').trim() === u).length;
  const urunChip = (k: string, l: string) => (
    <button
      key={k}
      className={'chip-filter ' + (ui.haritaUrun === k ? 'on' : '')}
      onClick={() => setUi({ haritaUrun: k })}
    >
      {l}
      <span className="c">{k === 'all' ? db.talepler.length : ucount(k)}</span>
    </button>
  );

  return (
    <>
      <div className="filter-bar">
        {chip('all', 'Tümü')}
        {shown.map((t) => chip(t, t, TIP_RENK[t] || '#1d4d7e'))}
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 700, margin: '-8px 0 8px' }}>
        Ürüne göre taşıma maliyeti
      </div>
      <div className="filter-bar">
        {urunChip('all', 'Tüm Ürünler')}
        {YUK_TIPLERI.map((u) => urunChip(u, u))}
      </div>
      <div className="map-legend">
        {['Fabrika', 'Liman', 'Lidaş', 'Depo', 'Antrepo', 'Diğer'].map((t) => (
          <div key={t} className="lg">
            <span className="pin-d" style={{ background: TIP_RENK[t] }} /> {t}
          </div>
        ))}
        <div className="lg" style={{ marginLeft: 'auto' }}>
          {konumlu} konum gösteriliyor{ui.haritaFilter !== 'all' ? ' · ' + ui.haritaFilter : ''}
          {ui.haritaUrun !== 'all' ? ' · Ürün: ' + ui.haritaUrun : ''}
        </div>
      </div>
      {ui.haritaUrun !== 'all' && (
        <div style={{ marginTop: -8, marginBottom: 14, color: 'var(--faint)', fontSize: 12.5 }}>
          Soluk renkli lokasyonların bu üründen henüz sefer geçmişi yoktur. Bir lokasyona tıkladığınızda {ui.haritaUrun} için fabrikaya ortalama
          taşıma maliyetini görürsünüz.
        </div>
      )}
      {flist.length - konumlu > 0 && (
        <div
          style={{
            marginBottom: 14,
            fontSize: 13,
            color: 'var(--amber)',
            background: 'var(--amber-bg)',
            border: '1px solid var(--amber)',
            padding: '10px 14px',
            borderRadius: 8,
          }}
        >
          {flist.length - konumlu} lokasyonun harita konumu girilmemiş. Lokasyonlar sekmesinden düzenleyip koordinat ekleyin ya da haritaya
          tıklayın.
        </div>
      )}
      <div className="map-wrap">
        <MainMap />
      </div>
    </>
  );
}
