'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { money, dt } from '@/lib/format';
import { navlunFirmName } from '@/lib/calc';
import { tasimaBestQuoteId, tasimaModLabel, TASIMA_MOD_RENK } from '@/lib/tasima';
import { StatusBadge } from '@/components/StatusBadge';
import { Icon } from '@/components/Icon';

export function TasimaTalepleri() {
  const { db, ui, setUi, go, openModal } = useStore();

  const q = ui.search.toLowerCase().trim();
  let list = [...db.tasimaTalepleri].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
  );
  if (ui.tasimaFilter !== 'all') list = list.filter((x) => x.durum === ui.tasimaFilter);
  if (q)
    list = list.filter(
      (x) =>
        (x.talepNo + x.kalkisYeri + x.varisYeri + (x.yukTipi || '') + (x.siparisNo || '') + (x.tasiyiciFirma || ''))
          .toLowerCase()
          .includes(q) ||
        x.teklifler.some((t) => navlunFirmName(db, t.firmaId).toLowerCase().includes(q)),
    );

  const cnt = (d: string) => db.tasimaTalepleri.filter((x) => d === 'all' || x.durum === d).length;
  const chips: [string, string][] = [
    ['all', 'Tümü'],
    ['toplama', 'Fiyat toplanıyor'],
    ['onayda', 'Onay bekleyen'],
    ['onaylandi', 'Onaylanan'],
    ['reddedildi', 'Reddedilen'],
  ];

  if (!db.tasimaTalepleri.length) {
    return (
      <div className="empty">
        <Icon name="send" size={46} sw={1.5} />
        <h3>Henüz taşıma talebi yok</h3>
        <p>
          Bir güzergah için taşıma talebi açın; içine <b>Deniz</b>, <b>Kara</b> ve <b>Hava</b> bölümlerinde navlun
          firmalarından aldığınız fiyatları girin, karşılaştırıp onaylayın.
        </p>
        <button className="btn primary" onClick={() => openModal({ type: 'tasimaTalep' })}>
          + İlk Taşıma Talebini Aç
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="filter-bar">
        {chips.map(([k, l]) => (
          <button
            key={k}
            className={'chip-filter ' + (ui.tasimaFilter === k ? 'on' : '')}
            onClick={() => setUi({ tasimaFilter: k })}
          >
            {l}
            <span className="c">{cnt(k)}</span>
          </button>
        ))}
      </div>
      <div className="panel">
        <div className="panel-body flush">
          {list.length ? (
            <table>
              <thead>
                <tr>
                  <th>Sipariş No</th>
                  <th>Güzergah</th>
                  <th>Yük</th>
                  <th>Tarih</th>
                  <th>Taşıyıcı</th>
                  <th>Teklif</th>
                  <th>En İyi</th>
                  <th>Durum</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((x) => {
                  const bq = x.teklifler.find((t) => t.id === tasimaBestQuoteId(db, x));
                  return (
                    <tr key={x.id} className="t-row-click" onClick={() => go('tasimaTalepDetay', x.id)}>
                      <td className="cell-strong">{x.siparisNo || x.talepNo}</td>
                      <td>
                        <div className="cell-strong">
                          {x.kalkisYeri} → {x.varisYeri}
                        </div>
                      </td>
                      <td>{x.yukTipi || '—'}</td>
                      <td>{x.tarih ? dt(x.tarih) : '—'}</td>
                      <td>{x.tasiyiciFirma || '—'}</td>
                      <td>
                        <span className="tag">{x.teklifler.length}</span>
                      </td>
                      <td className="cell-strong">
                        {bq ? (
                          <>
                            {money(bq.fiyat, bq.paraBirimi)}{' '}
                            <span
                              style={{
                                display: 'inline-block',
                                background: TASIMA_MOD_RENK[bq.mod],
                                color: '#fff',
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '1px 8px',
                                borderRadius: 10,
                                verticalAlign: 1,
                              }}
                            >
                              {tasimaModLabel(bq.mod)}
                            </span>
                          </>
                        ) : (
                          <span style={{ color: 'var(--faint)' }}>—</span>
                        )}
                      </td>
                      <td>{x.siparisNo || '—'}</td>
                      <td>
                        <StatusBadge durum={x.durum} />
                      </td>
                      <td>
                        <button
                          className="btn sm ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            go('tasimaTalepDetay', x.id);
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
          ) : (
            <div className="empty" style={{ padding: 40 }}>
              <h3>Bu filtrede/aramada taşıma talebi bulunamadı</h3>
              <p>Verileriniz kaybolmadı — yalnızca aktif filtre veya arama kutusu hiçbir talebe uymuyor.</p>
              <button className="btn" onClick={() => setUi({ tasimaFilter: 'all', search: '' })}>
                Filtreyi ve Aramayı Temizle
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
