'use client';
import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { ModalShell, ModalHead } from '@/components/Modal';
import { LIMAN_MASRAF_TIPLERI, PARA_KODLARI } from '@/lib/constants';
import { uid } from '@/lib/format';

export function LimanUcretModal({ firmaId, ucretId }: { firmaId: string; ucretId?: string }) {
  const { db, mutate, closeModal, toast } = useStore();
  const f = db.limanFirmalari.find((x) => x.id === firmaId);
  const u = f && ucretId ? (f.ucretler || []).find((x) => x.id === ucretId) : null;
  const bugun = new Date().toISOString().slice(0, 10);

  const limanlar = db.lokasyonlar.filter((l) => l.tip === 'Liman' || l.tip === 'Depo');
  const defTip = u ? (LIMAN_MASRAF_TIPLERI.includes(u.masrafTipi) ? u.masrafTipi : '__other') : '';
  const [tipSel, setTipSel] = useState(defTip);
  const [tipOther, setTipOther] = useState(u && !LIMAN_MASRAF_TIPLERI.includes(u.masrafTipi) ? u.masrafTipi : '');
  const [limanId, setLimanId] = useState(u ? u.limanId || '' : '');
  const [fiyat, setFiyat] = useState(u != null ? String(u.fiyat) : '');
  const [para, setPara] = useState(u ? u.paraBirimi : 'TRY');
  const [tarih, setTarih] = useState(u ? u.tarih || bugun : bugun);
  const [notlar, setNotlar] = useState(u ? u.notlar || '' : '');

  if (!f) return null;

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
    mutate((d) => {
      const ff = d.limanFirmalari.find((x) => x.id === firmaId);
      if (!ff) return;
      if (!Array.isArray(ff.ucretler)) ff.ucretler = [];
      if (ucretId) {
        const uu = ff.ucretler.find((x) => x.id === ucretId);
        if (!uu) return;
        uu.masrafTipi = masrafTipi;
        uu.limanId = limanId || undefined;
        uu.fiyat = fiyatNum;
        uu.paraBirimi = para;
        uu.tarih = tarih;
        uu.notlar = notlar.trim();
      } else {
        ff.ucretler.push({
          id: uid('lu'),
          masrafTipi,
          limanId: limanId || undefined,
          fiyat: fiyatNum,
          paraBirimi: para,
          tarih,
          notlar: notlar.trim(),
          createdAt: new Date().toISOString(),
        });
      }
    });
    closeModal();
    toast(ucretId ? 'Ücret güncellendi' : 'Ücret eklendi', 'ok');
  }

  return (
    <ModalShell onClose={closeModal} style={{ maxWidth: 460 }}>
      <ModalHead title={(u ? 'Ücreti Düzenle' : 'Yeni Ücret') + ' — ' + f.ad} onClose={closeModal} />
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
          <label>Liman / Depo</label>
          <select value={limanId} onChange={(e) => setLimanId(e.target.value)}>
            <option value="">Tüm limanlar (genel ücret)</option>
            {limanlar.map((l) => (
              <option key={l.id} value={l.id}>
                {l.ad}
              </option>
            ))}
          </select>
          <div className="hint">Belirli bir liman/depo için farklı ücretliyse seçin; genelse boş bırakın.</div>
        </div>
        <div className="field-row">
          <div className="field" style={{ flex: 2 }}>
            <label>Fiyat *</label>
            <input type="text" inputMode="decimal" value={fiyat} onChange={(e) => setFiyat(e.target.value)} placeholder="0.00" />
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
          <label>Tarih</label>
          <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
        </div>
        <div className="field">
          <label>Notlar</label>
          <input value={notlar} onChange={(e) => setNotlar(e.target.value)} placeholder="İsteğe bağlı açıklama" />
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={closeModal}>
          İptal
        </button>
        <button className="btn primary" onClick={save}>
          {u ? 'Güncelle' : 'Ekle'}
        </button>
      </div>
    </ModalShell>
  );
}
