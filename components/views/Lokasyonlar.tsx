'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { money } from '@/lib/format';
import { lokasyonStatsByProduct } from '@/lib/calc';
import { hasCoord } from '@/lib/geo';
import { TIP_RENK } from '@/lib/constants';
import type { Lokasyon } from '@/lib/types';
import { Icon } from '@/components/Icon';

function lokRenk(l: Lokasyon) {
  return l.fabrika ? '#c9a227' : TIP_RENK[l.tip || ''] || '#1d4d7e';
}
function lokTipOf(l: Lokasyon) {
  return l.fabrika ? 'Fabrika' : l.tip || 'Diğer';
}

export function Lokasyonlar() {
  const { db, ui, setUi, go, openModal } = useStore();

  function goLokasyon(id: string) {
    setUi({ lokasyonId: id });
    go('lokasyonDetay');
  }
  const q = ui.search.toLowerCase().trim();

  if (!db.lokasyonlar.length) {
    return (
      <div className="empty">
        <Icon name="mappin" size={46} sw={1.5} />
        <h3>Lokasyon kaydı yok</h3>
        <p>
          Yükleme noktalarınızı (depo, lidaş, antrepo, liman…) buraya girin. Talep oluştururken yükleme noktasını bu listeden seçeceksiniz; her
          lokasyonun fabrikaya ortalama navlunu burada birikir.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button className="btn primary" onClick={() => openModal({ type: 'lokasyon' })}>
            + İlk Lokasyonu Ekle
          </button>
          <button className="btn" onClick={() => openModal({ type: 'lokasyonToplu' })}>
            Excel&apos;den Toplu Ekle
          </button>
        </div>
      </div>
    );
  }

  const lcount = (t: string) => db.lokasyonlar.filter((l) => lokTipOf(l) === t).length;
  const order = ['Fabrika', 'Liman', 'Lidaş', 'Depo', 'Antrepo', 'Diğer'];
  const present = [...new Set(db.lokasyonlar.map(lokTipOf))];
  const shown = order.filter((t) => present.includes(t)).concat(present.filter((t) => !order.includes(t)));

  let list = [...db.lokasyonlar].sort((a, b) => (b.fabrika ? 1 : 0) - (a.fabrika ? 1 : 0) || a.ad.localeCompare(b.ad, 'tr'));
  // Arama varsa chip filtresini yoksay — tüm tiplerde ara.
  if (q) {
    list = list.filter((l) =>
      (l.ad + (l.sehir || '') + (l.il || '') + (l.ilce || '') + lokTipOf(l) + (l.iletisim || '') + (l.adres || '')).toLowerCase().includes(q),
    );
  } else if (ui.lokFilter !== 'all') {
    list = list.filter((l) => lokTipOf(l) === ui.lokFilter);
  }

  const filterBar = (
    <div className="filter-bar">
      <Chip k="all" l="Tümü" active={ui.lokFilter === 'all'} count={db.lokasyonlar.length} onClick={() => setUi({ lokFilter: 'all' })} />
      {shown.map((t) => (
        <Chip key={t} k={t} l={t} renk={TIP_RENK[t] || '#1d4d7e'} active={ui.lokFilter === t} count={lcount(t)} onClick={() => setUi({ lokFilter: t })} />
      ))}
    </div>
  );

  if (!list.length) {
    return (
      <>
        {filterBar}
        <div className="empty" style={{ padding: 40 }}>
          <h3>Bu filtrede lokasyon yok</h3>
          <p>Farklı bir tip seçin ya da filtreyi &quot;Tümü&quot; yapın.</p>
        </div>
      </>
    );
  }

  return (
    <>
      {filterBar}
      <div className="firm-grid">
        {list.map((l) => {
          const byP = lokasyonStatsByProduct(db, l.id);
          const renk = lokRenk(l);
          return (
            <div key={l.id} className="firm-card" style={{ borderTop: `3px solid ${renk}`, cursor: 'pointer' }} onClick={() => goLokasyon(l.id)}>
              <div className="fc-head" style={l.fabrika ? { background: 'linear-gradient(135deg,var(--gold),var(--gold-2))' } : undefined}>
                <div
                  className="fc-avatar"
                  style={
                    l.fabrika
                      ? { color: 'var(--navy)', background: 'rgba(15,41,66,.15)', borderColor: 'rgba(15,41,66,.25)' }
                      : { background: renk + '1f', borderColor: renk + '55', color: renk }
                  }
                >
                  <Icon name="mappin" size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="fc-name" style={l.fabrika ? { color: 'var(--navy)' } : undefined}>
                    {l.ad}
                  </div>
                  <div className="fc-meta" style={l.fabrika ? { color: 'var(--navy)', opacity: 0.7 } : undefined}>
                    {[l.ilce, l.il].filter(Boolean).join(' / ') || l.sehir || ''}
                    {l.tip && !l.fabrika ? (
                      <span style={{ display: 'inline-block', background: renk, color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 10, marginLeft: 7 }}>
                        {l.tip}
                      </span>
                    ) : null}
                    {l.fabrika ? ' · Varsayılan teslim' : ''}
                  </div>
                </div>
                <button
                  className="btn sm ghost"
                  style={{ color: l.fabrika ? 'var(--navy)' : '#cfe0f0' }}
                  onClick={(e) => { e.stopPropagation(); openModal({ type: 'lokasyon', id: l.id }); }}
                >
                  ✎
                </button>
              </div>
              <div className="fc-body">
                {hasCoord(l) ? (
                  <div className="fc-line">
                    <Icon name="mappin" size={15} />
                    <span style={{ color: 'var(--green)', fontWeight: 600 }}>Haritada işaretli</span>{' '}
                    <span style={{ color: 'var(--faint)', fontSize: 11.5 }}>
                      ({l.lat!.toFixed(4)}, {l.lng!.toFixed(4)})
                    </span>
                  </div>
                ) : (
                  <div className="fc-line">
                    <Icon name="warning" size={15} />
                    <span style={{ color: 'var(--amber)' }}>Konum girilmemiş</span>
                  </div>
                )}
                {l.adres && (
                  <div className="fc-line">
                    <Icon name="mappin" size={15} />
                    {l.adres}
                  </div>
                )}
                {l.iletisim && (
                  <div className="fc-line">
                    <Icon name="user" size={15} />
                    {l.iletisim}
                  </div>
                )}
                {l.telefon && (
                  <div className="fc-line">
                    <Icon name="phone" size={15} />
                    {l.telefon}
                  </div>
                )}
                {l.email && (
                  <div className="fc-line">
                    <Icon name="mail" size={15} />
                    <a href={'mailto:' + l.email}>{l.email}</a>
                  </div>
                )}
                {l.notlar && <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--muted)', fontStyle: 'italic' }}>{l.notlar}</div>}
              </div>
              <div className="fc-foot" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0, padding: 0 }}>
                {l.fabrika ? (
                  <div style={{ padding: '12px 18px' }}>
                    <span style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 800 }}>★ Fabrika</span>
                    <div className="lbl" style={{ fontSize: 10.5, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 2 }}>
                      Buraya teslim edilir
                    </div>
                  </div>
                ) : byP.length ? (
                  <>
                    <div style={{ padding: '9px 18px 5px', fontSize: 10.5, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.4px', fontWeight: 700 }}>
                      Fabrikaya Ort. Navlun · Ürün Bazlı
                    </div>
                    {byP.map((p) => (
                      <div key={p.urun} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 18px', borderTop: '1px solid var(--line-2)' }}>
                        <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{p.urun}</span>
                        <span style={{ fontWeight: 800, color: 'var(--green)' }}>
                          {p.fiyatli ? (
                            <>
                              {money(p.avg, 'TRY')}
                              <span style={{ color: 'var(--faint)', fontWeight: 500, fontSize: 11 }}>/ton</span>
                            </>
                          ) : (
                            '—'
                          )}
                        </span>
                        <span className="tag" style={{ marginLeft: 2 }}>
                          {p.sefer} sefer
                        </span>
                      </div>
                    ))}
                  </>
                ) : (
                  <div style={{ padding: '13px 18px', color: 'var(--faint)', fontSize: 12.5 }}>Henüz bu lokasyondan sefer yapılmamış</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Chip({
  k,
  l,
  renk,
  active,
  count,
  onClick,
}: {
  k: string;
  l: string;
  renk?: string;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button className={'chip-filter ' + (active ? 'on' : '')} onClick={onClick} data-k={k}>
      {renk ? (
        <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: renk, marginRight: 6, verticalAlign: 0 }} />
      ) : null}
      {l}
      <span className="c">{count}</span>
    </button>
  );
}
