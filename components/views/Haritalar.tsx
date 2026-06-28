'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { TIP_RENK } from '@/lib/constants';
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
  const flist = db.lokasyonlar.filter((l) => ui.haritaFilter === 'all' || lokTipOf(l) === ui.haritaFilter);
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

  return (
    <>
      <div className="filter-bar">
        {chip('all', 'Tümü')}
        {shown.map((t) => chip(t, t, TIP_RENK[t] || '#1d4d7e'))}
      </div>
      <div className="map-legend">
        {['Fabrika', 'Liman', 'Lidaş', 'Depo', 'Antrepo', 'Diğer'].map((t) => (
          <div key={t} className="lg">
            <span className="pin-d" style={{ background: TIP_RENK[t] }} /> {t}
          </div>
        ))}
        <div className="lg" style={{ marginLeft: 'auto' }}>
          {konumlu} konum gösteriliyor{ui.haritaFilter !== 'all' ? ' · ' + ui.haritaFilter : ''}
        </div>
      </div>
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
