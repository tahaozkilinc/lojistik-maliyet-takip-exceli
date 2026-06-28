'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { initials } from '@/lib/format';
import { exportTumFiyatlar } from '@/lib/export';
import { Icon } from '@/components/Icon';

export function Firmalar() {
  const { db, ui, go, setUi, openModal, toast } = useStore();
  const q = ui.search.toLowerCase().trim();

  if (!db.firmalar.length) {
    return (
      <div className="empty">
        <Icon name="building" size={46} sw={1.5} />
        <h3>Firma kaydı yok</h3>
        <p>
          Çalıştığınız nakliyecilerin firma kartlarını oluşturun: iletişim kişileri, e-posta ve telefonları burada saklanır, teklif eklerken
          listeden seçersiniz.
        </p>
        <button className="btn primary" onClick={() => openModal({ type: 'firma' })}>
          + İlk Firmayı Ekle
        </button>
      </div>
    );
  }

  let list = [...db.firmalar].sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
  if (q)
    list = list.filter((f) =>
      (f.ad + (f.sehir || '') + (f.calisanlar || []).map((c) => c.ad + (c.email || '')).join('')).toLowerCase().includes(q),
    );

  function goFirma(id: string) {
    setUi({ firmaId: id });
    go('firmaDetay');
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          className="btn sm"
          onClick={() => {
            if (exportTumFiyatlar(db)) toast('Excel indiriliyor', 'ok');
            else toast('Sistemde anlaşmalı fiyat yok', 'err');
          }}
        >
          <Icon name="download" size={13} />
          Tüm Fiyat Listesi (Excel)
        </button>
      </div>
      <div className="firm-grid">
        {list.map((f) => {
          const teklifSay = db.talepler.reduce((s, t) => s + t.teklifler.filter((q) => q.firmaId === f.id).length, 0);
          const secilme = db.talepler.filter((t) => {
            const q = t.teklifler.find((q) => q.id === t.secilenTeklifId);
            return q && q.firmaId === f.id;
          }).length;
          return (
            <div key={f.id} className="firm-card" onClick={() => goFirma(f.id)} style={{ cursor: 'pointer' }}>
              <div className="fc-head">
                <div className="fc-avatar">{initials(f.ad)}</div>
                <div style={{ flex: 1 }}>
                  <div className="fc-name">{f.ad}</div>
                  <div className="fc-meta">
                    {f.sehir || ''}
                    {f.vergiNo ? ' · VKN ' + f.vergiNo : ''}
                  </div>
                </div>
                <button
                  className="btn sm ghost"
                  style={{ color: '#cfe0f0' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openModal({ type: 'firma', id: f.id });
                  }}
                >
                  ✎
                </button>
              </div>
              <div className="fc-body">
                {f.telefon && (
                  <div className="fc-line">
                    <Icon name="phone" size={15} />
                    {f.telefon}
                  </div>
                )}
                {f.adres && (
                  <div className="fc-line">
                    <Icon name="mappin" size={15} />
                    {f.adres}
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
                  <span className="num">{teklifSay}</span>
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
