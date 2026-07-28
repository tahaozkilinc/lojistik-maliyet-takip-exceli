'use client';
import React, { useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { ModalShell, ModalHead } from '@/components/Modal';
import { karaNavlunHatlar } from '@/lib/karaNavlun';
import { splitHat, joinHat } from '@/lib/navlun';
import { PARA_KODLARI, ARAC, BIRIMLER, SAFE_FILE_MIME } from '@/lib/constants';
import { uid, money } from '@/lib/format';
import { toTRY, navlunFirmName } from '@/lib/calc';
import { uploadBelge } from '@/lib/storage';
import { StatusBadge } from '@/components/StatusBadge';
import { Icon } from '@/components/Icon';
import type { ImzaliBelge, KaraNavlunTeklif, Durum } from '@/lib/types';

export function KaraNavlunModal({ id }: { id?: string }) {
  const { db, mutate, closeModal, toast, setUi } = useStore();
  const r = id ? db.karaNavlun.find((x) => x.id === id) : null;
  const hatlar = karaNavlunHatlar(db);
  // Otomatik tamamlama: mevcut kayıtlardaki güzergahların kalkış/varış parçaları.
  const kalkislar = [...new Set(hatlar.map((h) => splitHat(h).kalkis).filter(Boolean))];
  const varislar = [...new Set(hatlar.map((h) => splitHat(h).varis).filter(Boolean))];
  const fileInput = useRef<HTMLInputElement>(null);
  const num = (v: string) => v.replace(',', '.').replace(/[^-0-9.]/g, '');

  const [donem, setDonem] = useState(r ? r.donem : new Date().toISOString().slice(0, 7));
  // Güzergah iki ayrı alan olarak girilir; eski kayıtlarda tek "hat" metni varsa bölünür.
  const initHat = r ? (r.kalkisYeri != null || r.varisYeri != null ? { kalkis: r.kalkisYeri || '', varis: r.varisYeri || '' } : splitHat(r.hat)) : { kalkis: '', varis: '' };
  const [kalkis, setKalkis] = useState(initHat.kalkis);
  const [varis, setVaris] = useState(initHat.varis);
  // Eski kayıtlarda taşıyıcı serbest metindi; listede olmayan bu değer kaybolmasın
  // diye '__legacy' seçeneği olarak korunur. Yeni seçimler yalnızca Navlun Firmaları'ndan.
  const legacyTasiyici = r && !r.firmaId && r.tasiyici ? r.tasiyici : '';
  const [firmaSel, setFirmaSel] = useState(r ? r.firmaId || (legacyTasiyici ? '__legacy' : '') : '');
  const [siparisNo, setSiparisNo] = useState(r ? r.siparisNo || '' : '');
  const [aracTipi, setAracTipi] = useState(r ? r.aracTipi || '' : '');
  const [fiyat, setFiyat] = useState(r && r.fiyat != null ? String(r.fiyat) : '');
  const [birim, setBirim] = useState(r ? r.birim || '' : '');
  const [para, setPara] = useState(r ? r.paraBirimi || 'TRY' : 'TRY');
  const [not, setNot] = useState(r ? r.notlar || '' : '');

  // Firma teklifleri ve dönemsel onay — yalnızca mevcut bir kayıt düzenlenirken kullanılabilir.
  const [teklifler, setTeklifler] = useState<KaraNavlunTeklif[]>(r?.teklifler ? r.teklifler.map((t) => ({ ...t })) : []);
  const [selId, setSelId] = useState<string | null>(r?.secilenTeklifId || null);
  const [durum, setDurum] = useState<Durum>(r?.durum || 'toplama');

  const [tFirma, setTFirma] = useState(db.navlunFirmalari[0]?.id || '');
  const [tSiparisKodu, setTSiparisKodu] = useState('');
  const [tFiyat, setTFiyat] = useState('');
  const [tPara, setTPara] = useState('TRY');
  const [tNot, setTNot] = useState('');

  const [yonetici, setYonetici] = useState((r?.onay && r.onay.yonetici) || '');
  const [kararTarih, setKararTarih] = useState((r?.onay && r.onay.tarih && r.onay.tarih.slice(0, 10)) || new Date().toISOString().slice(0, 10));
  const [onayNot, setOnayNot] = useState((r?.onay && r.onay.not) || '');
  const [atandi, setAtandi] = useState((r?.onay && r.onay.atandi) || '');
  const [pendingFile, setPendingFile] = useState<ImzaliBelge | null>(null);
  const [existingBelge, setExistingBelge] = useState<ImzaliBelge | null>((r?.onay && r.onay.imzaliBelge) || null);
  const [uploading, setUploading] = useState(false);

  /** Seçilen navlun firmasını kayda yazılacak firmaId + tasiyici çiftine çevirir. */
  function firmaBilgi(): { firmaId: string; tasiyici: string } {
    if (firmaSel === '__legacy') return { firmaId: '', tasiyici: legacyTasiyici };
    const f = db.navlunFirmalari.find((x) => x.id === firmaSel);
    return { firmaId: f ? f.id : '', tasiyici: f ? f.ad : '' };
  }

  function save() {
    if (!donem) {
      toast('Dönem (ay) seçin', 'err');
      return;
    }
    const fiyatT = fiyat.trim();
    if (!fiyatT && !teklifler.length) {
      toast('Fiyat girin ya da firma teklifi ekleyin', 'err');
      return;
    }
    const data = {
      donem,
      tarih: donem + '-15',
      hat: joinHat(kalkis, varis),
      kalkisYeri: kalkis.trim(),
      varisYeri: varis.trim(),
      ...firmaBilgi(),
      siparisNo: siparisNo.trim(),
      aracTipi,
      fiyat: fiyatT ? Number(fiyatT) : null,
      birim,
      paraBirimi: para,
      notlar: not.trim(),
      teklifler,
      secilenTeklifId: selId,
    };
    mutate((d) => {
      if (id) {
        const rec = d.karaNavlun.find((x) => x.id === id);
        if (rec) Object.assign(rec, data);
      } else {
        d.karaNavlun.push({ id: uid('kn'), createdAt: new Date().toISOString(), durum: 'toplama', ...data });
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

  function addTeklif() {
    if (!tFirma) {
      toast('Önce Navlun Firmaları bölümünden bir firma ekleyin', 'err');
      return;
    }
    const fv = tFiyat.trim();
    if (!fv) {
      toast('Fiyat girin', 'err');
      return;
    }
    const nt: KaraNavlunTeklif = {
      id: uid('knt'),
      firmaId: tFirma,
      siparisKodu: tSiparisKodu.trim(),
      fiyat: Number(fv),
      paraBirimi: tPara,
      notlar: tNot.trim(),
      createdAt: new Date().toISOString(),
    };
    setTeklifler((prev) => [...prev, nt]);
    setTSiparisKodu('');
    setTFiyat('');
    setTNot('');
  }

  function removeTeklif(tid: string) {
    setTeklifler((prev) => prev.filter((t) => t.id !== tid));
    if (selId === tid) setSelId(null);
  }

  function setTeklifField(tid: string, patch: Partial<KaraNavlunTeklif>) {
    setTeklifler((prev) => prev.map((t) => (t.id === tid ? { ...t, ...patch } : t)));
  }

  /** Mevcut teklif/seçim durumunu kalıcılaştırır, gerekirse durum ve onay bilgisini günceller. */
  function persist(
    newDurum: Durum,
    onayPatch?: { yonetici?: string; tarih?: string; not?: string; atandi?: string; imzaliBelge?: ImzaliBelge | null; gonderim?: string | null },
    clearSelection?: boolean,
  ) {
    mutate((d) => {
      const rec = d.karaNavlun.find((x) => x.id === id);
      if (!rec) return;
      rec.donem = donem;
      rec.tarih = donem + '-15';
      rec.hat = joinHat(kalkis, varis);
      rec.kalkisYeri = kalkis.trim();
      rec.varisYeri = varis.trim();
      const fb = firmaBilgi();
      rec.firmaId = fb.firmaId;
      rec.tasiyici = fb.tasiyici;
      rec.siparisNo = siparisNo.trim();
      rec.notlar = not.trim();
      rec.teklifler = teklifler;
      // "Fiyat toplama"ya dönerken eski seçim de temizlenir — aksi halde teklif
      // tablosunda artık geçersiz olan bir satır hâlâ "seçili" görünmeye devam eder.
      rec.secilenTeklifId = clearSelection ? null : selId;
      rec.durum = newDurum;
      if (onayPatch) rec.onay = { ...(rec.onay || {}), ...onayPatch };
      if (newDurum === 'onaylandi' && selId) {
        const q = teklifler.find((t) => t.id === selId);
        if (q) {
          rec.firmaId = q.firmaId;
          rec.tasiyici = navlunFirmName(db, q.firmaId);
          if (q.siparisKodu && !rec.siparisNo) rec.siparisNo = q.siparisKodu;
          if (q.fiyat != null) rec.fiyat = q.fiyat;
          if (q.paraBirimi) rec.paraBirimi = q.paraBirimi;
        }
      }
    });
  }

  function sendOnaya() {
    if (!teklifler.length) {
      toast('Önce en az bir firma teklifi ekleyin', 'err');
      return;
    }
    persist('onayda', { gonderim: new Date().toISOString() });
    setDurum('onayda');
    if (r) {
      setFiyat(r.fiyat != null ? String(r.fiyat) : fiyat);
      setPara(r.paraBirimi || para);
    }
    toast('Dönemsel anlaşma onaya gönderildi', 'ok');
  }

  function geriCek() {
    if (!confirm('Onay durumu "fiyat toplama"ya geri alınacak. Devam edilsin mi?')) return;
    persist('toplama', { gonderim: null }, true);
    setSelId(null);
    setDurum('toplama');
    toast('Onaydan geri çekildi — teklifleri revize edebilirsiniz', 'ok');
  }

  async function handleFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0];
    if (!f) return;
    ev.target.value = '';
    // Güvenlik: yalnızca script çalıştıramayan görsel biçimleri ve PDF kabul edilir.
    if (!SAFE_FILE_MIME.test(f.type)) {
      toast('Yalnızca görsel (PNG/JPG/GIF/WebP) veya PDF yükleyebilirsiniz', 'err');
      return;
    }
    if (f.size > 4 * 1024 * 1024) {
      toast("Dosya 4MB'tan büyük olamaz", 'err');
      return;
    }
    setUploading(true);
    try {
      const belge = await uploadBelge(f);
      setPendingFile(belge);
      setExistingBelge(null);
      toast("Belge hazır — Onayla'ya basınca kaydedilir", 'ok');
    } catch {
      toast('Belge yüklenemedi — bağlantınızı kontrol edip tekrar deneyin', 'err');
    } finally {
      setUploading(false);
    }
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
    persist(karar, {
      yonetici: yon,
      tarih: new Date(kararTarih || Date.now()).toISOString(),
      not: onayNot.trim(),
      atandi: atandi.trim(),
      imzaliBelge: pendingFile || existingBelge,
    });
    closeModal();
    toast(karar === 'onaylandi' ? 'Dönemsel anlaşma onaylandı ✓' : 'Teklif reddedildi', karar === 'onaylandi' ? 'ok' : 'err');
  }

  const chip = pendingFile || existingBelge;
  const sorted = [...teklifler].sort((a, b) => {
    const av = toTRY(db, a.fiyat ?? 0, a.paraBirimi || 'TRY');
    const bv = toTRY(db, b.fiyat ?? 0, b.paraBirimi || 'TRY');
    return av - bv;
  });

  return (
    <ModalShell onClose={closeModal} size={r ? 'wide' : undefined}>
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
            <label>Araç Tipi</label>
            <select value={aracTipi} onChange={(e) => setAracTipi(e.target.value)}>
              <option value="">Seçiniz</option>
              {ARAC.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Kalkış Yeri</label>
            <input list="karaKalkisList" autoComplete="off" placeholder="örn. Konya" value={kalkis} onChange={(e) => setKalkis(e.target.value)} />
            <datalist id="karaKalkisList">
              {kalkislar.map((h) => (
                <option key={h} value={h} />
              ))}
            </datalist>
          </div>
          <div className="field">
            <label>Varış Yeri</label>
            <input list="karaVarisList" autoComplete="off" placeholder="örn. Adana" value={varis} onChange={(e) => setVaris(e.target.value)} />
            <datalist id="karaVarisList">
              {varislar.map((h) => (
                <option key={h} value={h} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Taşıyıcı Firma</label>
            <select value={firmaSel} onChange={(e) => setFirmaSel(e.target.value)}>
              <option value="">— Seçiniz —</option>
              {legacyTasiyici ? <option value="__legacy">{legacyTasiyici} (eski kayıt)</option> : null}
              {db.navlunFirmalari.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.ad}
                </option>
              ))}
            </select>
            <div className="hint">
              {db.navlunFirmalari.length
                ? 'Yalnızca Navlun Firmaları bölümünde tanımlı firmalar seçilebilir'
                : 'Liste boş — önce "Navlun Firmaları" bölümünden firma ekleyin'}
            </div>
          </div>
          <div className="field">
            <label>Sipariş No</label>
            <input placeholder="örn. SIP-2026-0154" value={siparisNo} onChange={(e) => setSiparisNo(e.target.value)} />
            <div className="hint">Gerçekleşen taşımanın sipariş numarası</div>
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

        {r ? (
          <>
            <div className="section-divider" style={{ marginTop: 18 }}>
              Firma Teklifleri {durum !== 'toplama' ? <StatusBadge durum={durum} /> : null}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left' }}>
                    {durum === 'onayda' ? <th style={{ width: 42 }}>Seç</th> : null}
                    <th>Firma</th>
                    <th>Sipariş Kodu</th>
                    <th style={{ textAlign: 'right' }}>Fiyat</th>
                    <th>Para</th>
                    <th style={{ textAlign: 'right' }}>TRY</th>
                    <th>Not</th>
                    {(durum === 'toplama' || durum === 'onayda') && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {sorted.length ? (
                    sorted.map((t) => {
                      const tryVal = toTRY(db, t.fiyat ?? 0, t.paraBirimi || 'TRY');
                      const editable = durum === 'toplama' || durum === 'onayda';
                      return (
                        <tr key={t.id} style={t.id === selId ? { background: 'var(--gold-soft)' } : undefined}>
                          {durum === 'onayda' ? (
                            <td style={{ textAlign: 'center' }}>
                              <input type="radio" name="knt_sel" checked={t.id === selId} onChange={() => setSelId(t.id)} />
                            </td>
                          ) : null}
                          <td style={{ fontWeight: 600 }}>{navlunFirmName(db, t.firmaId)}</td>
                          <td>
                            {editable ? (
                              <input
                                style={{ width: 100, padding: '5px 7px' }}
                                value={t.siparisKodu || ''}
                                onChange={(e) => setTeklifField(t.id, { siparisKodu: e.target.value })}
                              />
                            ) : (
                              t.siparisKodu || '—'
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {editable ? (
                              <input
                                inputMode="decimal"
                                style={{ width: 76, padding: '5px 7px', textAlign: 'right' }}
                                value={t.fiyat != null ? String(t.fiyat) : ''}
                                onChange={(e) => setTeklifField(t.id, { fiyat: e.target.value ? Number(num(e.target.value)) : null })}
                              />
                            ) : t.fiyat != null ? (
                              t.fiyat
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>
                            {editable ? (
                              <select style={{ padding: '5px 5px' }} value={t.paraBirimi || 'TRY'} onChange={(e) => setTeklifField(t.id, { paraBirimi: e.target.value })}>
                                {PARA_KODLARI.map((p) => (
                                  <option key={p}>{p}</option>
                                ))}
                              </select>
                            ) : (
                              t.paraBirimi
                            )}
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{money(tryVal, 'TRY')}</td>
                          <td>{t.notlar || ''}</td>
                          {(durum === 'toplama' || durum === 'onayda') && (
                            <td>
                              <button className="btn sm ghost" style={{ color: 'var(--red)' }} onClick={() => removeTeklif(t.id)}>
                                ×
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ padding: 12, color: 'var(--faint)' }}>
                        Henüz firma teklifi eklenmedi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {(durum === 'toplama' || durum === 'onayda') && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 10, background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 8, padding: 10 }}>
                <div className="field" style={{ marginBottom: 0, minWidth: 160 }}>
                  <label style={{ fontSize: 11 }}>Firma</label>
                  <select value={tFirma} onChange={(e) => setTFirma(e.target.value)}>
                    {db.navlunFirmalari.length ? (
                      db.navlunFirmalari.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.ad}
                        </option>
                      ))
                    ) : (
                      <option value="">Önce firma ekleyin</option>
                    )}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0, width: 120 }}>
                  <label style={{ fontSize: 11 }}>Sipariş Kodu</label>
                  <input placeholder="opsiyonel" value={tSiparisKodu} onChange={(e) => setTSiparisKodu(e.target.value)} />
                </div>
                <div className="field" style={{ marginBottom: 0, width: 100 }}>
                  <label style={{ fontSize: 11 }}>Fiyat</label>
                  <input inputMode="decimal" placeholder="0" value={tFiyat} onChange={(e) => setTFiyat(num(e.target.value))} />
                </div>
                <div className="field" style={{ marginBottom: 0, width: 90 }}>
                  <label style={{ fontSize: 11 }}>Para</label>
                  <select value={tPara} onChange={(e) => setTPara(e.target.value)}>
                    {PARA_KODLARI.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 140 }}>
                  <label style={{ fontSize: 11 }}>Not</label>
                  <input placeholder="opsiyonel" value={tNot} onChange={(e) => setTNot(e.target.value)} />
                </div>
                <button className="btn sm primary" onClick={addTeklif}>
                  <Icon name="plus" size={13} sw={2.4} />
                  Teklif Ekle
                </button>
              </div>
            )}

            {durum === 'toplama' && (
              <div style={{ marginTop: 10 }}>
                <button className="btn sm" disabled={!teklifler.length} onClick={sendOnaya}>
                  Dönemsel Anlaşmayı Onaya Gönder
                </button>
              </div>
            )}

            {durum === 'onayda' && (
              <>
                <div className="section-divider" style={{ marginTop: 18 }}>
                  Yönetim kararı (dönemsel anlaşma onayı)
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 8 }}>
                  {selId ? (
                    <>
                      Seçilen: <b>{navlunFirmName(db, teklifler.find((t) => t.id === selId)?.firmaId || '')}</b>
                    </>
                  ) : (
                    <span style={{ color: 'var(--amber)' }}>Henüz teklif seçilmedi — yukarıdan bir satırı işaretleyin.</span>
                  )}
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
                    <input type="date" value={kararTarih} onChange={(e) => setKararTarih(e.target.value)} />
                  </div>
                </div>
                <div className="field">
                  <label>Not / Gerekçe</label>
                  <textarea placeholder="Onay/red ile ilgili açıklama…" value={onayNot} onChange={(e) => setOnayNot(e.target.value)} />
                </div>
                <div className="field">
                  <label>Atandı (kişi / departman)</label>
                  <input placeholder="örn. Operasyon - Ahmet Yılmaz" value={atandi} onChange={(e) => setAtandi(e.target.value)} />
                  <div className="hint">Onaylanan taşıma kime/hangi departmana devredildi</div>
                </div>
                <div className="section-divider">Islak imzalı belge (opsiyonel)</div>
                <div id="fileZone">
                  {uploading ? (
                    <div className="dropzone">
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>Yükleniyor…</div>
                    </div>
                  ) : chip ? (
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
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>Islak imzalı anlaşmayı yükleyin</div>
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
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <button className="btn sm ghost" onClick={geriCek}>
                    Fiyat Toplamaya Geri Dön
                  </button>
                  <div style={{ flex: 1 }} />
                  <button className="btn sm danger" onClick={() => decide('reddedildi')}>
                    Reddet
                  </button>
                  <button className="btn sm green" onClick={() => decide('onaylandi')}>
                    <Icon name="check" size={14} sw={2.5} />
                    Onayla
                  </button>
                </div>
              </>
            )}

            {(durum === 'onaylandi' || durum === 'reddedildi') && r.onay ? (
              <div style={{ marginTop: 14, background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 8, padding: '11px 13px', fontSize: 12.5 }}>
                {r.onay.yonetici ? (
                  <div>
                    <b>Onaylayan:</b> {r.onay.yonetici}
                  </div>
                ) : null}
                {r.onay.tarih ? (
                  <div>
                    <b>Tarih:</b> {new Date(r.onay.tarih).toLocaleDateString('tr-TR')}
                  </div>
                ) : null}
                {r.onay.not ? (
                  <div>
                    <b>Not:</b> {r.onay.not}
                  </div>
                ) : null}
                {r.onay.atandi ? (
                  <div>
                    <b>Atandı:</b> {r.onay.atandi}
                  </div>
                ) : null}
                <button className="btn sm ghost" style={{ marginTop: 8 }} onClick={geriCek}>
                  Onaydan Geri Çek (revize et)
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="hint" style={{ marginTop: 4 }}>
            Firma teklifleri kıyaslama ve dönemsel onay, kayıt eklendikten sonra düzenleme ekranında kullanılabilir.
          </div>
        )}
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
