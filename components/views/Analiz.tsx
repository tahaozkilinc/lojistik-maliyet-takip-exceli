'use client';
import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { money, fmt, dt } from '@/lib/format';
import { toTRY, bestQuoteId, firmName, lokasyonStats, findAnlasmalar } from '@/lib/calc';
import { StatusBadge } from '@/components/StatusBadge';

export function Analiz() {
  const { db, openModal, go } = useStore();
  const [yukSel, setYukSel] = useState('__all');
  const [tesSel, setTesSel] = useState('__all');
  const lokalar = [...db.lokasyonlar].sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));

  // Kullanıcının seçtiği belirli güzergah (yükleme + teslim lokasyonu).
  const seciliGuzergah = yukSel !== '__all' && tesSel !== '__all';
  const guzergahStats = seciliGuzergah ? lokasyonStats(db, yukSel, tesSel) : null;
  // Bu güzergahta geçmiş fiyat yoksa/azsa gösterilecek anlaşmalı fiyatlar.
  const guzergahAnlasmalar = seciliGuzergah ? findAnlasmalar(db, yukSel, tesSel) : [];
  const guzergahTalepler = seciliGuzergah
    ? [...db.talepler]
        .filter((t) => t.yuklemeLokasyonId === yukSel && t.teslimLokasyonId === tesSel)
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    : [];

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
          <h2>Güzergah bazlı analiz</h2>
          <div className="spacer" />
          {seciliGuzergah && (
            <button
              className="btn sm ghost"
              onClick={() => {
                setYukSel('__all');
                setTesSel('__all');
              }}
            >
              Temizle
            </button>
          )}
        </div>
        <div className="panel-body">
          <div className="grid-2">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Çıkış (Yükleme) Yeri</label>
              <select value={yukSel} onChange={(e) => setYukSel(e.target.value)}>
                <option value="__all">Tümü</option>
                {lokalar.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.ad}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Varış (Teslim) Yeri</label>
              <select value={tesSel} onChange={(e) => setTesSel(e.target.value)}>
                <option value="__all">Tümü</option>
                {lokalar.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.ad}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {seciliGuzergah && guzergahAnlasmalar.length > 0 && (
            <div
              style={{
                marginTop: 16,
                background: 'var(--surface-2)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                padding: '11px 13px',
                fontSize: 12.5,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--amber)' }}>
                {guzergahStats && guzergahStats.fiyatli
                  ? 'Bu güzergah için sistemde anlaşmalı fiyat(lar) da var'
                  : 'Bu güzergahta geçmiş fiyat yok — sistemde kayıtlı anlaşmalı fiyat bulundu'}
              </div>
              {guzergahAnlasmalar.map((a) => (
                <div
                  key={a.anlasma.id || a.firma.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}
                >
                  <span className="tag" style={{ background: 'var(--gold-soft)', borderColor: 'var(--gold)', color: 'var(--amber)' }}>
                    ANLAŞMALI
                  </span>
                  <b>{a.firma.ad}</b>
                  <b>{money(a.anlasma.birimFiyat, a.anlasma.paraBirimi)}</b>
                  {a.anlasma.yukTipi ? (
                    <span style={{ color: 'var(--muted)' }}>· {a.anlasma.yukTipi}</span>
                  ) : (
                    <span style={{ color: 'var(--faint)' }}>· tüm ürünler</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {seciliGuzergah ? (
            guzergahStats && guzergahStats.sefer ? (
              <>
                <div className="stat-grid" style={{ marginTop: 16 }}>
                  <div className="stat s1">
                    <div className="k">Sefer Sayısı</div>
                    <div className="v" style={{ fontSize: 21 }}>{guzergahStats.sefer}</div>
                    <div className="d">{guzergahStats.fiyatli} fiyatlı</div>
                  </div>
                  <div className="stat s3">
                    <div className="k">En Düşük</div>
                    <div className="v" style={{ fontSize: 21 }}>{guzergahStats.fiyatli ? money(guzergahStats.min, 'TRY') : '—'}</div>
                  </div>
                  <div className="stat s4">
                    <div className="k">Ortalama</div>
                    <div className="v" style={{ fontSize: 21, color: 'var(--gold)' }}>
                      {guzergahStats.fiyatli ? money(guzergahStats.avg, 'TRY') : '—'}
                    </div>
                  </div>
                  <div className="stat s2">
                    <div className="k">En Yüksek</div>
                    <div className="v" style={{ fontSize: 21 }}>{guzergahStats.fiyatli ? money(guzergahStats.max, 'TRY') : '—'}</div>
                  </div>
                </div>
                <table style={{ marginTop: 16 }}>
                  <thead>
                    <tr>
                      <th>Talep No</th>
                      <th>Tarih</th>
                      <th>Firma</th>
                      <th style={{ textAlign: 'right' }}>Fiyat (TRY)</th>
                      <th>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guzergahTalepler.map((t) => {
                      const q = t.teklifler.find((q) => q.id === t.secilenTeklifId) || t.teklifler.find((q) => q.id === bestQuoteId(db, t));
                      return (
                        <tr key={t.id} className="t-row-click" onClick={() => go('detail', t.id)}>
                          <td className="cell-strong">{t.talepNo}</td>
                          <td>{dt(t.yuklemeTarihi || t.createdAt)}</td>
                          <td>{q ? firmName(db, q.firmaId) : '—'}</td>
                          <td style={{ textAlign: 'right' }} className="cell-strong">
                            {q ? money(toTRY(db, q.fiyat, q.paraBirimi), 'TRY') : '—'}
                          </td>
                          <td>
                            <StatusBadge durum={t.durum} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            ) : (
              <div className="empty" style={{ padding: 30 }}>
                <p>Bu güzergahta (seçilen çıkış → varış) henüz talep yok.</p>
              </div>
            )
          ) : (
            <div className="hint" style={{ marginTop: 10 }}>
              Belirli bir güzergahın geçmişini görmek için yukarıdan çıkış ve varış yerini seçin. Seçim yapılmazsa
              aşağıda tüm güzergahlar listelenir.
            </div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Tüm güzergahların fiyat geçmişi</h2>
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
