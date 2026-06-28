'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { money, fmt } from '@/lib/format';
import { toTRY, bestQuoteId } from '@/lib/calc';

export function Analiz() {
  const { db, openModal } = useStore();

  // Güzergah bazlı
  const routes: Record<string, { count: number; prices: number[] }> = {};
  db.talepler.forEach((t) => {
    const k = t.yuklemeNoktasi + ' → ' + t.teslimNoktasi;
    if (!routes[k]) routes[k] = { count: 0, prices: [] };
    routes[k].count++;
    const q = t.teklifler.find((q) => q.id === t.secilenTeklifId) || t.teklifler.find((q) => q.id === bestQuoteId(db, t));
    if (q) routes[k].prices.push(toTRY(db, q.fiyat, q.paraBirimi));
  });
  const rkeys = Object.keys(routes).sort((a, b) => routes[b].count - routes[a].count);

  // Firma performans
  const firms = db.firmalar
    .map((f) => {
      const qs: number[] = [];
      db.talepler.forEach((t) => t.teklifler.filter((q) => q.firmaId === f.id).forEach((q) => qs.push(toTRY(db, q.fiyat, q.paraBirimi))));
      const sec = db.talepler.filter((t) => {
        const q = t.teklifler.find((q) => q.id === t.secilenTeklifId);
        return q && q.firmaId === f.id;
      }).length;
      return { ad: f.ad, teklif: qs.length, sec, avg: qs.length ? qs.reduce((a, b) => a + b, 0) / qs.length : 0 };
    })
    .filter((f) => f.teklif > 0)
    .sort((a, b) => b.teklif - a.teklif);

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <h2>Güzergah fiyat geçmişi</h2>
          <div className="spacer" />
          <span className="tag">TRY karşılığı</span>
        </div>
        <div className="panel-body flush">
          {rkeys.length ? (
            <table>
              <thead>
                <tr>
                  <th>Güzergah</th>
                  <th>Talep</th>
                  <th>En Düşük</th>
                  <th>Ortalama</th>
                  <th>En Yüksek</th>
                </tr>
              </thead>
              <tbody>
                {rkeys.map((k) => {
                  const r = routes[k];
                  const p = r.prices;
                  return (
                    <tr key={k}>
                      <td className="cell-strong">{k}</td>
                      <td>
                        <span className="tag">{r.count}</span>
                      </td>
                      <td>{p.length ? money(Math.min(...p), 'TRY') : '—'}</td>
                      <td className="cell-strong">{p.length ? money(p.reduce((a, b) => a + b, 0) / p.length, 'TRY') : '—'}</td>
                      <td>{p.length ? money(Math.max(...p), 'TRY') : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty" style={{ padding: 34 }}>
              <p>Veri biriktikçe aynı güzergahın geçmiş fiyatları burada karşılaştırılır.</p>
            </div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Firma performansı</h2>
        </div>
        <div className="panel-body flush">
          {firms.length ? (
            <table>
              <thead>
                <tr>
                  <th>Firma</th>
                  <th>Verdiği Teklif</th>
                  <th>Seçildi/Onaylandı</th>
                  <th>Kazanma Oranı</th>
                  <th>Ort. Teklif (TRY)</th>
                </tr>
              </thead>
              <tbody>
                {firms.map((f) => (
                  <tr key={f.ad}>
                    <td className="cell-strong">{f.ad}</td>
                    <td>{f.teklif}</td>
                    <td>{f.sec}</td>
                    <td>{f.teklif ? <b style={{ color: 'var(--green)' }}>%{Math.round((f.sec / f.teklif) * 100)}</b> : '—'}</td>
                    <td>{money(f.avg, 'TRY')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty" style={{ padding: 34 }}>
              <p>Firmalar teklif verdikçe performansları burada görünür.</p>
            </div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Döviz kurları</h2>
          <div className="spacer" />
          <button className="btn sm" onClick={() => openModal({ type: 'kur' })}>
            Kurları Güncelle
          </button>
        </div>
        <div className="panel-body">
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>USD/TRY</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{fmt(db.kur.USD)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>EUR/TRY</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{fmt(db.kur.EUR)}</div>
            </div>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--faint)', marginTop: 12 }}>
            Karşılaştırmalarda farklı para birimindeki teklifler bu kurla TRY&apos;ye çevrilir. Manuel güncellersiniz.
          </p>
        </div>
      </div>
    </>
  );
}
