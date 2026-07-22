'use client';
import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { ModalShell, ModalHead } from '@/components/Modal';
import { YUK_TIPLERI } from '@/lib/constants';
import { uid } from '@/lib/format';
import type { LimanDurum } from '@/lib/types';

export function LimanTalepModal({ id, presetLimanId }: { id?: string; presetLimanId?: string }) {
  const { db, mutate, closeModal, toast, go, setUi } = useStore();
  const x = id ? db.limanTalepleri.find((lt) => lt.id === id) : null;

  const limanlar = db.lokasyonlar.filter((l) => l.tip === 'Liman' || l.tip === 'Depo');
  const nextNo = x
    ? x.talepNo
    : 'LT-' + new Date().getFullYear() + '-' + String(db.limanTalepleri.length + 1).padStart(3, '0');

  const [talepNo, setTalepNo] = useState(nextNo);
  const [limanId, setLimanId] = useState(x ? x.limanId : presetLimanId || limanlar[0]?.id || '');
  const [gemiAdi, setGemiAdi] = useState(x ? x.gemiAdi || '' : '');
  const [seferNo, setSeferNo] = useState(x ? x.seferNo || '' : '');
  const [yukTipiSel, setYukTipiSel] = useState(() => {
    if (!x?.yukTipi) return '';
    return YUK_TIPLERI.includes(x.yukTipi) ? x.yukTipi : '__other';
  });
  const [yukTipiOther, setYukTipiOther] = useState(() => {
    if (!x?.yukTipi) return '';
    return !YUK_TIPLERI.includes(x.yukTipi) ? x.yukTipi : '';
  });
  const [girisTarihi, setGirisTarihi] = useState(x ? x.girisTarihi || '' : '');
  const [cikisTarihi, setCikisTarihi] = useState(x ? x.cikisTarihi || '' : '');
  const [durum, setDurum] = useState<LimanDurum>(x ? x.durum : 'devam');
  const [notlar, setNotlar] = useState(x ? x.notlar || '' : '');

  if (!limanlar.length) {
    return (
      <ModalShell onClose={closeModal} style={{ maxWidth: 480 }}>
        <ModalHead title="Liman / Depo Kaydı" onClose={closeModal} />
        <div className="modal-body">
          <div className="hint">
            Masraf eklemek için önce <b>Lokasyonlar</b> bölümünden <b>Liman</b> ya da <b>Depo</b> tipinde bir lokasyon tanımlamanız gerekiyor.
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={closeModal}>
            Kapat
          </button>
          <button className="btn primary" onClick={() => { closeModal(); go('lokasyonlar'); }}>
            Lokasyonlara Git
          </button>
        </div>
      </ModalShell>
    );
  }

  function save() {
    if (!limanId) {
      toast('Liman seçin', 'err');
      return;
    }
    const yukTipi = (yukTipiSel === '__other' ? yukTipiOther : yukTipiSel).trim();
    const now = new Date().toISOString();
    if (x) {
      mutate((d) => {
        const t = d.limanTalepleri.find((lt) => lt.id === x!.id);
        if (!t) return;
        t.talepNo = talepNo.trim() || x!.talepNo;
        t.limanId = limanId;
        t.gemiAdi = gemiAdi.trim();
        t.seferNo = seferNo.trim();
        t.yukTipi = yukTipi;
        t.girisTarihi = girisTarihi;
        t.cikisTarihi = cikisTarihi;
        t.durum = durum;
        t.notlar = notlar.trim();
      });
      toast('Kayıt güncellendi', 'ok');
      closeModal();
    } else {
      const newId = uid('lt');
      mutate((d) => {
        d.limanTalepleri.push({
          id: newId,
          talepNo: talepNo.trim() || 'LT-' + Date.now(),
          limanId,
          gemiAdi: gemiAdi.trim(),
          seferNo: seferNo.trim(),
          yukTipi,
          masraflar: [],
          durum,
          notlar: notlar.trim(),
          girisTarihi,
          cikisTarihi,
          createdAt: now,
        });
      });
      toast('Kayıt oluşturuldu', 'ok');
      closeModal();
      setUi({ limanTalepId: newId });
      go('limanTalepDetay');
    }
  }

  return (
    <ModalShell onClose={closeModal} style={{ maxWidth: 520 }}>
      <ModalHead title={x ? 'Kaydı Düzenle' : 'Yeni Liman / Depo Kaydı'} onClose={closeModal} />
      <div className="modal-body">
        <div className="field-row">
          <div className="field">
            <label>Talep No</label>
            <input value={talepNo} onChange={(e) => setTalepNo(e.target.value)} />
          </div>
          <div className="field">
            <label>Durum</label>
            <select value={durum} onChange={(e) => setDurum(e.target.value as LimanDurum)}>
              <option value="devam">Devam Ediyor</option>
              <option value="tamamlandi">Tamamlandı</option>
              <option value="iptal">İptal</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>Liman / Depo *</label>
          <select value={limanId} onChange={(e) => setLimanId(e.target.value)}>
            <option value="">— Seçin —</option>
            {limanlar.map((l) => (
              <option key={l.id} value={l.id}>
                {l.ad} ({l.tip}){l.il ? ' / ' + l.il : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Gemi Adı</label>
            <input value={gemiAdi} onChange={(e) => setGemiAdi(e.target.value)} placeholder="MV Örnek" />
          </div>
          <div className="field">
            <label>Sefer / Voyage No</label>
            <input value={seferNo} onChange={(e) => setSeferNo(e.target.value)} placeholder="VOY-001" />
          </div>
        </div>
        <div className="field">
          <label>Yük Tipi</label>
          <select value={yukTipiSel} onChange={(e) => setYukTipiSel(e.target.value)}>
            <option value="">— Seçin —</option>
            {YUK_TIPLERI.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
            <option value="__other">Diğer…</option>
          </select>
          {yukTipiSel === '__other' && (
            <input
              style={{ marginTop: 6 }}
              value={yukTipiOther}
              onChange={(e) => setYukTipiOther(e.target.value)}
              placeholder="Yük tipini yazın"
            />
          )}
        </div>
        <div className="field-row">
          <div className="field">
            <label>Giriş Tarihi</label>
            <input type="date" value={girisTarihi} onChange={(e) => setGirisTarihi(e.target.value)} />
          </div>
          <div className="field">
            <label>Çıkış Tarihi</label>
            <input type="date" value={cikisTarihi} onChange={(e) => setCikisTarihi(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Notlar</label>
          <textarea value={notlar} onChange={(e) => setNotlar(e.target.value)} rows={2} placeholder="Eklemek istediğiniz notlar…" />
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={closeModal}>
          İptal
        </button>
        <button className="btn primary" onClick={save}>
          {x ? 'Kaydet' : 'Oluştur'}
        </button>
      </div>
    </ModalShell>
  );
}
