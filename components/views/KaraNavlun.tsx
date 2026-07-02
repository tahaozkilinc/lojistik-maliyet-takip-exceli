'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { money, donemLabel } from '@/lib/format';
import { karaNavlunYillar, karaNavlunHatlar, karaNavlunFiltered, karaNavlunAyData, karaDominantCur } from '@/lib/karaNavlun';
import { navlunDelta } from '@/lib/navlun';
import { AYLAR } from '@/lib/constants';
import { Icon } from '@/components/Icon';
import { StatusBadge } from '@/components/StatusBadge';
import { KaraNavlunChart } from './KaraNavlunChart';

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

export function KaraNavlun() {
  const { db, ui, setUi, openModal, mutate, toast } = useStore();

  function delKaraNavlun(id: string) {
    if (!confirm('Bu kara navlun kaydı silinsin mi?')) return;
    mutate((d) => {
      d.karaNavlun = d.karaNavlun.filter((x) => x.id !== id);
    });
    toast('Kayıt silindi', 'ok');
  }

  if (!db.karaNavlun.length) {
    return (
      <div className="empty" style={{ padding: '60px 24px' }}>
        <Icon name="truck" size={46} sw={1.6} style={{ color: 'var(--navy-3)', opacity: 0.5 }} />
        <h3 style={{ marginTop: 14 }}>Henüz kara navlun kaydı yok</h3>
        <p>Ara sıra yaptığınız kara nakliyesi fiyatlarını buraya girin; sistem aylık ve yıllık olarak takip etsin.</p>
        <button className="btn primary" style={{ marginTop: 14 }} onClick={() => openModal({ type: 'karaNavlun' })}>
          <Icon name="plus" size={16} sw={2.4} />
          İlk Kara Navlun Kaydını Ekle
        </button>
      </div>
    );
  }

  const yil = ui.karaNavlunYil;
  const hat = ui.karaNavlunHat;
  const yillar = karaNavlunYillar(db);
  const hatlar = karaNavlunHatlar(db);
  const filtered = karaNavlunFiltered(db, yil, hat);
  const cur = karaDominantCur(filtered.length ? filtered : db.karaNavlun);
  const months = karaNavlunAyData(db, yil, hat);
  const vAll = months.map((m) => m.fiyat).filter((v): v is number => v != null);
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const lastRec = [...filtered].sort(
    (a, b) => (b.donem || '').localeCompare(a.donem || '') || new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
  )[0];

  let prev: number | null = null;
  const rows = months.map((m, i) => {
    const d = navlunDelta(m.fiyat, prev);
    if (m.fiyat != null) prev = m.fiyat;
    const bos = m.fiyat == null;
    return (
      <tr key={i} style={bos ? { opacity: 0.45 } : undefined}>
        <td className="cell-strong">{AYLAR[i]}</td>
        <td style={{ textAlign: 'right' }}>{m.fiyat != null ? money(m.fiyat, cur) : '—'}</td>
        <td>
          <DeltaCell d={d} />
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
          <select value={yil} onChange={(e) => setUi({ karaNavlunYil: +e.target.value })}>
            {yillar.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0, minWidth: 200 }}>
          <label style={{ fontSize: 11 }}>Hat / Güzergah</label>
          <select value={hat} onChange={(e) => setUi({ karaNavlunHat: e.target.value })}>
            <option value="__all">Tümü (ortalama)</option>
            {hatlar.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn primary" onClick={() => openModal({ type: 'karaNavlun' })}>
          <Icon name="plus" size={15} sw={2.4} />
          Yeni Kara Navlun Kaydı
        </button>
      </div>

      <div className="stat-grid" style={{ marginBottom: 20, gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="stat s1">
          <div className="k">Ortalama ({yil})</div>
          <div className="v" style={{ fontSize: 23 }}>
            {avg(vAll) != null ? money(avg(vAll)!, cur) : '—'}
          </div>
          <div className="d">{vAll.length} aylık veri</div>
        </div>
        <div className="stat s3">
          <div className="k">Aralık ({yil})</div>
          <div className="v" style={{ fontSize: 17 }}>
            {vAll.length ? money(Math.min(...vAll), cur) + ' – ' + money(Math.max(...vAll), cur) : '—'}
          </div>
          <div className="d">en düşük – en yüksek</div>
        </div>
        <div className="stat s2">
          <div className="k">Son Kayıt</div>
          <div className="v" style={{ fontSize: 17 }}>
            {lastRec && lastRec.fiyat != null ? money(lastRec.fiyat, lastRec.paraBirimi || 'TRY') : '—'}
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
          <KaraNavlunChart months={months} cur={cur} />
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
                <th style={{ textAlign: 'right' }}>Fiyat ({cur})</th>
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
          <button className="btn sm" onClick={() => openModal({ type: 'karaNavlun' })}>
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
                  <th>Araç Tipi</th>
                  <th style={{ textAlign: 'right' }}>Fiyat</th>
                  <th>Durum</th>
                  <th>Not</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recList.map((r) => (
                  <tr key={r.id}>
                    <td className="cell-strong">{donemLabel(r.donem)}</td>
                    <td>{r.hat || '—'}</td>
                    <td>{r.tasiyici || '—'}</td>
                    <td>{r.siparisNo || '—'}</td>
                    <td>{r.aracTipi || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {r.fiyat != null ? money(r.fiyat, r.paraBirimi || 'TRY') + (r.birim ? ' / ' + r.birim : '') : '—'}
                    </td>
                    <td>{r.durum ? <StatusBadge durum={r.durum} /> : '—'}</td>
                    <td>{r.notlar ? r.notlar : ''}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn sm ghost" onClick={() => openModal({ type: 'karaNavlun', id: r.id })}>
                        ✎
                      </button>{' '}
                      <button className="btn sm ghost" style={{ color: 'var(--red)' }} onClick={() => delKaraNavlun(r.id)}>
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
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
