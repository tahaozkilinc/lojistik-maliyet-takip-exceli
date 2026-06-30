'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { initials } from '@/lib/format';
import { Icon } from '@/components/Icon';

export function NavlunFirmalar() {
  const { db, ui, openModal } = useStore();
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
  if (q) list = list.filter((f) => (f.ad + (f.email || '') + (f.adres || '')).toLowerCase().includes(q));

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
          const denizTeklif = db.denizNavlun.reduce((s, n) => s + (n.teklifler || []).filter((t) => t.firmaId === f.id).length, 0);
          const karaTeklif = db.karaNavlun.reduce((s, n) => s + (n.teklifler || []).filter((t) => t.firmaId === f.id).length, 0);
          const secilme =
            db.denizNavlun.filter((n) => {
              const t = (n.teklifler || []).find((x) => x.id === n.secilenTeklifId);
              return t && t.firmaId === f.id;
            }).length +
            db.karaNavlun.filter((n) => {
              const t = (n.teklifler || []).find((x) => x.id === n.secilenTeklifId);
              return t && t.firmaId === f.id;
            }).length;
          return (
            <div
              key={f.id}
              className="firm-card"
              onClick={() => openModal({ type: 'navlunFirma', id: f.id })}
              style={{ cursor: 'pointer' }}
            >
              <div className="fc-head">
                <div className="fc-avatar">{initials(f.ad)}</div>
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
                {f.telefon && (
                  <div className="fc-line">
                    <Icon name="phone" size={15} />
                    {f.telefon}
                  </div>
                )}
                {f.email && (
                  <div className="fc-line">
                    <Icon name="mail" size={15} />
                    {f.email}
                  </div>
                )}
                {f.adres && (
                  <div className="fc-line">
                    <Icon name="mappin" size={15} />
                    {f.adres}
                  </div>
                )}
                {f.notlar && (
                  <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--muted)', fontStyle: 'italic' }}>{f.notlar}</div>
                )}
              </div>
              <div className="fc-foot">
                <div className="fc-stat" style={{ flex: 1 }}>
                  <span className="num">{denizTeklif + karaTeklif}</span>
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
