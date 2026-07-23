'use client';
import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { ModalShell, ModalHead } from '@/components/Modal';
import { Icon } from '@/components/Icon';
import { LogoUpload } from '@/components/LogoUpload';
import { TEL_PH } from '@/lib/constants';
import { uid, telFmt } from '@/lib/format';
import type { Calisan } from '@/lib/types';

export function NavlunFirmaModal({ id }: { id?: string }) {
  const { db, mutate, closeModal, toast } = useStore();
  const f = id ? db.navlunFirmalari.find((x) => x.id === id) : null;

  const [ad, setAd] = useState(f ? f.ad : '');
  const [tel, setTel] = useState(f ? f.telefon || '' : '');
  const [notlar, setNotlar] = useState(f ? f.notlar || '' : '');
  const [logo, setLogo] = useState<string | null>(f?.logo || null);
  const [emps, setEmps] = useState<Calisan[]>(
    f && f.calisanlar && f.calisanlar.length ? f.calisanlar.map((c) => ({ ...c })) : [{ ad: '', unvan: '', email: '', telefon: '' }],
  );

  function setEmp(i: number, k: keyof Calisan, v: string) {
    setEmps((prev) => prev.map((e, idx) => (idx === i ? { ...e, [k]: v } : e)));
  }
  function addEmp() {
    setEmps((prev) => [...prev, { ad: '', unvan: '', email: '', telefon: '' }]);
  }
  function delEmp(i: number) {
    setEmps((prev) => prev.filter((_, idx) => idx !== i));
  }

  function save() {
    const adt = ad.trim();
    if (!adt) {
      toast('Firma adı zorunlu', 'err');
      return;
    }
    const calisanlar = emps
      .map((e) => ({ ad: (e.ad || '').trim(), unvan: (e.unvan || '').trim(), email: (e.email || '').trim(), telefon: (e.telefon || '').trim() }))
      .filter((e) => e.ad || e.email || e.telefon);
    // email/adres bilinçli olarak yazılmaz: eski kayıtlardaki değerler silinmeden korunur.
    const data = {
      ad: adt,
      telefon: tel.trim(),
      notlar: notlar.trim(),
      calisanlar,
      logo,
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
    <ModalShell onClose={closeModal} size="xwide">
      <ModalHead title={f ? 'Navlun Firmasını Düzenle' : 'Yeni Navlun Firması'} onClose={closeModal} />
      <div className="modal-body">
        <div className="hint" style={{ marginBottom: 10 }}>
          Bu liste, Nakliye Talepleri modülündeki ana Firmalar listesinden bağımsızdır — yalnızca deniz/kara navlun
          tekliflerinde kullanılır.
        </div>
        <LogoUpload value={logo} onChange={setLogo} toast={toast} />
        <div className="grid-2">
          <div className="field">
            <label>
              Firma Adı <span className="req">*</span>
            </label>
            <input placeholder="örn. MSC, Maersk, Çukurova Lojistik" value={ad} onChange={(e) => setAd(e.target.value)} />
          </div>
          <div className="field">
            <label>Telefon (santral)</label>
            <input placeholder={TEL_PH} value={tel} onChange={(e) => setTel(telFmt(e.target.value))} />
          </div>
        </div>
        <div className="section-divider">
          <Icon name="users" size={14} />
          İletişim Kişileri
        </div>
        <div id="empList">
          {emps.map((e, i) => (
            <div className="emp-row" key={i}>
              <input placeholder="Ad Soyad" value={e.ad || ''} onChange={(ev) => setEmp(i, 'ad', ev.target.value)} />
              <input placeholder="Ünvan" value={e.unvan || ''} onChange={(ev) => setEmp(i, 'unvan', ev.target.value)} />
              <input placeholder="E-posta" value={e.email || ''} onChange={(ev) => setEmp(i, 'email', ev.target.value)} />
              <input placeholder={TEL_PH} value={e.telefon || ''} onChange={(ev) => setEmp(i, 'telefon', telFmt(ev.target.value))} />
              <button className="del" onClick={() => delEmp(i)}>
                ×
              </button>
            </div>
          ))}
        </div>
        <button className="btn sm" onClick={addEmp}>
          <Icon name="plus" size={13} sw={2.4} />
          Kişi Ekle
        </button>
        <div className="field" style={{ marginTop: 16 }}>
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
