'use client';
import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { ModalShell, ModalHead } from '@/components/Modal';

export function KurModal() {
  const { db, mutate, closeModal, toast } = useStore();
  const [usd, setUsd] = useState(String(db.kur.USD));
  const [eur, setEur] = useState(String(db.kur.EUR));
  const num = (v: string) => v.replace(',', '.').replace(/[^-0-9.]/g, '');

  function save() {
    mutate((d) => {
      d.kur.USD = Number(usd) || d.kur.USD;
      d.kur.EUR = Number(eur) || d.kur.EUR;
    });
    closeModal();
    toast('Kurlar güncellendi', 'ok');
  }

  return (
    <ModalShell onClose={closeModal} style={{ maxWidth: 420 }}>
      <ModalHead title="Döviz Kurları" onClose={closeModal} />
      <div className="modal-body">
        <div className="grid-2">
          <div className="field">
            <label>USD/TRY</label>
            <input inputMode="decimal" value={usd} onChange={(e) => setUsd(num(e.target.value))} />
          </div>
          <div className="field">
            <label>EUR/TRY</label>
            <input inputMode="decimal" value={eur} onChange={(e) => setEur(num(e.target.value))} />
          </div>
        </div>
        <div className="hint">
          Akaryakıt fiyatları her sabah 08:30&apos;da Petrol Ofisi&apos;nden otomatik çekilir ve ana panelde gösterilir.
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
