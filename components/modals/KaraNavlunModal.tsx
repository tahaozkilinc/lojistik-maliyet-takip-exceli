'use client';
import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { ModalShell, ModalHead } from '@/components/Modal';
import { karaNavlunHatlar } from '@/lib/karaNavlun';
import { PARA_KODLARI, ARAC, BIRIMLER } from '@/lib/constants';
import { uid } from '@/lib/format';

export function KaraNavlunModal({ id }: { id?: string }) {
  const { db, mutate, closeModal, toast, setUi } = useStore();
  const r = id ? db.karaNavlun.find((x) => x.id === id) : null;
  const hatlar = karaNavlunHatlar(db);

  const [donem, setDonem] = useState(r ? r.donem : new Date().toISOString().slice(0, 7));
  const [hat, setHat] = useState(r ? r.hat || '' : '');
  const [tasiyici, setTasiyici] = useState(r ? r.tasiyici || '' : '');
  const [aracTipi, setAracTipi] = useState(r ? r.aracTipi || '' : '');
  const [fiyat, setFiyat] = useState(r && r.fiyat != null ? String(r.fiyat) : '');
  const [birim, setBirim] = useState(r ? r.birim || '' : '');
  const [para, setPara] = useState(r ? r.paraBirimi || 'TRY' : 'TRY');
  const [not, setNot] = useState(r ? r.notlar || '' : '');

  const num = (v: string) => v.replace(',', '.').replace(/[^-0-9.]/g, '');

  function save() {
    if (!donem) {
      toast('Dönem (ay) seçin', 'err');
      return;
    }
    const fiyatT = fiyat.trim();
    if (!fiyatT) {
      toast('Fiyat girin', 'err');
      return;
    }
    const data = {
      donem,
      tarih: donem + '-15',
      hat: hat.trim(),
      tasiyici: tasiyici.trim(),
      aracTipi,
      fiyat: Number(fiyatT),
      birim,
      paraBirimi: para,
      notlar: not.trim(),
    };
    mutate((d) => {
      if (id) {
        const rec = d.karaNavlun.find((x) => x.id === id);
        if (rec) Object.assign(rec, data);
      } else {
        d.karaNavlun.push({ id: uid('kn'), createdAt: new Date().toISOString(), ...data });
      }
    });
    setUi({ karaNavlunYil: +donem.slice(0, 4) });
    closeModal();
    toast(id ? 'Kara navlun kaydı güncellendi' : 'Kara navlun kaydı eklendi', 'ok');
  }

  function del() {
    if (!confirm('Bu kara navlun kaydı silinsin mi?')) return;
    mutate((d) => {
      d.karaNavlun = d.karaNavlun.filter((x) => x.id !== id);
    });
    closeModal();
    toast('Kayıt silindi', 'ok');
  }

  return (
    <ModalShell onClose={closeModal}>
      <ModalHead title={r ? 'Kara Navlun Kaydını Düzenle' : 'Yeni Kara Navlun Kaydı'} onClose={closeModal} />
      <div className="modal-body">
        <div className="grid-2">
          <div className="field">
            <label>
              Dönem (Ay) <span className="req">*</span>
            </label>
            <input type="month" value={donem} onChange={(e) => setDonem(e.target.value)} />
          </div>
          <div className="field">
            <label>Hat / Güzergah</label>
            <input list="karaHatList" autoComplete="off" placeholder="örn. Konya → Adana" value={hat} onChange={(e) => setHat(e.target.value)} />
            <datalist id="karaHatList">
              {hatlar.map((h) => (
                <option key={h} value={h} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Taşıyıcı / Firma (opsiyonel)</label>
            <input placeholder="örn. Çukurova Lojistik" value={tasiyici} onChange={(e) => setTasiyici(e.target.value)} />
          </div>
          <div className="field">
            <label>Araç Tipi</label>
            <select value={aracTipi} onChange={(e) => setAracTipi(e.target.value)}>
              <option value="">Seçiniz</option>
              {ARAC.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid-3">
          <div className="field">
            <label>Fiyat</label>
            <input inputMode="decimal" placeholder="0" value={fiyat} onChange={(e) => setFiyat(num(e.target.value))} />
          </div>
          <div className="field">
            <label>Birim</label>
            <select value={birim} onChange={(e) => setBirim(e.target.value)}>
              <option value="">Seçiniz</option>
              {BIRIMLER.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
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
        <div className="field">
          <label>Notlar</label>
          <textarea placeholder="Mesafe, yükleme/boşaltma koşulu, özel not…" value={not} onChange={(e) => setNot(e.target.value)} />
        </div>
      </div>
      <div className="modal-foot">
        {r && (
          <button className="btn danger" onClick={del}>
            Sil
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={closeModal}>
          Vazgeç
        </button>
        <button className="btn primary" onClick={save}>
          {r ? 'Kaydet' : 'Ekle'}
        </button>
      </div>
    </ModalShell>
  );
}
