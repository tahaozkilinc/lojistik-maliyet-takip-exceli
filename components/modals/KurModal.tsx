'use client';
import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { ModalShell, ModalHead } from '@/components/Modal';

export function KurModal() {
  const { db, mutate, closeModal, toast } = useStore();
  const [usd, setUsd] = useState(String(db.kur.USD));
  const [eur, setEur] = useState(String(db.kur.EUR));
  const [motorin, setMotorin] = useState(db.kur.motorin ? String(db.kur.motorin) : '');

  function save() {
    mutate((d) => {
      d.kur.USD = Number(usd) || d.kur.USD;
      d.kur.EUR = Number(eur) || d.kur.EUR;
      d.kur.motorin = Number(motorin) || 0;
    });
    closeModal();
    toast('Kurlar güncellendi', 'ok');
  }

  return (
    <ModalShell onClose={closeModal} style={{ maxWidth: 420 }}>
      <ModalHead title="Döviz Kurları & Motorin Fiyatı" onClose={closeModal} />
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
        <div className="field">
          <label>Motorin ₺/lt (Petrol Ofisi Adana)</label>
          <input type="number" step="any" placeholder="örn. 44.50" value={motorin} onChange={(e) => setMotorin(e.target.value)} />
        </div>
        <div className="hint">
          Petrol Ofisi&apos;nin şehir bazlı akaryakıt fiyatı için genel/anahtarsız bir API yok; güncel motorin
          fiyatını buradan elle girin. Brent petrol artık ana sayfada TradingView&apos;dan canlı çekiliyor.
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
