'use client';
import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { ModalShell, ModalHead } from '@/components/Modal';
import { Icon } from '@/components/Icon';
import { LogoUpload } from '@/components/LogoUpload';
import { TEL_PH } from '@/lib/constants';
import { uid, telFmt } from '@/lib/format';
import type { Calisan } from '@/lib/types';

export function FirmaModal({ id }: { id?: string }) {
  const { db, mutate, closeModal, toast, go } = useStore();
  const f = id ? db.firmalar.find((x) => x.id === id) : null;

  const [ad, setAd] = useState(f ? f.ad : '');
  const [sehir, setSehir] = useState(f ? f.sehir || '' : '');
  const [vkn, setVkn] = useState(f ? f.vergiNo || '' : '');
  const [tel, setTel] = useState(f && f.telefon ? f.telefon : '+90 ');
  const [adres, setAdres] = useState(f ? f.adres || '' : '');
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
    const data = {
      ad: adt,
      sehir: sehir.trim(),
      vergiNo: vkn.trim(),
      telefon: tel.trim(),
      adres: adres.trim(),
      notlar: notlar.trim(),
      calisanlar,
      logo,
    };
    mutate((d) => {
      if (id) {
        const ff = d.firmalar.find((x) => x.id === id);
        if (ff) Object.assign(ff, data);
      } else {
        d.firmalar.push({ id: uid('f'), createdAt: new Date().toISOString(), anlasmalar: [], ...data });
      }
    });
    closeModal();
    toast(id ? 'Firma güncellendi' : 'Firma eklendi', 'ok');
  }

  function del() {
    if (!confirm('Firma silinsin mi? Geçmiş tekliflerdeki adı korunmaz.')) return;
    mutate((d) => {
      d.firmalar = d.firmalar.filter((x) => x.id !== id);
    });
    closeModal();
    if (db.firmalar.length <= 1) go('firmalar');
    toast('Firma silindi');
  }

  return (
    <ModalShell onClose={closeModal} size="xwide">
      <ModalHead title={f ? 'Firmayı Düzenle' : 'Yeni Nakliye Firması'} onClose={closeModal} />
      <div className="modal-body">
        <LogoUpload value={logo} onChange={setLogo} toast={toast} />
        <div className="grid-2">
          <div className="field">
            <label>
              Firma Adı <span className="req">*</span>
            </label>
            <input value={ad} onChange={(e) => setAd(e.target.value)} />
          </div>
          <div className="field">
            <label>Şehir</label>
            <input value={sehir} onChange={(e) => setSehir(e.target.value)} />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Vergi No</label>
            <input value={vkn} onChange={(e) => setVkn(e.target.value)} />
          </div>
          <div className="field">
            <label>Telefon (santral)</label>
            <input placeholder={TEL_PH} value={tel} onChange={(e) => setTel(telFmt(e.target.value))} />
          </div>
        </div>
        <div className="field">
          <label>Adres</label>
          <input value={adres} onChange={(e) => setAdres(e.target.value)} />
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
        <div className="section-divider">
          <Icon name="onaylar" size={14} />
          Anlaşmalı Fiyatlar
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 9, padding: '11px 13px' }}>
          Anlaşmalı fiyatlar artık firmanın <b>detay sayfasında</b> yönetiliyor.{' '}
          {f
            ? 'Kaydettikten sonra firma kartına tıklayıp "Anlaşma Ekle" ile fiyat girebilir, geçmişi görebilirsiniz.'
            : 'Firmayı ekledikten sonra kartına tıklayıp anlaşmalı fiyatları girebilirsiniz.'}{' '}
          Her ürün+hat için tek güncel fiyat tutulur; fiyat değişince eskisi otomatik geçmişe işlenir.
        </div>
        <div className="field" style={{ marginTop: 16 }}>
          <label>Notlar</label>
          <textarea placeholder="Ödeme koşulları, araç filosu, güçlü olduğu güzergahlar…" value={notlar} onChange={(e) => setNotlar(e.target.value)} />
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
