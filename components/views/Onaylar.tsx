'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { money, dt } from '@/lib/format';
import { qTotal, bestQuoteId, firmName, navlunFirmName } from '@/lib/calc';
import { tasimaEfektifFiyat, TASIMA_MODLAR, TASIMA_MOD_RENK } from '@/lib/tasima';
import { openSignedFile } from '@/lib/export';
import { StatusBadge } from '@/components/StatusBadge';
import { Icon } from '@/components/Icon';

export function Onaylar() {
  const { db, ui, go, openModal, toast, setPrintJob, bulkSel, setBulkSel } = useStore();
  const q = ui.search.toLowerCase().trim();
  function matchQ(x: { talepNo: string; yuklemeNoktasi: string; teslimNoktasi: string; yukTipi?: string; teklifler: { firmaId: string }[] }) {
    if (!q) return true;
    return (
      (x.talepNo + x.yuklemeNoktasi + x.teslimNoktasi + (x.yukTipi || '')).toLowerCase().includes(q) ||
      x.teklifler.some((t) => firmName(db, t.firmaId).toLowerCase().includes(q))
    );
  }
  const onayda = db.talepler.filter((x) => x.durum === 'onayda' && matchQ(x));
  const tasimaOnayda = db.tasimaTalepleri.filter(
    (x) =>
      x.durum === 'onayda' &&
      (!q ||
        (x.talepNo + (x.siparisNo || '') + x.kalkisYeri + x.varisYeri + (x.yukTipi || '') + (x.yukSahibiFirma || x.tasiyiciFirma || ''))
          .toLowerCase()
          .includes(q) ||
        x.teklifler.some((tk) => navlunFirmName(db, tk.firmaId).toLowerCase().includes(q))),
  );
  const gecmis = db.talepler
    .filter((x) => (x.durum === 'onaylandi' || x.durum === 'reddedildi') && matchQ(x))
    .sort((a, b) => new Date((b.onay && b.onay.tarih) || 0).getTime() - new Date((a.onay && a.onay.tarih) || 0).getTime());

  const validIds = new Set(onayda.map((x) => x.id));
  const nSel = [...bulkSel].filter((i) => validIds.has(i)).length;

  function toggle(id: string, ck: boolean) {
    const next = new Set(bulkSel);
    if (ck) next.add(id);
    else next.delete(id);
    setBulkSel(next);
  }
  function toggleAll(ck: boolean) {
    const next = new Set(bulkSel);
    if (ck) onayda.forEach((x) => next.add(x.id));
    else onayda.forEach((x) => next.delete(x.id));
    setBulkSel(next);
  }
  function printCombined() {
    const ids = onayda.filter((x) => bulkSel.has(x.id)).map((x) => x.id);
    if (!ids.length) {
      toast('Önce onay bekleyenlerden talep seçin', 'err');
      return;
    }
    setPrintJob({ type: 'combined', ids });
  }

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <h2>Onay bekleyen talepler</h2>
          <div className="spacer" />
          {nSel > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginRight: 10 }}>
              <span className="tag" style={{ background: 'var(--navy)', color: '#fff', borderColor: 'var(--navy)' }}>
                <b>{nSel}</b> seçili
              </span>
              <button className="btn sm ghost" onClick={() => setBulkSel(new Set())}>
                Temizle
              </button>
              <button className="btn sm primary" onClick={printCombined}>
                <Icon name="print" size={13} />
                Toplu Onay Formu
              </button>
            </div>
          )}
          <span className="tag">{onayda.length} adet</span>
        </div>
        <div className="panel-body flush">
          {onayda.length ? (
            <>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 36, textAlign: 'center' }}>
                      <input type="checkbox" checked={nSel > 0 && nSel === onayda.length} onChange={(e) => toggleAll(e.target.checked)} />
                    </th>
                    <th>Talep No</th>
                    <th>Güzergah</th>
                    <th>Önerilen Firma</th>
                    <th>Toplam Tutar</th>
                    <th>Teklif</th>
                    <th>Gönderim</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {onayda.map((x) => {
                    const q =
                      x.teklifler.find((q) => q.id === x.secilenTeklifId) || x.teklifler.find((q) => q.id === bestQuoteId(db, x));
                    return (
                      <tr key={x.id} className="t-row-click" onClick={() => go('detail', x.id)}>
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={bulkSel.has(x.id)} onChange={(e) => toggle(x.id, e.target.checked)} />
                        </td>
                        <td className="cell-strong">{x.talepNo}</td>
                        <td>
                          {x.yuklemeNoktasi} → {x.teslimNoktasi}
                        </td>
                        <td>{q ? firmName(db, q.firmaId) : '—'}</td>
                        <td className="cell-strong">{q ? money(qTotal(db, q, x), 'TRY') : '—'}</td>
                        <td>
                          <span className="tag">{x.teklifler.length} teklif</span>
                        </td>
                        <td>{x.onay && x.onay.gonderim ? dt(x.onay.gonderim) : '—'}</td>
                        <td style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            className="btn sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPrintJob({ type: 'single', id: x.id });
                            }}
                          >
                            Rapor
                          </button>
                          <button
                            className="btn sm primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              openModal({ type: 'onay', id: x.id });
                            }}
                          >
                            Revize / Seç &amp; Onay
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--faint)', borderTop: '1px solid var(--line-2)' }}>
                Birden fazla talebi seçip <b>Toplu Onay Formu</b> ile tek sayfada, kaşe &amp; imza alanıyla yazdırabilirsiniz.
              </div>
            </>
          ) : (
            <div className="empty" style={{ padding: 40 }}>
              <Icon name="onaylar" size={44} sw={1.5} />
              <h3>Onay sırası boş</h3>
              <p>Talep detayından &quot;Onaya Gönder&quot; dediğinizde buraya düşer.</p>
            </div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Onay bekleyen taşıma talepleri</h2>
          <div className="spacer" />
          <span className="tag">{tasimaOnayda.length} adet</span>
        </div>
        <div className="panel-body flush">
          {tasimaOnayda.length ? (
            <table>
              <thead>
                <tr>
                  <th>Sipariş No</th>
                  <th>Güzergah</th>
                  <th>Önerilen Firma</th>
                  <th>Fiyat</th>
                  <th>Mod</th>
                  <th>Gönderim</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tasimaOnayda.map((x) => {
                  const eff = tasimaEfektifFiyat(db, x);
                  return (
                    <tr key={x.id} className="t-row-click" onClick={() => go('tasimaTalepDetay', x.id)}>
                      <td className="cell-strong">{x.siparisNo || x.talepNo}</td>
                      <td>
                        {x.kalkisYeri} → {x.varisYeri}
                      </td>
                      <td>{eff ? navlunFirmName(db, eff.firmaId) : '—'}</td>
                      <td className="cell-strong">{eff ? money(eff.fiyat, eff.paraBirimi) : '—'}</td>
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
                      <td>{x.onay && x.onay.gonderim ? dt(x.onay.gonderim) : '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn sm primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal({ type: 'tasimaOnay', id: x.id });
                          }}
                        >
                          Revize / Seç &amp; Onay
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty" style={{ padding: 30 }}>
              <p>Onay bekleyen taşıma talebi yok. Taşıma talebi detayından &quot;Onaya Gönder&quot; dediğinizde buraya düşer.</p>
            </div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Onay geçmişi &amp; ıslak imza arşivi</h2>
        </div>
        <div className="panel-body flush">
          {gecmis.length ? (
            <table>
              <thead>
                <tr>
                  <th>Talep No</th>
                  <th>Güzergah</th>
                  <th>Firma</th>
                  <th>Tutar</th>
                  <th>Karar</th>
                  <th>Onaylayan</th>
                  <th>Tarih</th>
                  <th>Belge</th>
                </tr>
              </thead>
              <tbody>
                {gecmis.map((x) => {
                  const q = x.teklifler.find((q) => q.id === x.secilenTeklifId);
                  return (
                    <tr key={x.id} className="t-row-click" onClick={() => go('detail', x.id)}>
                      <td className="cell-strong">{x.talepNo}</td>
                      <td>
                        {x.yuklemeNoktasi} → {x.teslimNoktasi}
                      </td>
                      <td>{q ? firmName(db, q.firmaId) : '—'}</td>
                      <td className="cell-strong">{q ? money(q.fiyat, q.paraBirimi) : '—'}</td>
                      <td>
                        <StatusBadge durum={x.durum} />
                      </td>
                      <td>{x.onay && x.onay.yonetici ? x.onay.yonetici : '—'}</td>
                      <td>{x.onay && x.onay.tarih ? dt(x.onay.tarih) : '—'}</td>
                      <td>
                        {x.onay && x.onay.imzaliBelge ? (
                          <button
                            className="btn sm ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!openSignedFile(x.onay!.imzaliBelge)) toast('Belge görüntülenemiyor', 'err');
                            }}
                          >
                            📎 Göster
                          </button>
                        ) : (
                          <span style={{ color: 'var(--faint)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty" style={{ padding: 34 }}>
              <p>Henüz onaylanmış / reddedilmiş talep yok.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
