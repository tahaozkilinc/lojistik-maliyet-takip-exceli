'use client';
import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { money, dt, uid } from '@/lib/format';
import { toTRY, navlunFirmName } from '@/lib/calc';
import {
  TASIMA_MODLAR,
  TASIMA_MOD_RENK,
  tasimaBestQuoteId,
  tasimaGecmisi,
  tasimaEfektifFiyat,
  tasimaIndirimYuzde,
} from '@/lib/tasima';
import { PARA_KODLARI, KONTEYNER_TIPLERI } from '@/lib/constants';
import { StatusBadge } from '@/components/StatusBadge';
import { Icon } from '@/components/Icon';
import type { TasimaMod } from '@/lib/types';

interface AddForm {
  firmaId: string;
  fiyat: string;
  para: string;
  not: string;
  // Yalnızca deniz modunda kullanılır — firmalar konteyner tipine göre navlun +
  // lokal masrafı ayrı ayrı verdiği için bu iki alan ayrı toplanır.
  konteynerTipi: string;
  navlun: string;
  lokal: string;
}

const num = (v: string) => v.replace(',', '.').replace(/[^-0-9.]/g, '');

export function TasimaTalepDetail() {
  const { db, ui, go, openModal, mutate, toast } = useStore();
  const x = db.tasimaTalepleri.find((t) => t.id === ui.detailId);

  const mkForm = (para: string): AddForm => ({
    firmaId: db.navlunFirmalari[0]?.id || '',
    fiyat: '',
    para,
    not: '',
    konteynerTipi: KONTEYNER_TIPLERI[0],
    navlun: '',
    lokal: '',
  });
  const [forms, setForms] = useState<Record<TasimaMod, AddForm>>({
    deniz: mkForm('USD'),
    kara: mkForm('TRY'),
    hava: mkForm('USD'),
  });
  const [yonetici, setYonetici] = useState('');
  const [kararTarih, setKararTarih] = useState(new Date().toISOString().slice(0, 10));
  const [onayNot, setOnayNot] = useState('');

  if (!x) {
    return (
      <div className="empty" style={{ padding: 50 }}>
        <h3>Taşıma talebi bulunamadı</h3>
        <button className="btn" onClick={() => go('tasimaTalepleri')}>
          ← Taşıma Taleplerine Dön
        </button>
      </div>
    );
  }

  const editable = x.durum === 'toplama' || x.durum === 'onayda';
  const best = tasimaBestQuoteId(db, x);
  const canSend = x.durum === 'toplama' && x.teklifler.length > 0;

  function setForm(mod: TasimaMod, patch: Partial<AddForm>) {
    setForms((prev) => ({ ...prev, [mod]: { ...prev[mod], ...patch } }));
  }

  function addTeklif(mod: TasimaMod) {
    const f = forms[mod];
    if (!f.firmaId) {
      toast('Önce Navlun Firmaları bölümünden firma ekleyin', 'err');
      return;
    }
    if (mod === 'deniz') {
      const nv = parseFloat(f.navlun) || 0;
      const lk = parseFloat(f.lokal) || 0;
      const toplam = nv + lk;
      if (toplam <= 0) {
        toast('Navlun ve/veya lokal masraf girin', 'err');
        return;
      }
      mutate((d) => {
        const t = d.tasimaTalepleri.find((y) => y.id === x!.id);
        if (!t) return;
        t.teklifler.push({
          id: uid('ttk'),
          mod,
          firmaId: f.firmaId,
          fiyat: toplam,
          paraBirimi: f.para,
          notlar: f.not.trim(),
          konteynerTipi: f.konteynerTipi,
          navlunFiyat: nv || null,
          lokalFiyat: lk || null,
          createdAt: new Date().toISOString(),
        });
      });
      setForm(mod, { navlun: '', lokal: '', not: '' });
      toast('Fiyat eklendi', 'ok');
      return;
    }
    const fv = parseFloat(f.fiyat);
    if (!isFinite(fv) || fv <= 0) {
      toast('Geçerli bir fiyat girin', 'err');
      return;
    }
    mutate((d) => {
      const t = d.tasimaTalepleri.find((y) => y.id === x!.id);
      if (!t) return;
      t.teklifler.push({
        id: uid('ttk'),
        mod,
        firmaId: f.firmaId,
        fiyat: fv,
        paraBirimi: f.para,
        notlar: f.not.trim(),
        createdAt: new Date().toISOString(),
      });
    });
    setForm(mod, { fiyat: '', not: '' });
    toast('Fiyat eklendi', 'ok');
  }

  function removeTeklif(qid: string) {
    if (!confirm('Bu fiyat silinsin mi?')) return;
    mutate((d) => {
      const t = d.tasimaTalepleri.find((y) => y.id === x!.id);
      if (!t) return;
      t.teklifler = t.teklifler.filter((q) => q.id !== qid);
      if (t.secilenTeklifId === qid) t.secilenTeklifId = null;
    });
  }

  function setSel(qid: string) {
    mutate((d) => {
      const t = d.tasimaTalepleri.find((y) => y.id === x!.id);
      if (!t) return;
      t.secilenTeklifId = t.secilenTeklifId === qid ? null : qid;
    });
  }

  function sendToApproval() {
    mutate((d) => {
      const t = d.tasimaTalepleri.find((y) => y.id === x!.id);
      if (!t) return;
      t.durum = 'onayda';
      t.onay = { ...(t.onay || {}), gonderim: new Date().toISOString() };
    });
    toast('Talep onaya gönderildi — teklifi seçip onaylayabilirsiniz', 'ok');
  }

  function withdrawApproval() {
    if (!confirm('Talep onaydan geri çekilip "fiyat toplama" durumuna alınacak. Devam edilsin mi?')) return;
    mutate((d) => {
      const t = d.tasimaTalepleri.find((y) => y.id === x!.id);
      if (!t) return;
      t.durum = 'toplama';
      if (t.onay) t.onay.gonderim = null;
    });
    toast('Talep onaydan geri çekildi', 'ok');
  }

  function decide(karar: 'onaylandi' | 'reddedildi') {
    const yon = yonetici.trim();
    if (!yon) {
      toast('Onaylayan kişiyi girin', 'err');
      return;
    }
    if (karar === 'onaylandi' && !x!.secilenTeklifId) {
      toast('Onaylamadan önce bir fiyat seçin (satırdaki Seç işareti)', 'err');
      return;
    }
    mutate((d) => {
      const t = d.tasimaTalepleri.find((y) => y.id === x!.id);
      if (!t) return;
      t.durum = karar;
      t.onay = {
        ...(t.onay || {}),
        yonetici: yon,
        tarih: new Date(kararTarih || Date.now()).toISOString(),
        not: onayNot.trim(),
      };
    });
    toast(karar === 'onaylandi' ? 'Taşıma talebi onaylandı ✓' : 'Taşıma talebi reddedildi', karar === 'onaylandi' ? 'ok' : 'err');
  }

  const secilen = x.teklifler.find((q) => q.id === x.secilenTeklifId);
  const gecmis = tasimaGecmisi(db, x.kalkisYeri, x.varisYeri, x.id);
  const efektif = tasimaEfektifFiyat(db, x);
  const indirimPct = tasimaIndirimYuzde(db, x);

  function indirimSil() {
    if (x!.gerceklesen && !confirm('Gerçekleşen/indirimli fiyat kaldırılsın mı?')) return;
    mutate((d) => {
      const t = d.tasimaTalepleri.find((y) => y.id === x!.id);
      if (t) t.gerceklesen = null;
    });
    toast('İndirim kaldırıldı', 'ok');
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <button className="btn sm ghost" onClick={() => go('tasimaTalepleri')}>
          ← Taşıma Talepleri
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>{x.siparisNo || x.talepNo}</h2>
        <StatusBadge durum={x.durum} />
        <div style={{ flex: 1 }} />
        <button className="btn sm" onClick={() => openModal({ type: 'tasimaTalep', id: x.id })}>
          Düzenle
        </button>
        {canSend && (
          <button className="btn sm gold" onClick={sendToApproval}>
            <Icon name="send" size={14} />
            Onaya Gönder
          </button>
        )}
        {x.durum === 'onayda' && (
          <button className="btn sm danger" onClick={withdrawApproval}>
            <Icon name="back" size={14} />
            Onaydan Geri Çek
          </button>
        )}
      </div>

      <div className="route-box">
        <div className="pin">
          <div className="dot" />
          <div className="line" />
          <div className="dot end" />
        </div>
        <div className="places">
          <div>
            <div className="place-l">Kalkış</div>
            <div className="place">{x.kalkisYeri}</div>
          </div>
          <div>
            <div className="place-l">Varış</div>
            <div className="place">{x.varisYeri}</div>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right', fontSize: 12.5, color: 'var(--muted)' }}>
          {x.yukTipi ? (
            <div>
              <b>Yük:</b> {x.yukTipi}
            </div>
          ) : null}
          {x.tarih ? (
            <div>
              <b>Tarih:</b> {dt(x.tarih)}
            </div>
          ) : null}
          {x.yukSahibiFirma || x.tasiyiciFirma ? (
            <div>
              <b>Yük Sahibi Firma:</b> {x.yukSahibiFirma || x.tasiyiciFirma}
            </div>
          ) : null}
          {x.incoterm ? (
            <div>
              <b>Incoterms:</b> {x.incoterm}
            </div>
          ) : null}
        </div>
      </div>

      {x.notlar ? (
        <div className="hint" style={{ margin: '10px 0 0' }}>
          {x.notlar}
        </div>
      ) : null}

      {gecmis.length > 0 && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="panel-head">
            <h2>
              <Icon name="chart" size={15} /> Bu Güzergahta Geçmiş Taşımalar
            </h2>
            <div className="spacer" />
            <span className="tag">{gecmis.length} kayıt</span>
          </div>
          <div className="panel-body flush">
            <table>
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Mod</th>
                  <th>Firma</th>
                  <th style={{ textAlign: 'right' }}>Fiyat</th>
                  <th>Sipariş No</th>
                  <th>Durum</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {gecmis.map((g) => {
                  const eff = tasimaEfektifFiyat(db, g);
                  return (
                    <tr key={g.id} className="t-row-click" onClick={() => go('tasimaTalepDetay', g.id)}>
                      <td>{g.tarih ? dt(g.tarih) : '—'}</td>
                      <td>
                        {eff ? (
                          <span
                            style={{
                              display: 'inline-block',
                              background: TASIMA_MOD_RENK[eff.mod],
                              color: '#fff',
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '1px 8px',
                              borderRadius: 10,
                            }}
                          >
                            {TASIMA_MODLAR.find((m) => m.key === eff.mod)?.label}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{eff ? navlunFirmName(db, eff.firmaId) : '—'}</td>
                      <td className="cell-strong" style={{ textAlign: 'right' }}>
                        {eff ? (
                          <>
                            {money(eff.fiyat, eff.paraBirimi)}
                            {eff.indirimli && <span style={{ marginLeft: 5, fontSize: 10, color: 'var(--green)', fontWeight: 700 }}>İNDİRİMLİ</span>}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{g.siparisNo || '—'}</td>
                      <td>
                        <StatusBadge durum={g.durum} />
                      </td>
                      <td>
                        <button
                          className="btn sm ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            go('tasimaTalepDetay', g.id);
                          }}
                        >
                          Aç →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--faint)', borderTop: '1px solid var(--line-2)' }}>
              {(() => {
                const last = gecmis.find((g) => tasimaEfektifFiyat(db, g));
                const lastEff = last ? tasimaEfektifFiyat(db, last) : null;
                return lastEff && last
                  ? `En son ${dt(last.tarih || last.createdAt)} tarihinde ${navlunFirmName(db, lastEff.firmaId)} ile ${money(lastEff.fiyat, lastEff.paraBirimi)} bedelle taşınmış${lastEff.indirimli ? ' (indirimli fiyat)' : ''}.`
                  : 'Bu güzergahta henüz fiyatlandırılmış geçmiş kayıt yok.';
              })()}
            </div>
          </div>
        </div>
      )}

      <div className="stat-grid" style={{ margin: '16px 0 4px' }}>
        {TASIMA_MODLAR.map(({ key, label }, i) => {
          const qs = x.teklifler.filter((q) => q.mod === key);
          const bq = [...qs].sort((a, b) => toTRY(db, a.fiyat, a.paraBirimi) - toTRY(db, b.fiyat, b.paraBirimi))[0];
          return (
            <div key={key} className={'stat s' + (i + 1)}>
              <div className="k">
                En İyi {label} ({qs.length} teklif)
              </div>
              <div className="v" style={{ fontSize: 21, color: TASIMA_MOD_RENK[key] }}>
                {bq ? money(bq.fiyat, bq.paraBirimi) : '—'}
              </div>
              <div className="d">{bq ? navlunFirmName(db, bq.firmaId) : 'fiyat girilmedi'}</div>
            </div>
          );
        })}
        <div className="stat s4">
          <div className="k">Seçilen{efektif?.indirimli ? ' (indirimli)' : ''}</div>
          <div className="v" style={{ fontSize: 21, color: efektif?.indirimli ? 'var(--green)' : 'var(--gold)' }}>
            {efektif ? money(efektif.fiyat, efektif.paraBirimi) : '—'}
          </div>
          <div className="d">{efektif ? navlunFirmName(db, efektif.firmaId) : 'henüz seçilmedi'}</div>
        </div>
      </div>

      {x.secilenTeklifId && secilen && (
        <div
          style={{
            marginTop: 4,
            marginBottom: 16,
            padding: '14px 16px',
            border: '1px solid ' + (x.gerceklesen ? 'var(--green)' : 'var(--line)'),
            borderRadius: 10,
            background: x.gerceklesen ? 'rgba(34,160,90,.07)' : 'var(--surface-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>İndirim / Gerçekleşen Fiyat</div>
            <div style={{ flex: 1 }} />
            <button
              className={'btn sm ' + (x.gerceklesen ? '' : 'primary')}
              onClick={() => openModal({ type: 'tasimaIndirim', talepId: x.id })}
            >
              {x.gerceklesen ? 'Düzenle' : 'Fiyat Gir'}
            </button>
            {x.gerceklesen && (
              <button className="btn sm ghost" style={{ color: 'var(--red)' }} onClick={indirimSil}>
                Kaldır
              </button>
            )}
          </div>
          {x.gerceklesen && efektif ? (
            <>
              <div style={{ marginTop: 11, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--faint)' }}>Teklif</div>
                  <div style={{ textDecoration: 'line-through', color: 'var(--muted)' }}>
                    {money(secilen.fiyat, secilen.paraBirimi)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--faint)' }}>Gerçekleşen (indirimli)</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)' }}>
                    {money(efektif.fiyat, efektif.paraBirimi)}
                  </div>
                </div>
                {indirimPct != null ? (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--faint)' }}>İndirim</div>
                    <div style={{ fontWeight: 700, color: indirimPct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {indirimPct >= 0 ? '▼' : '▲'} {Math.abs(indirimPct).toFixed(1)}%
                    </div>
                  </div>
                ) : null}
                {x.gerceklesen.not ? (
                  <div style={{ flexBasis: '100%', fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', marginTop: 2 }}>
                    {x.gerceklesen.not}
                  </div>
                ) : null}
              </div>
              <div style={{ marginTop: 9, fontSize: 11.5, color: 'var(--faint)' }}>
                Bu fiyat, bu güzergahın bir sonraki &quot;geçmiş taşıma&quot; özetinde gerçekleşen tutar olarak baz alınır.
              </div>
            </>
          ) : (
            <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--muted)' }}>
              Firma görüşme sonrası indirim yaptıysa gerçekleşen toplam fiyatı girin — bu güzergahın geçmiş taşıma
              özetinde indirimli tutar olarak görünür.
            </div>
          )}
        </div>
      )}

      {TASIMA_MODLAR.map(({ key, label }) => {
        const qs = [...x.teklifler.filter((q) => q.mod === key)].sort(
          (a, b) => toTRY(db, a.fiyat, a.paraBirimi) - toTRY(db, b.fiyat, b.paraBirimi),
        );
        const f = forms[key];
        return (
          <div className="panel" key={key} style={{ marginTop: 16 }}>
            <div className="panel-head">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: TASIMA_MOD_RENK[key] }} />
                {label} Fiyatları
              </h2>
              <div className="spacer" />
              <span className="tag">{qs.length} teklif</span>
            </div>
            <div className="panel-body flush">
              {qs.length ? (
                <table>
                  <thead>
                    <tr>
                      {editable ? <th style={{ width: 42, textAlign: 'center' }}>Seç</th> : null}
                      <th>Firma</th>
                      {key === 'deniz' ? <th>Konteyner</th> : null}
                      {key === 'deniz' ? <th style={{ textAlign: 'right' }}>Navlun</th> : null}
                      {key === 'deniz' ? <th style={{ textAlign: 'right' }}>Lokal</th> : null}
                      <th style={{ textAlign: 'right' }}>{key === 'deniz' ? 'Toplam' : 'Fiyat'}</th>
                      <th style={{ textAlign: 'right' }}>TRY Karşılığı</th>
                      <th>Not</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {qs.map((q) => {
                      const isSel = q.id === x.secilenTeklifId;
                      const isBest = q.id === best;
                      return (
                        <tr key={q.id} style={isSel ? { background: 'var(--gold-soft)' } : undefined}>
                          {editable ? (
                            <td style={{ textAlign: 'center' }}>
                              <input type="radio" name="tt_sel" checked={isSel} onChange={() => setSel(q.id)} />
                            </td>
                          ) : null}
                          <td style={{ fontWeight: 600 }}>
                            {navlunFirmName(db, q.firmaId)}
                            {isBest ? (
                              <span
                                style={{
                                  marginLeft: 8,
                                  background: 'var(--green-bg)',
                                  color: 'var(--green)',
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: 10,
                                }}
                              >
                                En düşük
                              </span>
                            ) : null}
                            {isSel ? (
                              <span
                                style={{
                                  marginLeft: 6,
                                  background: 'var(--gold)',
                                  color: 'var(--navy)',
                                  fontSize: 10.5,
                                  fontWeight: 800,
                                  padding: '2px 8px',
                                  borderRadius: 10,
                                }}
                              >
                                SEÇİLDİ
                              </span>
                            ) : null}
                          </td>
                          {key === 'deniz' ? <td>{q.konteynerTipi || '—'}</td> : null}
                          {key === 'deniz' ? (
                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                              {q.navlunFiyat != null ? money(q.navlunFiyat, q.paraBirimi) : '—'}
                            </td>
                          ) : null}
                          {key === 'deniz' ? (
                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                              {q.lokalFiyat != null ? money(q.lokalFiyat, q.paraBirimi) : '—'}
                            </td>
                          ) : null}
                          <td style={{ textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>{money(q.fiyat, q.paraBirimi)}</td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap', color: 'var(--muted)' }}>
                            {money(toTRY(db, q.fiyat, q.paraBirimi), 'TRY')}
                          </td>
                          <td>{q.notlar || ''}</td>
                          <td style={{ textAlign: 'right' }}>
                            {editable ? (
                              <button className="btn sm ghost" style={{ color: 'var(--red)' }} onClick={() => removeTeklif(q.id)}>
                                ×
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '14px 16px', color: 'var(--faint)', fontSize: 13 }}>
                  Henüz {label.toLowerCase()} fiyatı girilmedi.
                </div>
              )}

              {editable && (
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                    alignItems: 'flex-end',
                    margin: 12,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                    padding: 10,
                  }}
                >
                  <div className="field" style={{ marginBottom: 0, minWidth: 170 }}>
                    <label style={{ fontSize: 11 }}>Firma (Navlun Firmaları)</label>
                    <select value={f.firmaId} onChange={(e) => setForm(key, { firmaId: e.target.value })}>
                      {db.navlunFirmalari.length ? (
                        db.navlunFirmalari.map((nf) => (
                          <option key={nf.id} value={nf.id}>
                            {nf.ad}
                          </option>
                        ))
                      ) : (
                        <option value="">Önce firma ekleyin</option>
                      )}
                    </select>
                  </div>
                  {key === 'deniz' ? (
                    <div className="field" style={{ marginBottom: 0, minWidth: 130 }}>
                      <label style={{ fontSize: 11 }}>Konteyner Tipi</label>
                      <select value={f.konteynerTipi} onChange={(e) => setForm(key, { konteynerTipi: e.target.value })}>
                        {KONTEYNER_TIPLERI.map((k) => (
                          <option key={k}>{k}</option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  {key === 'deniz' ? (
                    <div className="field" style={{ marginBottom: 0, width: 100 }}>
                      <label style={{ fontSize: 11 }}>Navlun</label>
                      <input inputMode="decimal" placeholder="0" value={f.navlun} onChange={(e) => setForm(key, { navlun: num(e.target.value) })} />
                    </div>
                  ) : null}
                  {key === 'deniz' ? (
                    <div className="field" style={{ marginBottom: 0, width: 100 }}>
                      <label style={{ fontSize: 11 }}>Lokal</label>
                      <input inputMode="decimal" placeholder="0" value={f.lokal} onChange={(e) => setForm(key, { lokal: num(e.target.value) })} />
                    </div>
                  ) : null}
                  {key !== 'deniz' ? (
                    <div className="field" style={{ marginBottom: 0, width: 110 }}>
                      <label style={{ fontSize: 11 }}>Fiyat</label>
                      <input inputMode="decimal" placeholder="0" value={f.fiyat} onChange={(e) => setForm(key, { fiyat: num(e.target.value) })} />
                    </div>
                  ) : null}
                  <div className="field" style={{ marginBottom: 0, width: 90 }}>
                    <label style={{ fontSize: 11 }}>Para</label>
                    <select value={f.para} onChange={(e) => setForm(key, { para: e.target.value })}>
                      {PARA_KODLARI.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 140 }}>
                    <label style={{ fontSize: 11 }}>Not</label>
                    <input placeholder="opsiyonel" value={f.not} onChange={(e) => setForm(key, { not: e.target.value })} />
                  </div>
                  <button className="btn sm primary" onClick={() => addTeklif(key)}>
                    <Icon name="plus" size={13} sw={2.4} />
                    Fiyat Ekle
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {!db.navlunFirmalari.length && (
        <div className="hint" style={{ marginTop: 10 }}>
          Fiyat girebilmek için önce{' '}
          <a style={{ cursor: 'pointer', fontWeight: 600 }} onClick={() => go('navlunFirmalar')}>
            Navlun Firmaları
          </a>{' '}
          bölümünden firma ekleyin.
        </div>
      )}

      {x.durum === 'onayda' && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="panel-head">
            <h2>Yönetim Kararı</h2>
          </div>
          <div className="panel-body">
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 8 }}>
              {efektif ? (
                <>
                  Seçilen: <b>{navlunFirmName(db, efektif.firmaId)}</b> · <b>{money(efektif.fiyat, efektif.paraBirimi)}</b>{' '}
                  ({TASIMA_MODLAR.find((m) => m.key === efektif.mod)?.label}
                  {efektif.indirimli ? ' · indirimli' : ''})
                </>
              ) : (
                <span style={{ color: 'var(--amber)' }}>Henüz fiyat seçilmedi — yukarıdaki tablolardan bir satırı işaretleyin.</span>
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
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }} />
              <button className="btn danger" onClick={() => decide('reddedildi')}>
                Reddet
              </button>
              <button className="btn green" onClick={() => decide('onaylandi')}>
                <Icon name="check" size={15} sw={2.5} />
                Onayla
              </button>
            </div>
          </div>
        </div>
      )}

      {(x.durum === 'onaylandi' || x.durum === 'reddedildi') && x.onay ? (
        <div
          style={{
            marginTop: 16,
            background: 'var(--surface-2)',
            border: '1px solid var(--line)',
            borderRadius: 8,
            padding: '12px 14px',
            fontSize: 12.5,
          }}
        >
          {x.onay.yonetici ? (
            <div>
              <b>Onaylayan:</b> {x.onay.yonetici}
            </div>
          ) : null}
          {x.onay.tarih ? (
            <div>
              <b>Tarih:</b> {new Date(x.onay.tarih).toLocaleDateString('tr-TR')}
            </div>
          ) : null}
          {x.onay.not ? (
            <div>
              <b>Not:</b> {x.onay.not}
            </div>
          ) : null}
          <button className="btn sm ghost" style={{ marginTop: 8 }} onClick={withdrawApproval}>
            Onaydan Geri Çek (revize et)
          </button>
        </div>
      ) : null}
    </>
  );
}
