'use client';
import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { ModalShell, ModalHead } from '@/components/Modal';
import { LIMAN_MASRAF_TIPLERI, PARA_KODLARI } from '@/lib/constants';
import { uid } from '@/lib/format';
import { limanFirmaAdi } from '@/lib/calc';

export function LimanMasrafModal({ talepId, masrafId }: { talepId: string; masrafId?: string }) {
  const { db, mutate, closeModal, toast } = useStore();
  const talep = db.limanTalepleri.find((lt) => lt.id === talepId);
  const m = masrafId && talep ? talep.masraflar.find((x) => x.id === masrafId) : null;

  const defTip = m ? (LIMAN_MASRAF_TIPLERI.includes(m.masrafTipi) ? m.masrafTipi : '__other') : '';
  const [tipSel, setTipSel] = useState(defTip);
  const [tipOther, setTipOther] = useState(m && !LIMAN_MASRAF_TIPLERI.includes(m.masrafTipi) ? m.masrafTipi : '');
  const [aciklama, setAciklama] = useState(m ? m.aciklama || '' : '');
  const [firmaId, setFirmaId] = useState(m ? m.firmaId || '' : '');
  const [fiyat, setFiyat] = useState(m ? String(m.fiyat) : '');
  const [para, setPara] = useState(m ? m.paraBirimi : 'TRY');
  const [kdv, setKdv] = useState(m ? (m.kdvDahil ? '1' : '0') : '0');

  if (!talep) {
    return null;
  }

  function save() {
    const masrafTipi = (tipSel === '__other' ? tipOther : tipSel).trim();
    if (!masrafTipi) {
      toast('Masraf tipi seçin', 'err');
      return;
    }
    const fiyatNum = parseFloat(fiyat.replace(',', '.'));
    if (!fiyat.trim() || isNaN(fiyatNum) || fiyatNum < 0) {
      toast('Geçerli bir fiyat girin', 'err');
      return;
    }
    const now = new Date().toISOString();
    if (m) {
      mutate((d) => {
        const lt = d.limanTalepleri.find((x) => x.id === talepId);
        if (!lt) return;
        const mx = lt.masraflar.find((x) => x.id === m!.id);
        if (!mx) return;
        mx.masrafTipi = masrafTipi;
        mx.aciklama = aciklama.trim();
        mx.firmaId = firmaId || undefined;
        mx.fiyat = fiyatNum;
        mx.paraBirimi = para;
        mx.kdvDahil = kdv === '1';
      });
      toast('Masraf güncellendi', 'ok');
    } else {
      mutate((d) => {
        const lt = d.limanTalepleri.find((x) => x.id === talepId);
        if (!lt) return;
        lt.masraflar.push({
          id: uid('lm'),
          masrafTipi,
          aciklama: aciklama.trim(),
          firmaId: firmaId || undefined,
          fiyat: fiyatNum,
          paraBirimi: para,
          kdvDahil: kdv === '1',
          createdAt: now,
        });
      });
      toast('Masraf eklendi', 'ok');
    }
    closeModal();
  }

  return (
    <ModalShell onClose={closeModal} style={{ maxWidth: 460 }}>
      <ModalHead title={m ? 'Masrafı Düzenle' : 'Masraf Ekle'} onClose={closeModal} />
      <div className="modal-body">
        <div className="field">
          <label>Masraf Tipi *</label>
          <select value={tipSel} onChange={(e) => setTipSel(e.target.value)}>
            <option value="">— Seçin —</option>
            {LIMAN_MASRAF_TIPLERI.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
            <option value="__other">Diğer…</option>
          </select>
          {tipSel === '__other' && (
            <input
              style={{ marginTop: 6 }}
              value={tipOther}
              onChange={(e) => setTipOther(e.target.value)}
              placeholder="Masraf tipini yazın"
            />
          )}
        </div>
        <div className="field">
          <label>Açıklama</label>
          <input value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="İsteğe bağlı açıklama" />
        </div>
        <div className="field">
          <label>Firma / Acente</label>
          <select value={firmaId} onChange={(e) => setFirmaId(e.target.value)}>
            <option value="">— Seçin (isteğe bağlı) —</option>
            {/* Eski kayıtlarda ana Firma listesinden seçilmiş bir değer olabilir — Liman Firmaları listesinde yoksa o kaybolmasın diye korunur. */}
            {firmaId && !db.limanFirmalari.some((f) => f.id === firmaId) && (
              <option value={firmaId}>{limanFirmaAdi(db, firmaId)}</option>
            )}
            {db.limanFirmalari.map((f) => (
              <option key={f.id} value={f.id}>
                {f.ad}
              </option>
            ))}
          </select>
          <div className="hint">Listede yok mu? Sidebar&apos;dan Liman Firmaları bölümünden ekleyin.</div>
        </div>
        <div className="field-row">
          <div className="field" style={{ flex: 2 }}>
            <label>Fiyat *</label>
            <input
              type="text"
              inputMode="decimal"
              value={fiyat}
              onChange={(e) => setFiyat(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="field">
            <label>Para Birimi</label>
            <select value={para} onChange={(e) => setPara(e.target.value)}>
              {PARA_KODLARI.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label>KDV</label>
          <select value={kdv} onChange={(e) => setKdv(e.target.value)}>
            <option value="0">KDV Hariç</option>
            <option value="1">KDV Dahil</option>
          </select>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={closeModal}>
          İptal
        </button>
        <button className="btn primary" onClick={save}>
          {m ? 'Güncelle' : 'Ekle'}
        </button>
      </div>
    </ModalShell>
  );
}
