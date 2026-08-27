'use client';
import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { money, fmtTon, dt } from '@/lib/format';
import { firmName, efektifFiyat, efektifTotalTRY } from '@/lib/calc';
import type { Talep } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { Icon } from '@/components/Icon';
import { EmptyTalep } from './EmptyTalep';

export function Talepler() {
  const { db, ui, setUi, go, openModal, toast, mutate, talepSel, setTalepSel } = useStore();

  // Sayfaya her girişte varsayılan olarak "Fiyat toplanıyor" filtresini aç.
  useEffect(() => {
    setUi({ talepFilter: 'toplama' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = ui.search.toLowerCase().trim();
  function visibleTalepler(): Talep[] {
    let list = [...db.talepler].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    );
    if (ui.talepFilter !== 'all') list = list.filter((x) => x.durum === ui.talepFilter);
    if (q)
      list = list.filter(
        (x) =>
          (x.talepNo + x.yuklemeNoktasi + x.teslimNoktasi + (x.yukTipi || '')).toLowerCase().includes(q) ||
          x.teklifler.some((t) => firmName(db, t.firmaId).toLowerCase().includes(q)),
      );
    return list;
  }
  const [showAll, setShowAll] = useState(false);
  const list = visibleTalepler();
  const shown = list.slice(0, showAll ? list.length : 10);

  // Görünen listedeki taleplerin nihai (indirim varsa indirimli) tutarları toplamı (TRY).
  const toplamTutar = list.reduce((sum, x) => sum + efektifTotalTRY(db, x), 0);

  const cnt = (d: string) => db.talepler.filter((x) => d === 'all' || x.durum === d).length;
  const nSel = [...talepSel].filter((id) => {
    const t = db.talepler.find((x) => x.id === id);
    return t && t.durum === 'toplama';
  }).length;
  const toplamaTot = list.filter((t) => t.durum === 'toplama').length;

  function toggleSel(id: string, ck: boolean) {
    const next = new Set(talepSel);
    if (ck) next.add(id);
    else next.delete(id);
    setTalepSel(next);
  }
  function toggleSelAll(ck: boolean) {
    const ids = list.filter((t) => t.durum === 'toplama').map((t) => t.id);
    const next = new Set(talepSel);
    if (ck) ids.forEach((i) => next.add(i));
    else ids.forEach((i) => next.delete(i));
    setTalepSel(next);
  }

  function bulkSendToApproval() {
    const sendable: Talep[] = [];
    const noQuote: Talep[] = [];
    [...talepSel].forEach((id) => {
      const t = db.talepler.find((x) => x.id === id);
      if (!t || t.durum !== 'toplama') return;
      if (t.teklifler.length > 0) sendable.push(t);
      else noQuote.push(t);
    });
    if (!sendable.length) {
      toast(
        noQuote.length
          ? 'Seçilen taleplerde teklif yok — önce teklif ekleyin'
          : 'Onaya gönderilecek uygun talep yok',
        'err',
      );
      return;
    }
    const msg =
      `${sendable.length} talep onaya gönderilecek.` +
      (noQuote.length ? ` ${noQuote.length} talepte teklif olmadığından atlanacak.` : '') +
      '\nTedarikçi seçimi Onaylar ekranından yapılacak. Devam edilsin mi?';
    if (!confirm(msg)) return;
    let n = 0;
    mutate((d) => {
      sendable.forEach((st) => {
        const t = d.talepler.find((x) => x.id === st.id)!;
        t.durum = 'onayda';
        t.onay = { ...(t.onay || {}), gonderim: new Date().toISOString() };
        n++;
      });
    });
    setTalepSel(new Set());
    go('onaylar');
    toast(n + ' talep onaya gönderildi', 'ok');
  }

  const chips: [string, string][] = [
    ['toplama', 'Fiyat toplanıyor'],
    ['onayda', 'Onay bekleyen'],
    ['onaylandi', 'Onaylanan'],
    ['reddedildi', 'Reddedilen'],
    ['all', 'Tümü'],
  ];

  return (
    <>
      <div className="filter-bar">
        {chips.map(([k, l]) => (
          <button
            key={k}
            className={'chip-filter ' + (ui.talepFilter === k ? 'on' : '')}
            onClick={() => setUi({ talepFilter: k })}
          >
            {l}
            <span className="c">{cnt(k)}</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {nSel > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span className="tag" style={{ background: 'var(--navy)', color: '#fff', borderColor: 'var(--navy)' }}>
              <b>{nSel}</b> seçili
            </span>
            <button className="btn sm ghost" onClick={() => setTalepSel(new Set())}>
              Temizle
            </button>
            <button className="btn sm primary" onClick={bulkSendToApproval}>
              <Icon name="send" size={13} />
              Seçilenleri Onaya Gönder
            </button>
          </div>
        )}
      </div>
      <div className="panel">
        {list.length > 0 && (
          <div className="panel-head" style={{ borderBottom: '1px solid var(--line-2)', padding: '10px 18px', gap: 18 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              <b style={{ color: 'var(--text)', fontSize: 15 }}>{list.length}</b> talep
            </span>
            {toplamTutar > 0 && (
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                Toplam tahmini tutar{' '}
                <b style={{ color: 'var(--navy-3)', fontSize: 15 }}>{money(toplamTutar, 'TRY')}</b>
              </span>
            )}
            <div className="spacer" />
            {list.length > 10 && (
              <span style={{ fontSize: 12, color: 'var(--faint)' }}>
                {showAll ? list.length : 10}/{list.length} gösteriliyor
              </span>
            )}
          </div>
        )}
        <div className="panel-body flush">
          {list.length ? (
            <>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 36, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        title="Fiyat toplanan tümünü seç"
                        checked={nSel > 0 && nSel >= toplamaTot && toplamaTot > 0}
                        onChange={(e) => toggleSelAll(e.target.checked)}
                      />
                    </th>
                    <th>Talep No</th>
                    <th>Güzergah</th>
                    <th>Yük / Araç</th>
                    <th>Yükleme</th>
                    <th>Teklif</th>
                    <th>En İyi (birim)</th>
                    <th>Durum</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((x) => {
                    const eff = efektifFiyat(db, x);
                    const canSel = x.durum === 'toplama';
                    return (
                      <tr key={x.id} className="t-row-click" onClick={() => go('detail', x.id)}>
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          {canSel && (
                            <input
                              type="checkbox"
                              checked={talepSel.has(x.id)}
                              title={x.teklifler.length ? undefined : 'Teklif yok'}
                              onChange={(e) => toggleSel(x.id, e.target.checked)}
                            />
                          )}
                        </td>
                        <td className="cell-strong">{x.talepNo}</td>
                        <td>
                          <div className="cell-strong">
                            {x.yuklemeNoktasi} → {x.teslimNoktasi}
                          </div>
                        </td>
                        <td>
                          {x.yukTipi || '—'}
                          <div className="cell-sub">
                            {x.aracTipi || ''}
                            {x.miktar ? ' · ' + fmtTon(x.miktar) + ' ' + (x.birim || '') : ''}
                          </div>
                        </td>
                        <td>{dt(x.yuklemeTarihi)}</td>
                        <td>
                          <span className="tag">{x.teklifler.length}</span>
                        </td>
                        <td className="cell-strong">
                          {eff ? (
                            <>
                              {money(eff.birimFiyat, eff.paraBirimi)}
                              <span style={{ color: 'var(--faint)', fontWeight: 400 }}>/{x.birim || 'ton'}</span>
                              {eff.indirimli && (
                                <span style={{ marginLeft: 5, fontSize: 10, color: 'var(--green)', fontWeight: 700 }}>İNDİRİMLİ</span>
                              )}
                              <div className="cell-sub">{firmName(db, eff.firmaId)}</div>
                            </>
                          ) : (
                            <span style={{ color: 'var(--faint)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <StatusBadge durum={x.durum} />
                        </td>
                        <td>
                          <button
                            className="btn sm ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              go('detail', x.id);
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
              {!showAll && list.length > 10 && (
                <div style={{ padding: '12px 16px', textAlign: 'center', borderTop: '1px solid var(--line-2)' }}>
                  <button className="btn sm ghost" onClick={() => setShowAll(true)}>
                    Tümünü Göster ({list.length} talep)
                  </button>
                </div>
              )}
              {showAll && list.length > 10 && (
                <div style={{ padding: '12px 16px', textAlign: 'center', borderTop: '1px solid var(--line-2)' }}>
                  <button className="btn sm ghost" onClick={() => setShowAll(false)}>
                    Daralt (ilk 10)
                  </button>
                </div>
              )}
              {toplamaTot > 0 && (
                <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--faint)', borderTop: '1px solid var(--line-2)' }}>
                  Soldaki kutucuklardan birden çok talebi seçip <b>Seçilenleri Onaya Gönder</b> ile topluca onaya
                  gönderebilirsiniz. (Yalnızca teklifi olan, fiyat toplanan talepler gönderilir.)
                </div>
              )}
            </>
          ) : db.talepler.length ? (
            <div className="empty" style={{ padding: 40 }}>
              <h3>Bu filtrede/aramada talep bulunamadı</h3>
              <p>Verileriniz kaybolmadı — yalnızca aktif filtre veya arama kutusu hiçbir talebe uymuyor.</p>
              <button className="btn" onClick={() => setUi({ talepFilter: 'all', search: '' })}>
                Filtreyi ve Aramayı Temizle
              </button>
            </div>
          ) : (
            <EmptyTalep onNew={() => openModal({ type: 'talep' })} />
          )}
        </div>
      </div>
    </>
  );
}
