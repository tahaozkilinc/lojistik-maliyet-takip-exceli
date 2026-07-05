'use client';
import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { ModalShell, ModalHead } from '@/components/Modal';

export function KurModal() {
  const { db, mutate, closeModal, toast } = useStore();
  const [usd, setUsd] = useState(String(db.kur.USD));
  const [eur, setEur] = useState(String(db.kur.EUR));
  const [motorin, setMotorin] = useState(db.kur.motorin ? String(db.kur.motorin) : '');
  const [brent, setBrent] = useState(db.kur.brent ? String(db.kur.brent) : '');

  function save() {
    mutate((d) => {
      d.kur.USD = Number(usd) || d.kur.USD;
      d.kur.EUR = Number(eur) || d.kur.EUR;
      d.kur.motorin = Number(motorin) || 0;
      d.kur.brent = Number(brent) || 0;
    });
    closeModal();
    toast('Kurlar güncellendi', 'ok');
  }

  return (
    <ModalShell onClose={closeModal} style={{ maxWidth: 420 }}>
      <ModalHead title="Döviz Kurları & Petrol Fiyatları" onClose={closeModal} />
      <div className="modal-body">
        <div className="grid-2">
          <div className="field">
            <label>USD/TRY</label>
            <input type="number" step="any" value={usd} onChange={(e) => setUsd(e.target.value)} />
          </div>
          <div className="field">
            <label>EUR/TRY</label>
            <input type="number" step="any" value={eur} onChange={(e) => setEur(e.target.value)} />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Motorin ₺/lt (Petrol Ofisi Adana)</label>
            <input type="number" step="any" placeholder="örn. 44.50" value={motorin} onChange={(e) => setMotorin(e.target.value)} />
          </div>
          <div className="field">
            <label>Brent Petrol $/varil</label>
            <input type="number" step="any" placeholder="örn. 82.30" value={brent} onChange={(e) => setBrent(e.target.value)} />
          </div>
        </div>
        <div className="hint">
          Bu uygulama sunucusuz (statik) çalıştığından fiyatlar otomatik çekilemez — güncel değerleri buradan elle
          girin, ana sayfada gösterilir.
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={closeModal}>
          Vazgeç
        </button>
        <button className="btn primary" onClick={save}>
          Kaydet
        </button>
      </div>
    </ModalShell>
  );
}
