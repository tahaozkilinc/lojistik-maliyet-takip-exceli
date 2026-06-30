'use client';
import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { ModalShell, ModalHead } from '@/components/Modal';
import { TEL_PH } from '@/lib/constants';
import { uid, telFmt } from '@/lib/format';

export function NavlunFirmaModal({ id }: { id?: string }) {
  const { db, mutate, closeModal, toast } = useStore();
  const f = id ? db.navlunFirmalari.find((x) => x.id === id) : null;

  const [ad, setAd] = useState(f ? f.ad : '');
  const [tel, setTel] = useState(f && f.telefon ? f.telefon : '+90 ');
  const [email, setEmail] = useState(f ? f.email || '' : '');
  const [adres, setAdres] = useState(f ? f.adres || '' : '');
  const [notlar, setNotlar] = useState(f ? f.notlar || '' : '');

  function save() {
    const adt = ad.trim();
    if (!adt) {
      toast('Firma adı zorunlu', 'err');
      return;
    }
    const data = {
      ad: adt,
      telefon: tel.trim(),
      email: email.trim(),
      adres: adres.trim(),
      notlar: notlar.trim(),
    };
    mutate((d) => {
      if (id) {
        const ff = d.navlunFirmalari.find((x) => x.id === id);
        if (ff) Object.assign(ff, data);
      } else {
        d.navlunFirmalari.push({ id: uid('nf'), createdAt: new Date().toISOString(), ...data });
      }
    });
    closeModal();
    toast(id ? 'Navlun firması güncellendi' : 'Navlun firması eklendi', 'ok');
  }

  function del() {
    if (!confirm('Bu navlun firması silinsin mi? Geçmiş tekliflerdeki adı korunmaz.')) return;
    mutate((d) => {
      d.navlunFirmalari = d.navlunFirmalari.filter((x) => x.id !== id);
    });
    closeModal();
    toast('Firma silindi');
  }

  return (
    <ModalShell onClose={closeModal}>
      <ModalHead title={f ? 'Navlun Firmasını Düzenle' : 'Yeni Navlun Firması'} onClose={closeModal} />
      <div className="modal-body">
        <div className="hint" style={{ marginBottom: 10 }}>
          Bu liste, Nakliye Talepleri modülündeki ana Firmalar listesinden bağımsızdır — yalnızca deniz/kara navlun
          tekliflerinde kullanılır.
        </div>
        <div className="field">
          <label>
            Firma Adı <span className="req">*</span>
          </label>
          <input placeholder="örn. MSC, Maersk, Çukurova Lojistik" value={ad} onChange={(e) => setAd(e.target.value)} />
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Telefon</label>
            <input placeholder={TEL_PH} value={tel} onChange={(e) => setTel(telFmt(e.target.value))} />
          </div>
          <div className="field">
            <label>E-posta</label>
            <input placeholder="ornek@firma.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Adres</label>
          <input value={adres} onChange={(e) => setAdres(e.target.value)} />
        </div>
        <div className="field">
          <label>Notlar</label>
          <textarea placeholder="Hat, ödeme koşulları, özel not…" value={notlar} onChange={(e) => setNotlar(e.target.value)} />
        </div>
      </div>
      <div className="modal-foot">
        {f && (
          <button className="btn danger" onClick={del}>
            Sil
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={closeModal}>
          Vazgeç
        </button>
        <button className="btn primary" onClick={save}>
          {f ? 'Kaydet' : 'Ekle'}
        </button>
      </div>
    </ModalShell>
  );
}
