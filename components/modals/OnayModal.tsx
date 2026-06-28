'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { ModalShell, ModalHead } from '@/components/Modal';
import { Icon } from '@/components/Icon';
import { toTRY, bestQuoteId, firmName, qTotal } from '@/lib/calc';
import { PARA_KODLARI, SAFE_FILE_MIME } from '@/lib/constants';
import { money, fmtTon } from '@/lib/format';
import type { ImzaliBelge } from '@/lib/types';

interface Row {
  qid: string;
  firma: string;
  fiyat: string;
  para: string;
  kdv: boolean;
}

export function OnayModal({ id }: { id: string }) {
  const { db, mutate, closeModal, toast, setPrintJob, openModal } = useStore();
  const t = db.talepler.find((x) => x.id === id);
  const fileInput = useRef<HTMLInputElement>(null);

  const initRows = (): Row[] => {
    if (!t) return [];
    return [...t.teklifler]
      .sort((a, b) => toTRY(db, a.fiyat, a.paraBirimi) - toTRY(db, b.fiyat, b.paraBirimi))
      .map((q) => ({ qid: q.id, firma: firmName(db, q.firmaId), fiyat: String(q.fiyat), para: q.paraBirimi, kdv: !!q.kdvDahil }));
  };

  const [rows, setRows] = useState<Row[]>(initRows);
  const [selId, setSelId] = useState<string | null>(t ? t.secilenTeklifId || bestQuoteId(db, t) : null);
  const [yonetici, setYonetici] = useState((t && t.onay && t.onay.yonetici) || '');
  const [tarih, setTarih] = useState((t && t.onay && t.onay.tarih && t.onay.tarih.slice(0, 10)) || new Date().toISOString().slice(0, 10));
  const [not, setNot] = useState((t && t.onay && t.onay.not) || '');
  const [pendingFile, setPendingFile] = useState<ImzaliBelge | null>(null);
  const [existingBelge, setExistingBelge] = useState<ImzaliBelge | null>((t && t.onay && t.onay.imzaliBelge) || null);

  useEffect(() => {
    if (!t) closeModal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  if (!t) return null;

  const num = (v: string) => v.replace(',', '.').replace(/[^-0-9.]/g, '');
  function setRow(qid: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.qid === qid ? { ...r, ...patch } : r)));
  }

  const miktar = Number(t.miktar) || 0;
  const selRow = rows.find((r) => r.qid === selId);

  /** Mevcut tablo değerlerini DB'ye yazar; seçimi uygular. */
  function applyRevise(draft: typeof db) {
    const tt = draft.talepler.find((x) => x.id === id)!;
    rows.forEach((r) => {
      const q = tt.teklifler.find((x) => x.id === r.qid);
      if (!q) return;
      const f = parseFloat(r.fiyat);
      if (isFinite(f) && f > 0) q.fiyat = f;
      q.paraBirimi = r.para;
      q.kdvDahil = r.kdv;
    });
    if (selId) tt.secilenTeklifId = selId;
  }

  function saveRevise() {
    mutate((d) => applyRevise(d));
    toast('Fiyatlar ve seçim kaydedildi', 'ok');
  }
  function saveReviseAndReport() {
    mutate((d) => applyRevise(d));
    closeModal();
    setPrintJob({ type: 'single', id });
  }
  function openIndirim() {
    mutate((d) => applyRevise(d));
    openModal({ type: 'indirim', talepId: id });
  }

  function handleFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0];
    if (!f) return;
    // Güvenlik: yalnızca script çalıştıramayan görsel biçimleri ve PDF kabul edilir.
    if (!SAFE_FILE_MIME.test(f.type)) {
      toast('Yalnızca görsel (PNG/JPG/GIF/WebP) veya PDF yükleyebilirsiniz', 'err');
      ev.target.value = '';
      return;
    }
    if (f.size > 4 * 1024 * 1024) {
      toast("Dosya 4MB'tan büyük olamaz", 'err');
      ev.target.value = '';
      return;
    }
    const r = new FileReader();
    r.onload = () => {
      setPendingFile({ ad: f.name, tip: f.type, boyut: (f.size / 1024).toFixed(0) + ' KB', data: String(r.result) });
      setExistingBelge(null);
      toast("Belge hazır — Onayla'ya basınca kaydedilir", 'ok');
    };
    r.readAsDataURL(f);
    ev.target.value = '';
  }

  function decide(karar: 'onaylandi' | 'reddedildi') {
    const yon = yonetici.trim();
    if (!yon) {
      toast('Onaylayan kişiyi girin', 'err');
      return;
    }
    if (karar === 'onaylandi' && !selId) {
      toast('Onaylamadan önce bir teklif seçin', 'err');
      return;
    }
    mutate((d) => {
      applyRevise(d);
      const tt = d.talepler.find((x) => x.id === id)!;
      tt.durum = karar;
      tt.onay = {
        ...(tt.onay || {}),
        yonetici: yon,
        tarih: new Date(tarih || Date.now()).toISOString(),
        not: not.trim(),
      };
      if (pendingFile) tt.onay.imzaliBelge = pendingFile;
      else if (!existingBelge) tt.onay.imzaliBelge = null;
    });
    closeModal();
    toast(karar === 'onaylandi' ? 'Talep onaylandı ✓' : 'Talep reddedildi', karar === 'onaylandi' ? 'ok' : 'err');
  }

  const chip = pendingFile || existingBelge;

  return (
    <ModalShell onClose={closeModal} size="wide">
      <ModalHead title={`Onaya Hazırla & Karar · ${t.yuklemeNoktasi} → ${t.teslimNoktasi}`} onClose={closeModal} />
      <div className="modal-body">
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 10 }}>
          {t.yukTipi || ''}
          {t.miktar ? ' · ' + fmtTon(t.miktar) + ' ' + (t.birim || '') : ''}
          {t.aracTipi ? ' · ' + t.aracTipi : ''}
        </div>
        <div className="section-divider">Tedarikçi fiyatları — burada revize edip seçebilirsiniz</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th style={{ width: 42 }}>Seç</th>
                <th>Tedarikçi</th>
                <th>Birim Fiyat</th>
                <th>Para</th>
                <th>KDV</th>
                <th style={{ textAlign: 'right' }}>Toplam</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((r) => {
                  const fv = parseFloat(r.fiyat) || 0;
                  const tot = toTRY(db, fv, r.para) * miktar;
                  return (
                    <tr key={r.qid} style={r.qid === selId ? { background: 'var(--gold-soft)' } : undefined}>
                      <td style={{ textAlign: 'center' }}>
                        <input type="radio" name="o_sel" checked={r.qid === selId} onChange={() => setSelId(r.qid)} />
                      </td>
                      <td style={{ fontWeight: 600 }}>{r.firma}</td>
                      <td>
                        <input
                          inputMode="decimal"
                          style={{ width: 96, padding: '6px 8px' }}
                          value={r.fiyat}
                          onChange={(e) => setRow(r.qid, { fiyat: num(e.target.value) })}
                        />
                      </td>
                      <td>
                        <select style={{ padding: '6px 6px' }} value={r.para} onChange={(e) => setRow(r.qid, { para: e.target.value })}>
                          {PARA_KODLARI.map((p) => (
                            <option key={p}>{p}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select style={{ padding: '6px 6px' }} value={r.kdv ? '1' : '0'} onChange={(e) => setRow(r.qid, { kdv: e.target.value === '1' })}>
                          <option value="0">Hariç</option>
                          <option value="1">Dahil</option>
                        </select>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>{t.miktar ? money(tot, 'TRY') : '—'}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: 14, color: 'var(--faint)' }}>
                    Bu talepte teklif yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 10, fontSize: 13 }}>
          {selRow ? (
            <>
              Seçilen: <b>{selRow.firma}</b> ·{' '}
              <b>
                {money(parseFloat(selRow.fiyat) || 0, selRow.para)}/{t.birim || 'ton'}
              </b>
              {t.miktar ? (
                <>
                  {' '}· Toplam <b>{money(toTRY(db, parseFloat(selRow.fiyat) || 0, selRow.para) * miktar, 'TRY')}</b>
                </>
              ) : null}
            </>
          ) : (
            <span style={{ color: 'var(--amber)' }}>Henüz teklif seçilmedi — bir satırı işaretleyin.</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <button className="btn sm" onClick={saveRevise}>
            <Icon name="save" size={13} />
            Fiyatları Kaydet
          </button>
          <button className="btn sm" onClick={saveReviseAndReport}>
            <Icon name="print" size={13} />
            Kaydet &amp; Rapor Yazdır
          </button>
          <button className="btn sm ghost" onClick={openIndirim}>
            İndirim / Gerçekleşen Fiyat
          </button>
        </div>

        <div className="section-divider" style={{ marginTop: 18 }}>
          Yönetim kararı
        </div>
        <div className="grid-2">
          <div className="field">
            <label>
              Onaylayan / Yönetici <span className="req">*</span>
            </label>
            <input placeholder="Ad Soyad" value={yonetici} onChange={(e) => setYonetici(e.target.value)} />
          </div>
          <div className="field">
            <label>Karar Tarihi</label>
            <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Not / Gerekçe</label>
          <textarea placeholder="Onay/red ile ilgili açıklama…" value={not} onChange={(e) => setNot(e.target.value)} />
        </div>
        <div className="section-divider">Islak imzalı belge (opsiyonel)</div>
        <div id="fileZone">
          {chip ? (
            <div className="file-chip">
              <div className="fi">
                <Icon name="file" size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="fn">{chip.ad}</div>
                <div className="fs">{(chip.boyut || '') + ' · ' + (pendingFile ? 'yüklendi' : 'arşivli')}</div>
              </div>
              <button
                className="btn sm ghost"
                onClick={() => {
                  setPendingFile(null);
                  setExistingBelge(null);
                }}
              >
                Kaldır
              </button>
            </div>
          ) : (
            <div className="dropzone" onClick={() => fileInput.current?.click()}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <path d="M17 8l-5-5-5 5" />
                <path d="M12 3v12" />
              </svg>
              <div style={{ fontWeight: 600, color: 'var(--text)' }}>Islak imzalı raporu yükleyin</div>
              <div style={{ fontSize: 12, marginTop: 3 }}>Taranmış PDF veya fotoğraf · sürükleyin ya da tıklayın</div>
            </div>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp,image/bmp,image/avif,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
        <div className="hint" style={{ marginTop: 8 }}>
          Akış: fiyatları revize edin → seçimi yapın → <b>Kaydet &amp; Rapor</b> ile çıktı alıp imzalatın → taranmış belgeyi yükleyip <b>Onayla</b>.
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn danger" onClick={() => decide('reddedildi')}>
          Reddet
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={closeModal}>
          Kapat
        </button>
        <button className="btn green" onClick={() => decide('onaylandi')}>
          <Icon name="check" size={15} sw={2.5} />
          Onayla
        </button>
      </div>
    </ModalShell>
  );
}
