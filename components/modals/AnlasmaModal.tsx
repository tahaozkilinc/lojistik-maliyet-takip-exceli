'use client';
import React, { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { ModalShell, ModalHead } from '@/components/Modal';
import { LokOptions } from './shared';
import { defaultTeslimId, lokName } from '@/lib/calc';
import { YUK_TIPLERI, PARA_KODLARI } from '@/lib/constants';
import { money, uid } from '@/lib/format';

export function AnlasmaModal({ firmaId, anlId }: { firmaId: string; anlId?: string }) {
  const { db, mutate, closeModal, toast } = useStore();
  const f = db.firmalar.find((x) => x.id === firmaId);
  const a = f && anlId ? (f.anlasmalar || []).find((x) => x.id === anlId) : null;
  const bugun = new Date().toISOString().slice(0, 10);

  const [urun, setUrun] = useState(a ? a.yukTipi || '' : '');
  const [tarih, setTarih] = useState(a ? a.tarih || bugun : bugun);
  const [yuk, setYuk] = useState(a ? a.yuklemeLokasyonId : db.lokasyonlar[0]?.id || '');
  const [tes, setTes] = useState(a ? a.teslimLokasyonId : defaultTeslimId(db));
  const [fiyat, setFiyat] = useState(a && a.birimFiyat != null ? String(a.birimFiyat) : '');
  const [para, setPara] = useState(a ? a.paraBirimi : 'TRY');
  const num = (v: string) => v.replace(',', '.').replace(/[^-0-9.]/g, '');

  useEffect(() => {
    if (!f) closeModal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f]);

  if (!f) return null;
  const gecmisSayi = (a?.gecmis || []).length;

  // Özel (listede olmayan) ürün için ek seçenek.
  const urunOptions = [...YUK_TIPLERI];
  if (a && a.yukTipi && !YUK_TIPLERI.includes(a.yukTipi)) urunOptions.push(a.yukTipi);

  function save() {
    if (!yuk || !tes) {
      toast('Yükleme ve teslim noktası seçin', 'err');
      return;
    }
    const fNum = Number(fiyat) || 0;
    if (fNum <= 0) {
      toast('Geçerli bir birim fiyat girin', 'err');
      return;
    }
    const dup = (f!.anlasmalar || []).find(
      (x) => x.id !== anlId && x.yuklemeLokasyonId === yuk && x.teslimLokasyonId === tes && (x.yukTipi || '') === (urun || ''),
    );
    if (dup) {
      toast(
        'Bunun için zaten bir fiyat var: ' +
          (urun || 'Tüm ürünler') +
          ' · ' +
          (lokName(db, yuk) || '') +
          ' → ' +
          (lokName(db, tes) || '') +
          ' = ' +
          money(dup.birimFiyat, dup.paraBirimi) +
          '/ton. Mevcut kaydı düzenleyin.',
        'err',
      );
      return;
    }
    let degisti = false;
    mutate((d) => {
      const ff = d.firmalar.find((x) => x.id === firmaId)!;
      if (!Array.isArray(ff.anlasmalar)) ff.anlasmalar = [];
      if (anlId) {
        const an = ff.anlasmalar.find((x) => x.id === anlId);
        if (!an) return;
        degisti = (Number(an.birimFiyat) || 0) !== fNum || an.paraBirimi !== para;
        if (degisti) {
          an.gecmis = Array.isArray(an.gecmis) ? an.gecmis : [];
          an.gecmis.push({ birimFiyat: Number(an.birimFiyat) || 0, paraBirimi: an.paraBirimi || 'TRY', tarih: an.tarih || '' });
        }
        an.yuklemeLokasyonId = yuk;
        an.teslimLokasyonId = tes;
        an.yukTipi = urun || '';
        an.birimFiyat = fNum;
        an.paraBirimi = para;
        an.tarih = tarih;
      } else {
        ff.anlasmalar.push({
          id: uid('a'),
          yuklemeLokasyonId: yuk,
          teslimLokasyonId: tes,
          yukTipi: urun || '',
          birimFiyat: fNum,
          paraBirimi: para,
          tarih,
          gecmis: [],
        });
      }
    });
    closeModal();
    if (anlId) toast(degisti ? 'Fiyat güncellendi, eskisi geçmişe eklendi' : 'Anlaşma güncellendi', 'ok');
    else toast('Anlaşmalı fiyat eklendi', 'ok');
  }

  return (
    <ModalShell onClose={closeModal}>
      <ModalHead title={(a ? 'Anlaşmalı Fiyatı Düzenle' : 'Yeni Anlaşmalı Fiyat') + ' — ' + f.ad} onClose={closeModal} />
      <div className="modal-body">
        <div className="grid-2">
          <div className="field">
            <label>Ürün</label>
            <select value={urun} onChange={(e) => setUrun(e.target.value)}>
              <option value="">Tüm ürünler</option>
              {urunOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Anlaşma Tarihi</label>
            <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>
              Yükleme Noktası <span className="req">*</span>
            </label>
            <select value={yuk} onChange={(e) => setYuk(e.target.value)}>
              <LokOptions db={db} />
            </select>
          </div>
          <div className="field">
            <label>
              Teslim Noktası <span className="req">*</span>
            </label>
            <select value={tes} onChange={(e) => setTes(e.target.value)}>
              <LokOptions db={db} />
            </select>
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>
              Birim Fiyat (₺/ton) <span className="req">*</span>
            </label>
            <input inputMode="decimal" placeholder="0" value={fiyat} onChange={(e) => setFiyat(num(e.target.value))} />
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
        {a && gecmisSayi ? (
          <div style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 8, padding: '9px 11px' }}>
            Fiyatı değiştirip kaydederseniz mevcut <b>{money(a.birimFiyat, a.paraBirimi)}/ton</b> değeri geçmişe eklenir. Bu kayıtta {gecmisSayi} geçmiş fiyat var.
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--faint)' }}>
            Aynı ürün + hat için zaten fiyat varsa sistem sizi uyarır; ikinci bir fiyat oluşturmaz.
          </div>
        )}
      </div>
      <div className="modal-foot">
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={closeModal}>
          Vazgeç
        </button>
        <button className="btn primary" onClick={save}>
          {a ? 'Kaydet' : 'Ekle'}
        </button>
      </div>
    </ModalShell>
  );
}
