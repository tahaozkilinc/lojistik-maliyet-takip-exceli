'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { initials, hasPhone } from '@/lib/format';
import { navlunFirmaTeklifleri } from '@/lib/calc';
import { Icon } from '@/components/Icon';
import { FirmaAvatar } from '@/components/FirmaAvatar';

export function NavlunFirmalar() {
  const { db, ui, go, setUi, openModal } = useStore();
  const q = ui.search.toLowerCase().trim();

  if (!db.navlunFirmalari.length) {
    return (
      <div className="empty">
        <Icon name="users" size={46} sw={1.5} />
        <h3>Navlun firması yok</h3>
        <p>
          Deniz ve kara navlun tekliflerinde kullanacağınız firmaları burada tanımlayın. Bu liste, Nakliye Talepleri
          modülündeki ana Firmalar listesinden bağımsızdır.
        </p>
        <button className="btn primary" onClick={() => openModal({ type: 'navlunFirma' })}>
          + İlk Navlun Firmasını Ekle
        </button>
      </div>
    );
  }

  let list = [...db.navlunFirmalari].sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
  if (q)
    list = list.filter((f) =>
      (f.ad + (f.calisanlar || []).map((c) => c.ad + (c.email || '')).join('')).toLowerCase().includes(q),
    );

  return (
    <>
      <div className="hint" style={{ marginBottom: 14 }}>
        Bu liste, Nakliye Talepleri modülündeki ana Firmalar listesinden bağımsızdır — yalnızca deniz/kara navlun
        tekliflerinde kullanılır.
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn primary" onClick={() => openModal({ type: 'navlunFirma' })}>
          <Icon name="plus" size={15} sw={2.4} />
          Yeni Navlun Firması
        </button>
      </div>
      <div className="firm-grid">
        {list.map((f) => {
          const teklifler = navlunFirmaTeklifleri(db, f.id);
          const secilme = teklifler.filter((t) => t.secildi).length;
          return (
            <div
              key={f.id}
              className="firm-card"
              onClick={() => {
                setUi({ navlunFirmaId: f.id });
                go('navlunFirmaDetay');
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className="fc-head">
                <FirmaAvatar logo={f.logo} ad={f.ad} className="fc-avatar" />
                <div style={{ flex: 1 }}>
                  <div className="fc-name">{f.ad}</div>
                </div>
                <button
                  className="btn sm ghost"
                  style={{ color: '#cfe0f0' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openModal({ type: 'navlunFirma', id: f.id });
                  }}
                >
                  ✎
                </button>
              </div>
              <div className="fc-body">
                {hasPhone(f.telefon) && (
                  <div className="fc-line">
                    <Icon name="phone" size={15} />
                    {f.telefon}
                  </div>
                )}
                {f.calisanlar && f.calisanlar.length ? (
                  <div className="fc-emp">
                    {f.calisanlar.map((c, i) => (
                      <div key={i} className="fc-emp-item">
                        <div className="ea">{initials(c.ad)}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="en">
                            {c.ad}
                            {c.unvan ? (
                              <>
                                {' · '}
                                <span style={{ fontWeight: 500, color: 'var(--muted)' }}>{c.unvan}</span>
                              </>
                            ) : null}
                          </div>
                          <div className="et">
                            {c.email ? c.email : ''}
                            {c.telefon ? (c.email ? ' · ' : '') + c.telefon : ''}
                          </div>
                        </div>
                        {c.email ? (
                          <a className="btn sm ghost" href={'mailto:' + c.email} onClick={(e) => e.stopPropagation()} title="E-posta gönder">
                            ✉
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="fc-emp" style={{ color: 'var(--faint)', fontSize: 12.5 }}>
                    İletişim kişisi eklenmedi
                  </div>
                )}
                {f.notlar && (
                  <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--muted)', fontStyle: 'italic' }}>{f.notlar}</div>
                )}
              </div>
              <div className="fc-foot">
                <div className="fc-stat" style={{ flex: 1 }}>
                  <span className="num">{teklifler.length}</span>
                  <span className="lbl">Verilen Teklif</span>
                </div>
                <div className="fc-stat" style={{ flex: 1 }}>
                  <span className="num">{secilme}</span>
                  <span className="lbl">Seçildi / Onaylandı</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
