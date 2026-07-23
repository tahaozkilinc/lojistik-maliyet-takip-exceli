'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { money, donemLabel } from '@/lib/format';
import { navlunYillar, navlunHatlar, navlunFiltered, navlunAyData, dominantCur, navlunDelta, effectiveNavlunFiyat } from '@/lib/navlun';
import { AYLAR } from '@/lib/constants';
import { Icon } from '@/components/Icon';
import { StatusBadge } from '@/components/StatusBadge';
import { NavlunChart } from './NavlunChart';

function DeltaCell({ d }: { d: number | null }) {
  if (d == null) return <span style={{ color: 'var(--faint)' }}>—</span>;
  const up = d > 0;
  const flat = Math.abs(d) < 0.05;
  if (flat) return <span style={{ color: 'var(--faint)' }}>0%</span>;
  return (
    <span style={{ color: up ? 'var(--red)' : 'var(--green)', fontWeight: 600, fontSize: 12 }}>
      {up ? '▲' : '▼'} {Math.abs(d).toFixed(1)}%
    </span>
  );
}

export function DenizNavlun() {
  const { db, ui, setUi, openModal, mutate, toast } = useStore();

  function delNavlun(id: string) {
    if (!confirm('Bu navlun kaydı silinsin mi?')) return;
    mutate((d) => {
      d.denizNavlun = d.denizNavlun.filter((x) => x.id !== id);
    });
    toast('Kayıt silindi', 'ok');
  }

  if (!db.denizNavlun.length) {
    return (
      <div className="empty" style={{ padding: '60px 24px' }}>
        <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} style={{ color: 'var(--navy-3)', opacity: 0.5 }}>
          <path d="M2 20a6 6 0 0 0 10 0 6 6 0 0 0 10 0" />
          <path d="M4 18l-2-6h20l-2 6" />
          <path d="M12 12V4M8 6h8" />
        </svg>
        <h3 style={{ marginTop: 14 }}>Henüz deniz navlun kaydı yok</h3>
        <p>
          Her ayın 15&apos;inde aldığınız <b>20′</b> ve <b>40′</b> konteyner navlunlarını buraya girin; sistem aylık ve yıllık olarak takip etsin.
        </p>
        <button className="btn primary" style={{ marginTop: 14 }} onClick={() => openModal({ type: 'navlun' })}>
          <Icon name="plus" size={16} sw={2.4} />
          İlk Navlun Kaydını Ekle
        </button>
      </div>
    );
  }

  const yil = ui.navlunYil;
  const hat = ui.navlunHat;
  const yillar = navlunYillar(db);
  const hatlar = navlunHatlar(db);
  const filtered = navlunFiltered(db, yil, hat);
  const cur = dominantCur(filtered.length ? filtered : db.denizNavlun);
  const months = navlunAyData(db, yil, hat);
  const v20 = months.map((m) => m.c20).filter((v): v is number => v != null);
  const v40 = months.map((m) => m.c40).filter((v): v is number => v != null);
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const lastRec = [...filtered].sort(
    (a, b) => (b.donem || '').localeCompare(a.donem || '') || new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
  )[0];

  let prev20: number | null = null;
  let prev40: number | null = null;
  const rows = months.map((m, i) => {
    const d20 = navlunDelta(m.c20, prev20);
    const d40 = navlunDelta(m.c40, prev40);
    if (m.c20 != null) prev20 = m.c20;
    if (m.c40 != null) prev40 = m.c40;
    const bos = m.c20 == null && m.c40 == null;
    return (
      <tr key={i} style={bos ? { opacity: 0.45 } : undefined}>
        <td className="cell-strong">{AYLAR[i]}</td>
        <td style={{ textAlign: 'right' }}>{m.c20 != null ? money(m.c20, cur) : '—'}</td>
        <td>
          <DeltaCell d={d20} />
        </td>
        <td style={{ textAlign: 'right' }}>{m.c40 != null ? money(m.c40, cur) : '—'}</td>
        <td>
          <DeltaCell d={d40} />
        </td>
        <td style={{ textAlign: 'center' }}>{m.count ? <span className="tag">{m.count}</span> : null}</td>
      </tr>
    );
  });

  const recList = [...filtered].sort((a, b) => (b.donem || '').localeCompare(a.donem || ''));

  return (
    <>
      <div className="filter-bar" style={{ marginBottom: 18 }}>
        <div className="field" style={{ marginBottom: 0, minWidth: 120 }}>
          <label style={{ fontSize: 11 }}>Yıl</label>
          <select value={yil} onChange={(e) => setUi({ navlunYil: +e.target.value })}>
            {yillar.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0, minWidth: 200 }}>
          <label style={{ fontSize: 11 }}>Hat / Güzergah</label>
          <select value={hat} onChange={(e) => setUi({ navlunHat: e.target.value })}>
            <option value="__all">Tümü (ortalama)</option>
            {hatlar.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn primary" onClick={() => openModal({ type: 'navlun' })}>
          <Icon name="plus" size={15} sw={2.4} />
          Yeni Navlun Kaydı
        </button>
      </div>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat s1">
          <div className="k">20′ Ortalama ({yil})</div>
          <div className="v" style={{ fontSize: 23 }}>
            {avg(v20) != null ? money(avg(v20)!, cur) : '—'}
          </div>
          <div className="d">{v20.length} aylık veri</div>
        </div>
        <div className="stat s4">
          <div className="k">40′ Ortalama ({yil})</div>
          <div className="v" style={{ fontSize: 23, color: 'var(--gold)' }}>
            {avg(v40) != null ? money(avg(v40)!, cur) : '—'}
          </div>
          <div className="d">{v40.length} aylık veri</div>
        </div>
        <div className="stat s3">
          <div className="k">20′ Aralık ({yil})</div>
          <div className="v" style={{ fontSize: 17 }}>
            {v20.length ? money(Math.min(...v20), cur) + ' – ' + money(Math.max(...v20), cur) : '—'}
          </div>
          <div className="d">en düşük – en yüksek</div>
        </div>
        <div className="stat s2">
          <div className="k">Son Kayıt</div>
          <div className="v" style={{ fontSize: 17 }}>
            {(() => {
              if (!lastRec) return '—';
              const eff = effectiveNavlunFiyat(db, lastRec);
              const v = eff.c40 != null ? eff.c40 : eff.c20;
              return v != null ? money(v, eff.paraBirimi) : '—';
            })()}
          </div>
          <div className="d">{lastRec ? donemLabel(lastRec.donem) + (lastRec.hat ? ' · ' + lastRec.hat : '') : '—'}</div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <h2>
            {yil} Yıllık Seyir {hat !== '__all' ? '· ' + hat : ''}
          </h2>
          <div className="spacer" />
          <span style={{ fontSize: 12, color: 'var(--faint)' }}>Para birimi: {cur}</span>
        </div>
        <div className="panel-body">
          <NavlunChart months={months} cur={cur} />
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <h2>Aylık Tablo ({yil})</h2>
          <div className="spacer" />
          <span style={{ fontSize: 12, color: 'var(--faint)' }}>Δ = bir önceki veriye göre değişim</span>
        </div>
        <div className="panel-body flush">
          <table>
            <thead>
              <tr>
                <th>Ay</th>
                <th style={{ textAlign: 'right' }}>20′ ({cur})</th>
                <th>Δ</th>
                <th style={{ textAlign: 'right' }}>40′ ({cur})</th>
                <th>Δ</th>
                <th style={{ textAlign: 'center' }}>Kayıt</th>
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>
            Kayıtlar ({yil}
            {hat !== '__all' ? ' · ' + hat : ''})
          </h2>
          <div className="spacer" />
          <button className="btn sm" onClick={() => openModal({ type: 'navlun' })}>
            + Kayıt
          </button>
        </div>
        <div className="panel-body flush">
          {recList.length ? (
            <table>
              <thead>
                <tr>
                  <th>Dönem</th>
                  <th>Hat</th>
                  <th>Taşıyıcı</th>
                  <th>Sipariş No</th>
                  <th style={{ textAlign: 'right' }}>20′</th>
                  <th style={{ textAlign: 'right' }}>40′</th>
                  <th style={{ textAlign: 'right' }}>Transit</th>
                  <th>Durum</th>
                  <th>Not</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recList.map((r) => {
                  const eff = effectiveNavlunFiyat(db, r);
                  return (
                  <tr key={r.id}>
                    <td className="cell-strong">{donemLabel(r.donem)}</td>
                    <td>{r.hat || '—'}</td>
                    <td>{r.tasiyici || '—'}</td>
                    <td>{r.siparisNo || '—'}</td>
                    <td style={{ textAlign: 'right' }}>{eff.c20 != null ? money(eff.c20, eff.paraBirimi) : '—'}</td>
                    <td style={{ textAlign: 'right' }}>{eff.c40 != null ? money(eff.c40, eff.paraBirimi) : '—'}</td>
                    <td style={{ textAlign: 'right' }}>{r.transitSuresi != null ? r.transitSuresi + ' gün' : '—'}</td>
                    <td>{r.durum ? <StatusBadge durum={r.durum} /> : '—'}</td>
                    <td>{r.notlar ? r.notlar : ''}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn sm ghost" onClick={() => openModal({ type: 'navlun', id: r.id })}>
                        ✎
                      </button>{' '}
                      <button className="btn sm ghost" style={{ color: 'var(--red)' }} onClick={() => delNavlun(r.id)}>
                        ×
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty" style={{ padding: 30 }}>
              Bu filtre için kayıt yok.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
