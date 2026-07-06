'use client';
import React, { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { money, dt } from '@/lib/format';
import { qTotal, bestQuoteId, firmName, navlunFirmName } from '@/lib/calc';
import { tasimaEfektifFiyat } from '@/lib/tasima';
import { Icon } from '@/components/Icon';

interface Akaryakit {
  benzin: number;
  motorin: number;
  tarih?: string;
}

export function Dashboard() {
  const { db, go, openModal } = useStore();
  const [akaryakit, setAkaryakit] = useState<Akaryakit | null>(null);

  // Fiyatlar her sabah 08:30'da GitHub Actions tarafından Petrol Ofisi'nden
  // çekilip siteyle birlikte yayınlanan akaryakit.json'a yazılır.
  useEffect(() => {
    let alive = true;
    fetch('./akaryakit.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d && typeof d.benzin === 'number' && typeof d.motorin === 'number') setAkaryakit(d);
      })
      .catch(() => {
        /* dosya yoksa kartlar "—" gösterir */
      });
    return () => {
      alive = false;
    };
  }, []);

  const bekleyen = db.talepler.filter((x) => x.durum === 'onayda');
  const bekleyenTasima = db.tasimaTalepleri.filter((x) => x.durum === 'onayda');

  return (
    <>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        <div className="stat s1">
          <div className="k">Petrol Ofisi Benzin Fiyatı</div>
          <div className="v" style={{ fontSize: 26 }}>
            {akaryakit ? money(akaryakit.benzin, 'TRY') + '/lt' : '—'}
          </div>
          <div className="d">Adana · V/Max Kurşunsuz 95{akaryakit?.tarih ? ' · ' + dt(akaryakit.tarih) : ''}</div>
        </div>
        <div className="stat s4">
          <div className="k">Petrol Ofisi Dizel Fiyatı</div>
          <div className="v" style={{ fontSize: 26, color: 'var(--gold)' }}>
            {akaryakit ? money(akaryakit.motorin, 'TRY') + '/lt' : '—'}
          </div>
          <div className="d">Adana · V/Max Diesel{akaryakit?.tarih ? ' · ' + dt(akaryakit.tarih) : ''}</div>
        </div>
      </div>

      {bekleyen.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <h2>Onay bekleyen nakliye talepleri</h2>
            <div className="spacer" />
            <button className="btn sm" onClick={() => go('onaylar')}>
              Onay Merkezi →
            </button>
          </div>
          <div className="panel-body flush">
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
                          İncele &amp; Onayla
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {bekleyenTasima.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <h2>Onay bekleyen taşıma talepleri</h2>
            <div className="spacer" />
            <button className="btn sm" onClick={() => go('tasimaTalepleri')}>
              Taşıma Talepleri →
            </button>
          </div>
          <div className="panel-body flush">
            <table>
              <thead>
                <tr>
                  <th>Sipariş No</th>
                  <th>Güzergah</th>
                  <th>Firma</th>
                  <th>Fiyat</th>
                  <th>Tarih</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bekleyenTasima.map((x) => {
                  const eff = tasimaEfektifFiyat(db, x);
                  return (
                    <tr key={x.id} className="t-row-click" onClick={() => go('tasimaTalepDetay', x.id)}>
                      <td className="cell-strong">{x.siparisNo || x.talepNo}</td>
                      <td>
                        {x.kalkisYeri} → {x.varisYeri}
                      </td>
                      <td>{eff ? navlunFirmName(db, eff.firmaId) : '—'}</td>
                      <td className="cell-strong">{eff ? money(eff.fiyat, eff.paraBirimi) : '—'}</td>
                      <td>{x.tarih ? dt(x.tarih) : '—'}</td>
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
          </div>
        </div>
      )}

      {!bekleyen.length && !bekleyenTasima.length && (
        <div className="empty" style={{ padding: 44 }}>
          <Icon name="onaylar" size={44} sw={1.5} />
          <h3>Onay bekleyen talep yok</h3>
          <p>Talep onaya gönderildiğinde burada listelenir.</p>
        </div>
      )}
    </>
  );
}
