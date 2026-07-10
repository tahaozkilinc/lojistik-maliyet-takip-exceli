'use client';
import React, { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { ModalShell, ModalHead } from '@/components/Modal';
import { sonIslem, findAnlasmalar, firmaSonFiyat, firmName } from '@/lib/calc';
import { PARA_KODLARI } from '@/lib/constants';
import { money, dt, uid, plus7, fmtTon } from '@/lib/format';

export function TeklifModal({
  talepId,
  teklifId,
  presetFirma,
  presetFiyat,
  presetPara,
}: {
  talepId: string;
  teklifId?: string;
  presetFirma?: string;
  presetFiyat?: number | string;
  presetPara?: string;
}) {
  const { db, mutate, closeModal, toast, openModal } = useStore();
  const t = db.talepler.find((x) => x.id === talepId);
  const noFirms = !db.firmalar.length;

  const q = t && teklifId ? t.teklifler.find((x) => x.id === teklifId) : null;
  const son = t ? sonIslem(db, t.yuklemeLokasyonId, t.teslimLokasyonId, t.id) : null;
  const anlasmalar = t ? findAnlasmalar(db, t.yuklemeLokasyonId, t.teslimLokasyonId, t.yukTipi) : [];

  // Bu hatta hiç geçmiş fiyat ("son") yoksa, sistemde kayıtlı anlaşmalı fiyatı otomatik öner.
  const anlDef = anlasmalar[0] || null;
  const defFirma = q ? q.firmaId : presetFirma || (son ? son.firmaId : anlDef ? anlDef.firma.id : db.firmalar[0]?.id) || '';
  const defFiyat = q
    ? String(q.fiyat)
    : presetFiyat != null
      ? String(presetFiyat)
      : son
        ? String(son.birimFiyat)
        : anlDef
          ? String(anlDef.anlasma.birimFiyat)
          : '';
  const defPara = q ? q.paraBirimi : presetPara || (son ? son.paraBirimi : anlDef ? anlDef.anlasma.paraBirimi : 'TRY');

  const [firma, setFirma] = useState(defFirma);
  const [fiyat, setFiyat] = useState(defFiyat);
  const [para, setPara] = useState(defPara);
  const [kdv, setKdv] = useState(q ? (q.kdvDahil ? '1' : '0') : '0');
  const [sure, setSure] = useState(q ? q.teslimSuresi || '' : '');
  const [gecerlilik, setGecerlilik] = useState(q ? q.gecerlilik || '' : plus7());
  const [not, setNot] = useState(q ? q.notlar || '' : '');

  // Önkoşullar sağlanmazsa (firma yok / talep yok) modalı yönlendir/kapat.
  useEffect(() => {
    if (noFirms) {
      toast('Önce en az bir nakliye firması ekleyin', 'err');
      openModal({ type: 'firma' });
    } else if (!t) {
      closeModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noFirms, t]);

  if (noFirms || !t) return null;

  // Seçili firma için ipucu (anlaşma / önceki fiyat).
  const anl = ((db.firmalar.find((f) => f.id === firma) || {}).anlasmalar || []).find(
    (a) =>
      a.yuklemeLokasyonId === t.yuklemeLokasyonId &&
      a.teslimLokasyonId === t.teslimLokasyonId &&
      (!a.yukTipi || !t.yukTipi || a.yukTipi === t.yukTipi) &&
      a.birimFiyat != null &&
      (a.birimFiyat as unknown) !== '',
  );
  const fs = firmaSonFiyat(db, firma, t.yuklemeLokasyonId, t.teslimLokasyonId, t.id);

  function applyPrice(f: number, p: string) {
    setFiyat(String(f));
    setPara(p);
  }

  function save() {
    const fNum = Number(fiyat);
    if (!fNum || fNum <= 0) {
      toast('Geçerli bir fiyat girin', 'err');
      return;
    }
    const data = {
      firmaId: firma,
      fiyat: fNum,
      paraBirimi: para,
      kdvDahil: kdv === '1',
      teslimSuresi: sure.trim(),
      gecerlilik,
      notlar: not.trim(),
    };
    mutate((d) => {
      const tt = d.talepler.find((x) => x.id === talepId)!;
      if (teklifId) {
        const qq = tt.teklifler.find((x) => x.id === teklifId);
        if (qq) Object.assign(qq, data);
      } else {
        tt.teklifler.push({ id: uid('q'), createdAt: new Date().toISOString(), ...data });
      }
    });
    closeModal();
    toast(teklifId ? 'Teklif güncellendi' : 'Teklif eklendi', 'ok');
  }

  return (
    <ModalShell onClose={closeModal}>
      <ModalHead title={q ? 'Teklifi Düzenle' : 'Teklif Ekle'} onClose={closeModal} />
      <div className="modal-body">
        {!q && (son || anlasmalar.length) ? (
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 8, padding: '11px 13px', marginBottom: 15, fontSize: 12.5 }}>
            {anlasmalar.map((a) => (
              <div key={a.anlasma.id || a.firma.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                <span className="tag" style={{ background: 'var(--gold-soft)', borderColor: 'var(--gold)', color: 'var(--amber)' }}>
                  ANLAŞMALI
                </span>{' '}
                <b>{a.firma.ad}</b> {money(a.anlasma.birimFiyat, a.anlasma.paraBirimi)}/{t.birim || 'ton'}
                {a.anlasma.yukTipi ? <> · <span style={{ color: 'var(--muted)' }}>{a.anlasma.yukTipi}</span></> : null}
                <button
                  className="btn sm gold"
                  style={{ marginLeft: 'auto', padding: '3px 9px' }}
                  onClick={() => {
                    setFirma(a.firma.id);
                    applyPrice(a.anlasma.birimFiyat, a.anlasma.paraBirimi);
                  }}
                >
                  Kullan
                </button>
              </div>
            ))}
            {son ? (
              <div style={{ padding: '4px 0', color: 'var(--muted)' }}>
                ↩ Bu hatta önceki: <b style={{ color: 'var(--text)' }}>{firmName(db, son.firmaId)}</b> ·{' '}
                <b style={{ color: 'var(--text)' }}>
                  {money(son.birimFiyat, son.paraBirimi)}/{t.birim || 'ton'}
                </b>{' '}
                ({dt(son.tarih)})
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="field">
          <label>
            Nakliye Firması <span className="req">*</span>
          </label>
          <select value={firma} onChange={(e) => setFirma(e.target.value)}>
            {db.firmalar.map((f) => (
              <option key={f.id} value={f.id}>
                {f.ad}
              </option>
            ))}
          </select>
          <div className="hint">
            {anl ? (
              <>
                <span style={{ color: 'var(--amber)', fontWeight: 600 }}>
                  ★ Bu firmayla bu hatta anlaşma: {money(anl.birimFiyat, anl.paraBirimi)}/{t.birim || 'ton'}
                </span>{' '}
                ·{' '}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    applyPrice(anl.birimFiyat, anl.paraBirimi);
                  }}
                >
                  uygula
                </a>
              </>
            ) : fs ? (
              <>
                Bu firmanın bu hatta önceki fiyatı:{' '}
                <b>
                  {money(fs.birimFiyat, fs.paraBirimi)}/{t.birim || 'ton'}
                </b>{' '}
                ({dt(fs.tarih)})
              </>
            ) : (
              'Bu firmanın bu hatta önceki teklifi yok.'
            )}
          </div>
        </div>
        <div className="grid-3">
          <div className="field">
            <label>
              Fiyat (₺/{t.birim || 'ton'}) <span className="req">*</span>
            </label>
            <input type="number" step="any" placeholder="0" value={fiyat} onChange={(e) => setFiyat(e.target.value)} />
          </div>
          <div className="field">
            <label>Para Birimi</label>
            <select value={para} onChange={(e) => setPara(e.target.value)}>
              {PARA_KODLARI.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>KDV</label>
            <select value={kdv} onChange={(e) => setKdv(e.target.value)}>
              <option value="0">Hariç</option>
              <option value="1">Dahil</option>
            </select>
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Teslim Süresi</label>
            <input placeholder="örn. 2 gün" value={sure} onChange={(e) => setSure(e.target.value)} />
          </div>
          <div className="field">
            <label>Geçerlilik Tarihi</label>
            <input type="date" value={gecerlilik} onChange={(e) => setGecerlilik(e.target.value)} />
            <div className="hint">Varsayılan: 1 hafta</div>
          </div>
        </div>
        <div className="field">
          <label>Notlar</label>
          <textarea placeholder="Ödeme vadesi, dönüş yükü, özel koşul…" value={not} onChange={(e) => setNot(e.target.value)} />
        </div>
        {t.miktar ? (
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
            Tonaj: <b>{fmtTon(t.miktar)} {t.birim}</b> · girdiğiniz birim fiyat × tonaj = toplam tutar otomatik hesaplanır.
          </div>
        ) : null}
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={closeModal}>
          Vazgeç
        </button>
        <button className="btn primary" onClick={save}>
          {q ? 'Kaydet' : 'Ekle'}
        </button>
      </div>
    </ModalShell>
  );
}
