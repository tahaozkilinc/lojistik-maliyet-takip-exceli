'use client';
import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { ModalShell, ModalHead } from '@/components/Modal';
import { navlunHatlar } from '@/lib/navlun';
import { PARA_KODLARI } from '@/lib/constants';
import { uid } from '@/lib/format';

export function NavlunModal({ id }: { id?: string }) {
  const { db, mutate, closeModal, toast, setUi } = useStore();
  const r = id ? db.denizNavlun.find((x) => x.id === id) : null;
  const hatlar = navlunHatlar(db);

  const [donem, setDonem] = useState(r ? r.donem : new Date().toISOString().slice(0, 7));
  const [hat, setHat] = useState(r ? r.hat || '' : '');
  const [tasiyici, setTasiyici] = useState(r ? r.tasiyici || '' : '');
  const [c20, setC20] = useState(r && r.c20 != null ? String(r.c20) : '');
  const [c40, setC40] = useState(r && r.c40 != null ? String(r.c40) : '');
  const [para, setPara] = useState(r ? r.paraBirimi || 'USD' : 'USD');
  const [not, setNot] = useState(r ? r.notlar || '' : '');

  const num = (v: string) => v.replace(',', '.').replace(/[^-0-9.]/g, '');

  function save() {
    if (!donem) {
      toast('Dönem (ay) seçin', 'err');
      return;
    }
    const c20t = c20.trim();
    const c40t = c40.trim();
    if (!c20t && !c40t) {
      toast('En az bir konteyner fiyatı girin (20′ veya 40′)', 'err');
      return;
    }
    const data = {
      donem,
      tarih: donem + '-15',
      hat: hat.trim(),
      tasiyici: tasiyici.trim(),
      c20: c20t ? Number(c20t) : null,
      c40: c40t ? Number(c40t) : null,
      paraBirimi: para,
      notlar: not.trim(),
    };
    mutate((d) => {
      if (id) {
        const rec = d.denizNavlun.find((x) => x.id === id);
        if (rec) Object.assign(rec, data);
      } else {
        d.denizNavlun.push({ id: uid('n'), createdAt: new Date().toISOString(), ...data });
      }
    });
    setUi({ navlunYil: +donem.slice(0, 4) });
    closeModal();
    toast(id ? 'Navlun kaydı güncellendi' : 'Navlun kaydı eklendi', 'ok');
  }

  function del() {
    if (!confirm('Bu navlun kaydı silinsin mi?')) return;
    mutate((d) => {
      d.denizNavlun = d.denizNavlun.filter((x) => x.id !== id);
    });
    closeModal();
    toast('Kayıt silindi', 'ok');
  }

  return (
    <ModalShell onClose={closeModal}>
      <ModalHead title={r ? 'Navlun Kaydını Düzenle' : 'Yeni Deniz Navlun Kaydı'} onClose={closeModal} />
      <div className="modal-body">
        <div className="grid-2">
          <div className="field">
            <label>
              Dönem (Ay) <span className="req">*</span>
            </label>
            <input type="month" value={donem} onChange={(e) => setDonem(e.target.value)} />
            <div className="hint">Genelde her ayın 15&apos;i alınır</div>
          </div>
          <div className="field">
            <label>Hat / Güzergah</label>
            <input list="hatList" autoComplete="off" placeholder="örn. Mersin → Shanghai" value={hat} onChange={(e) => setHat(e.target.value)} />
            <datalist id="hatList">
              {hatlar.map((h) => (
                <option key={h} value={h} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="field">
          <label>Taşıyıcı / Acente (opsiyonel)</label>
          <input placeholder="örn. Maersk, MSC, CMA CGM" value={tasiyici} onChange={(e) => setTasiyici(e.target.value)} />
        </div>
        <div className="grid-3">
          <div className="field">
            <label>20′ Konteyner</label>
            <input inputMode="decimal" placeholder="0" value={c20} onChange={(e) => setC20(num(e.target.value))} />
          </div>
          <div className="field">
            <label>40′ Konteyner</label>
            <input inputMode="decimal" placeholder="0" value={c40} onChange={(e) => setC40(num(e.target.value))} />
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
          <textarea placeholder="BAF/CAF, transit süre, geçerlilik, özel koşul…" value={not} onChange={(e) => setNot(e.target.value)} />
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
