'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { money, fmt, fmtTon, dt } from '@/lib/format';
import { qTotal, bestQuoteId, firmName } from '@/lib/calc';
import { StatusBadge } from '@/components/StatusBadge';
import { Icon } from '@/components/Icon';
import { EmptyTalep } from './EmptyTalep';

export function Dashboard() {
  const { db, go, openModal } = useStore();
  const T = db.talepler;
  const toplama = T.filter((x) => x.durum === 'toplama').length;
  const onayda = T.filter((x) => x.durum === 'onayda').length;
  const onaylandi = T.filter((x) => x.durum === 'onaylandi').length;

  let onayTutar = 0;
  T.filter((x) => x.durum === 'onaylandi').forEach((x) => {
    const q = x.teklifler.find((q) => q.id === x.secilenTeklifId);
    if (q) onayTutar += qTotal(db, q, x);
  });

  const son = [...T].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 6);
  const bekleyen = T.filter((x) => x.durum === 'onayda');

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          flexWrap: 'wrap',
          marginBottom: 14,
          fontSize: 13.5,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ color: 'var(--muted)' }}>Motorin (Adana):</span>
          <b style={{ fontSize: 16 }}>{db.kur.motorin ? money(db.kur.motorin, 'TRY') + '/lt' : '—'}</b>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ color: 'var(--muted)' }}>Brent Petrol:</span>
          <b style={{ fontSize: 16 }}>{db.kur.brent ? money(db.kur.brent, 'USD') + '/varil' : '—'}</b>
        </div>
        <button className="btn sm ghost" onClick={() => openModal({ type: 'kur' })}>
          Güncelle
        </button>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="stat s1">
          <div className="k">Fiyat Toplanıyor</div>
          <div className="v">{toplama}</div>
          <div className="d">aktif talep</div>
        </div>
        <div className="stat s2">
          <div className="k">Onay Bekleyen</div>
          <div className="v">{onayda}</div>
          <div className="d">yönetim onayında</div>
        </div>
        <div className="stat s3">
          <div className="k">Onaylanan Tutar</div>
          <div className="v" style={{ fontSize: 23 }}>
            {money(onayTutar, 'TRY')}
          </div>
          <div className="d">{onaylandi} onaylı talep</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Onay bekleyenler</h2>
          <div className="spacer" />
          {bekleyen.length > 0 && (
            <button className="btn sm" onClick={() => go('onaylar')}>
              Onay Merkezi →
            </button>
          )}
        </div>
        <div className="panel-body flush">
          {bekleyen.length ? (
            <table>
              <thead>
                <tr>
                  <th>Talep No</th>
                  <th>Güzergah</th>
                  <th>Önerilen Firma</th>
                  <th>Toplam Tutar</th>
                  <th>Tarih</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bekleyen.map((x) => {
                  const q =
                    x.teklifler.find((q) => q.id === x.secilenTeklifId) ||
                    x.teklifler.find((q) => q.id === bestQuoteId(db, x));
                  return (
                    <tr key={x.id} className="t-row-click" onClick={() => go('detail', x.id)}>
                      <td className="cell-strong">{x.talepNo}</td>
                      <td>
                        {x.yuklemeNoktasi} → {x.teslimNoktasi}
                      </td>
                      <td>{q ? firmName(db, q.firmaId) : '—'}</td>
                      <td className="cell-strong">{q ? money(qTotal(db, q, x), 'TRY') : '—'}</td>
                      <td>{dt(x.createdAt)}</td>
                      <td>
                        <button
                          className="btn sm primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal({ type: 'onay', id: x.id });
                          }}
                        >
                          İncele & Onayla
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty">
              <Icon name="onaylar" size={46} sw={1.5} />
              <h3>Onay sırası boş</h3>
              <p>Fiyatları topladıktan sonra talebi onaya gönderdiğinizde burada listelenir.</p>
            </div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Son talepler</h2>
          <div className="spacer" />
          <button className="btn sm" onClick={() => go('talepler')}>
            Tümü →
          </button>
        </div>
        <div className="panel-body flush">
          {son.length ? (
            <table>
              <thead>
                <tr>
                  <th>Talep No</th>
                  <th>Güzergah</th>
                  <th>Yük</th>
                  <th>Teklif</th>
                  <th>En İyi (birim)</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {son.map((x) => {
                  const bq = x.teklifler.find((q) => q.id === bestQuoteId(db, x));
                  return (
                    <tr key={x.id} className="t-row-click" onClick={() => go('detail', x.id)}>
                      <td className="cell-strong">{x.talepNo}</td>
                      <td>
                        {x.yuklemeNoktasi} → {x.teslimNoktasi}
                      </td>
                      <td>
                        <span className="cell-sub">
                          {x.yukTipi || '—'}
                          {x.miktar ? ' · ' + fmtTon(x.miktar) + ' ' + (x.birim || '') : ''}
                        </span>
                      </td>
                      <td>
                        <span className="tag">{x.teklifler.length} teklif</span>
                      </td>
                      <td className="cell-strong">
                        {bq ? (
                          <>
                            {money(bq.fiyat, bq.paraBirimi)}
                            <span style={{ color: 'var(--faint)', fontWeight: 400 }}>/{x.birim || 'ton'}</span>
                          </>
                        ) : (
                          <span style={{ color: 'var(--faint)' }}>bekleniyor</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge durum={x.durum} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <EmptyTalep onNew={() => openModal({ type: 'talep' })} />
          )}
        </div>
      </div>
    </>
  );
}
