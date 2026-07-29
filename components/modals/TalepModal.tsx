'use client';
import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { ModalShell, ModalHead } from '@/components/Modal';
import { LokOptions } from './shared';
import { defaultTeslimId, findAnlasmalar } from '@/lib/calc';
import { YUK_TIPLERI, BIRIMLER, ARAC } from '@/lib/constants';
import { uid, fmtTon, tonNum, tonInputMask, plus7 } from '@/lib/format';

export function TalepModal({ id }: { id?: string }) {
  const { db, mutate, closeModal, toast, go, ui, openModal } = useStore();
  const x = id ? db.talepler.find((t) => t.id === id) : null;
  const nextNo = x ? x.talepNo : 'NT-' + new Date().getFullYear() + '-' + String(db.talepler.length + 1).padStart(3, '0');

  const otherInit = !!(x && x.yukTipi && !YUK_TIPLERI.includes(x.yukTipi));
  const [talepNo, setTalepNo] = useState(nextNo);
  const [tarih, setTarih] = useState(x ? x.yuklemeTarihi || '' : '');
  const [yuk, setYuk] = useState(x ? x.yuklemeLokasyonId : '');
  const [tes, setTes] = useState(x ? x.teslimLokasyonId : defaultTeslimId(db));
  const [yukSel, setYukSel] = useState(x ? (otherInit ? '__other' : x.yukTipi || '') : '');
  const [yukOther, setYukOther] = useState(otherInit ? x!.yukTipi || '' : '');
  const [miktar, setMiktar] = useState(x && x.miktar != null ? fmtTon(x.miktar) : '');
  const [birim, setBirim] = useState(x ? x.birim || 'ton' : 'ton');
  // Yeni talepte varsayılan olarak "Tır" seçili gelir — gerekirse değiştirilebilir.
  const [arac, setArac] = useState(x ? x.aracTipi || '' : 'Tır');
  const [aciklama, setAciklama] = useState(x ? x.aciklama || '' : '');

  function save() {
    if (!yuk || !tes) {
      toast('Yükleme ve teslim lokasyonu seçin', 'err');
      return;
    }
    const yL = db.lokasyonlar.find((l) => l.id === yuk);
    const tL = db.lokasyonlar.find((l) => l.id === tes);
    const yukTipi = (yukSel === '__other' ? yukOther : yukSel).trim();
    if (!yukTipi) {
      toast('Yük tipini seçin', 'err');
      return;
    }
    if (/^[\d.,\s]+$/.test(yukTipi)) {
      toast('Yük tipi sadece sayı olamaz', 'err');
      return;
    }
    const data = {
      talepNo: talepNo.trim() || 'NT-' + Date.now(),
      yuklemeLokasyonId: yuk,
      teslimLokasyonId: tes,
      yuklemeNoktasi: yL ? yL.ad : '',
      teslimNoktasi: tL ? tL.ad : '',
      yukTipi,
      miktar: tonNum(miktar),
      birim,
      aracTipi: arac,
      yuklemeTarihi: tarih.trim(),
      aciklama: aciklama.trim(),
    };
    let newId = '';
    let autoCount = 0;
    mutate((d) => {
      if (id) {
        const t = d.talepler.find((y) => y.id === id);
        if (t) Object.assign(t, data);
      } else {
        const yeni = {
          id: uid('t'),
          teklifler: [] as ReturnType<typeof makeQuote>[],
          secilenTeklifId: null as string | null,
          durum: 'toplama' as const,
          onay: null,
          createdAt: new Date().toISOString(),
          ...data,
        };
        findAnlasmalar(d, yuk, tes, yukTipi).forEach((m) => {
          yeni.teklifler.push(makeQuote(m.firma.id, m.anlasma.birimFiyat, m.anlasma.paraBirimi));
        });
        autoCount = yeni.teklifler.length;
        newId = yeni.id;
        d.talepler.push(yeni);
      }
    });
    closeModal();
    if (id) {
      toast('Talep güncellendi', 'ok');
    } else {
      toast(
        autoCount ? 'Talep oluşturuldu · ' + autoCount + ' anlaşmalı fiyat otomatik eklendi' : 'Talep oluşturuldu — şimdi teklif ekleyin',
        'ok',
      );
      if (ui.view !== 'detail') go('detail', newId);
    }
  }

  return (
    <ModalShell onClose={closeModal}>
      <ModalHead title={x ? 'Talebi Düzenle' : 'Yeni Nakliye Talebi'} onClose={closeModal} />
      <div className="modal-body">
        <div className="grid-2">
          <div className="field">
            <label>Talep No</label>
            <input value={talepNo} onChange={(e) => setTalepNo(e.target.value)} />
          </div>
          <div className="field">
            <label>Yükleme Tarihi</label>
            <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>
              Yükleme Noktası (Lokasyon) <span className="req">*</span>
            </label>
            <select value={yuk} onChange={(e) => setYuk(e.target.value)}>
              <option value="">— Seçin —</option>
              <LokOptions db={db} />
            </select>
            <div className="hint">
              Listede yok mu?{' '}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  openModal({ type: 'lokasyon' });
                }}
              >
                Yeni lokasyon ekle
              </a>
            </div>
          </div>
          <div className="field">
            <label>
              Teslim Noktası <span className="req">*</span>
            </label>
            <select value={tes} onChange={(e) => setTes(e.target.value)}>
              <LokOptions db={db} />
            </select>
            <div className="hint">Varsayılan: fabrika</div>
          </div>
        </div>
        <div className="grid-3">
          <div className="field">
            <label>
              Yük Tipi <span className="req">*</span>
            </label>
            <select value={yukSel} onChange={(e) => setYukSel(e.target.value)}>
              <option value="">— Seçin —</option>
              {YUK_TIPLERI.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
              <option value="__other">Diğer (elle yaz)…</option>
            </select>
            {yukSel === '__other' && (
              <input style={{ marginTop: 8 }} placeholder="Ürün adını yazın" value={yukOther} onChange={(e) => setYukOther(e.target.value)} autoFocus />
            )}
          </div>
          <div className="field">
            <label>Miktar (tonaj)</label>
            <input inputMode="decimal" placeholder="örn. 1500 veya 28,5" value={miktar} onChange={(e) => setMiktar(tonInputMask(e.target.value))} />
          </div>
          <div className="field">
            <label>Birim</label>
            <select value={birim} onChange={(e) => setBirim(e.target.value)}>
              {BIRIMLER.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Araç Tipi</label>
          <select value={arac} onChange={(e) => setArac(e.target.value)}>
            <option value="">Seçiniz…</option>
            {/* Eski kayıtlarda listede artık olmayan bir araç tipi olabilir — o kaybolmasın diye korunur. */}
            {arac && !ARAC.includes(arac) && <option value={arac}>{arac} (eski)</option>}
            {ARAC.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Açıklama / Özel şartlar</label>
          <textarea placeholder="Yükleme saati, sigorta, özel istekler…" value={aciklama} onChange={(e) => setAciklama(e.target.value)} />
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={closeModal}>
          Vazgeç
        </button>
        <button className="btn primary" onClick={save}>
          {x ? 'Kaydet' : 'Oluştur'}
        </button>
      </div>
    </ModalShell>
  );
}

function makeQuote(firmaId: string, fiyat: number, paraBirimi: string) {
  return {
    id: uid('q'),
    firmaId,
    fiyat,
    paraBirimi,
    kdvDahil: false,
    teslimSuresi: '',
    gecerlilik: plus7(),
    notlar: 'Anlaşmalı fiyat (otomatik)',
    createdAt: new Date().toISOString(),
  };
}
