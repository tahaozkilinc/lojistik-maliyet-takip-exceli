'use client';
import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { ModalShell, ModalHead } from '@/components/Modal';
import { selectedQuote, toTRY, qTotal, firmName } from '@/lib/calc';
import { money } from '@/lib/format';
import { PARA_KODLARI } from '@/lib/constants';

export function IndirimModal({ talepId }: { talepId: string }) {
  const { db, mutate, closeModal, toast } = useStore();
  const t = db.talepler.find((x) => x.id === talepId);
  const q = t ? selectedQuote(t) : null;

  const g = (t && t.gerceklesen) || null;
  const [birim, setBirim] = useState(String(g && g.birimFiyat != null ? g.birimFiyat : q ? q.fiyat : ''));
  const [para, setPara] = useState(g?.paraBirimi || q?.paraBirimi || 'TRY');
  const [not, setNot] = useState(g?.not || '');

  if (!t || !q) {
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
  const bf = parseFloat(birim);
  let hesap: React.ReactNode = '';
  if (isFinite(bf)) {
    const o = toTRY(db, q.fiyat, q.paraBirimi);
    const y = toTRY(db, bf, para);
    const pct = o ? ((o - y) / o) * 100 : 0;
    const tot = y * (Number(t.miktar) || 0);
    hesap = (
      <>
        İndirim:{' '}
        <b style={{ color: pct >= 0 ? 'var(--green)' : 'var(--red)' }}>
          {pct >= 0 ? '▼' : '▲'} {Math.abs(pct).toFixed(1)}%
        </b>
        {t.miktar ? (
          <>
            {' '}· İndirimli toplam: <b>{money(tot, 'TRY')}</b>
          </>
        ) : null}
      </>
    );
  }

  function save() {
    if (!isFinite(bf) || bf <= 0) {
      toast('Geçerli bir birim fiyat girin', 'err');
      return;
    }
    mutate((d) => {
      const tt = d.talepler.find((x) => x.id === talepId)!;
      tt.gerceklesen = { birimFiyat: bf, paraBirimi: para, not: not.trim(), tarih: new Date().toISOString() };
    });
    closeModal();
    toast('Gerçekleşen (indirimli) fiyat kaydedildi', 'ok');
  }
  function sil() {
    if (t!.gerceklesen && !confirm('Gerçekleşen/indirimli fiyat kaldırılsın mı?')) return;
    mutate((d) => {
      const tt = d.talepler.find((x) => x.id === talepId)!;
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
          Seçili firma: <b>{firmName(db, q.firmaId)}</b> · Teklif:{' '}
          <b>
            {money(q.fiyat, q.paraBirimi)}/{t.birim || 'ton'}
          </b>
          {t.miktar ? <> · Toplam {money(qTotal(db, q, t), 'TRY')}</> : null}
        </div>
        <div className="grid-2">
          <div className="field">
            <label>
              Gerçekleşen Birim Fiyat (₺/{t.birim || 'ton'}) <span className="req">*</span>
            </label>
            <input inputMode="decimal" value={birim} onChange={(e) => setBirim(num(e.target.value))} />
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
          Kaydedince indirimli tutar olarak gösterilir ve bu hattın bir sonraki &quot;önceki fiyatı&quot; olur.
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
