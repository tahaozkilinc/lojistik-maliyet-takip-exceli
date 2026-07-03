'use client';
import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { ModalShell, ModalHead } from '@/components/Modal';
import { toTRY, navlunFirmName } from '@/lib/calc';
import { tasimaReferansTeklif } from '@/lib/tasima';
import { money } from '@/lib/format';
import { PARA_KODLARI } from '@/lib/constants';

export function TasimaIndirimModal({ talepId }: { talepId: string }) {
  const { db, mutate, closeModal, toast } = useStore();
  const t = db.tasimaTalepleri.find((x) => x.id === talepId);
  const ref = t ? tasimaReferansTeklif(db, t) : null;

  const g = (t && t.gerceklesen) || null;
  const [fiyat, setFiyat] = useState(String(g && g.fiyat != null ? g.fiyat : ref ? ref.fiyat : ''));
  const [para, setPara] = useState(g?.paraBirimi || ref?.paraBirimi || 'TRY');
  const [not, setNot] = useState(g?.not || '');

  if (!t || !ref) {
    return (
      <ModalShell onClose={closeModal} style={{ maxWidth: 420 }}>
        <ModalHead title="İndirim / Gerçekleşen Fiyat" onClose={closeModal} />
        <div className="modal-body">
          <p style={{ color: 'var(--amber)' }}>Önce bir teklif seçin.</p>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={closeModal}>
            Kapat
          </button>
        </div>
      </ModalShell>
    );
  }

  const num = (v: string) => v.replace(',', '.').replace(/[^-0-9.]/g, '');
  const fv = parseFloat(fiyat);
  let hesap: React.ReactNode = '';
  if (isFinite(fv)) {
    const o = toTRY(db, ref.fiyat, ref.paraBirimi);
    const y = toTRY(db, fv, para);
    const pct = o ? ((o - y) / o) * 100 : 0;
    hesap = (
      <>
        Fark:{' '}
        <b style={{ color: pct >= 0 ? 'var(--green)' : 'var(--red)' }}>
          {pct >= 0 ? '▼' : '▲'} {Math.abs(pct).toFixed(1)}%
        </b>{' '}
        · TRY karşılığı: <b>{money(y, 'TRY')}</b>
      </>
    );
  }

  function save() {
    if (!isFinite(fv) || fv <= 0) {
      toast('Geçerli bir fiyat girin', 'err');
      return;
    }
    mutate((d) => {
      const tt = d.tasimaTalepleri.find((x) => x.id === talepId)!;
      tt.gerceklesen = { fiyat: fv, paraBirimi: para, not: not.trim(), tarih: new Date().toISOString() };
    });
    closeModal();
    toast('Gerçekleşen (indirimli) fiyat kaydedildi', 'ok');
  }
  function sil() {
    if (t!.gerceklesen && !confirm('Gerçekleşen/indirimli fiyat kaldırılsın mı?')) return;
    mutate((d) => {
      const tt = d.tasimaTalepleri.find((x) => x.id === talepId)!;
      tt.gerceklesen = null;
    });
    closeModal();
    toast('İndirim kaldırıldı', 'ok');
  }

  return (
    <ModalShell onClose={closeModal}>
      <ModalHead title="İndirim / Gerçekleşen Fiyat" onClose={closeModal} />
      <div className="modal-body">
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 8, padding: '11px 13px', marginBottom: 14, fontSize: 13 }}>
          Seçili firma: <b>{navlunFirmName(db, ref.firmaId)}</b> · Teklif: <b>{money(ref.fiyat, ref.paraBirimi)}</b>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>
              Gerçekleşen Toplam Fiyat <span className="req">*</span>
            </label>
            <input inputMode="decimal" value={fiyat} onChange={(e) => setFiyat(num(e.target.value))} />
          </div>
          <div className="field">
            <label>Para Birimi</label>
            <select value={para} onChange={(e) => setPara(e.target.value)}>
              {PARA_KODLARI.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="hint" style={{ margin: '-4px 0 10px' }}>
          {hesap}
        </div>
        <div className="field">
          <label>Not (opsiyonel)</label>
          <input placeholder="örn. %5 ek indirim, peşin ödeme karşılığı" value={not} onChange={(e) => setNot(e.target.value)} />
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--faint)' }}>
          Kaydedince bu güzergahın &quot;geçmiş taşıma&quot; özetlerinde gerçekleşen (indirimli) tutar olarak gösterilir.
        </div>
      </div>
      <div className="modal-foot">
        {t.gerceklesen && (
          <button className="btn danger" onClick={sil}>
            Kaldır
          </button>
        )}
        <div style={{ flex: 1 }} />
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
