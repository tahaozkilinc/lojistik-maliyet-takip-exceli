'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { initials, hasPhone } from '@/lib/format';
import { Icon } from '@/components/Icon';
import { FirmaAvatar } from '@/components/FirmaAvatar';

export function LimanFirmalari() {
  const { db, ui, go, setUi, openModal } = useStore();
  const q = ui.search.toLowerCase().trim();

  if (!db.limanFirmalari.length) {
    return (
      <div className="empty">
        <Icon name="users" size={46} sw={1.5} />
        <h3>Liman firması yok</h3>
        <p>
          Liman/depo masraflarında kullandığınız acente, elleçleme, gümrük gibi firmaları burada tanımlayın; iletişim
          kişilerini ve ücret listelerini buradan yönetin. Bu liste, Nakliye Firmaları ve Navlun Firmaları
          listelerinden bağımsızdır.
        </p>
        <button className="btn primary" onClick={() => openModal({ type: 'limanFirma' })}>
          + İlk Liman Firmasını Ekle
        </button>
      </div>
    );
  }

  let list = [...db.limanFirmalari].sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
  if (q)
    list = list.filter((f) =>
      (f.ad + (f.calisanlar || []).map((c) => c.ad + (c.email || '')).join('')).toLowerCase().includes(q),
    );

  return (
    <>
      <div className="hint" style={{ marginBottom: 14 }}>
        Bu liste, Nakliye Firmaları ve Navlun Firmaları listelerinden bağımsızdır — yalnızca liman/depo masraflarında
        kullanılır.
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn primary" onClick={() => openModal({ type: 'limanFirma' })}>
          <Icon name="plus" size={15} sw={2.4} />
          Yeni Liman Firması
        </button>
      </div>
      <div className="firm-grid">
        {list.map((f) => {
          const ucretSay = (f.ucretler || []).length;
          return (
            <div
              key={f.id}
              className="firm-card"
              onClick={() => {
                setUi({ limanFirmaId: f.id });
                go('limanFirmaDetay');
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
                    openModal({ type: 'limanFirma', id: f.id });
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
                  <span className="num">{ucretSay}</span>
                  <span className="lbl">Kayıtlı Ücret</span>
                </div>
                <div className="fc-stat" style={{ flex: 1 }}>
                  <span className="num">{(f.calisanlar || []).length}</span>
                  <span className="lbl">İletişim Kişisi</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
