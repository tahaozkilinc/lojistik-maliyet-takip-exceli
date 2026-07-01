'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { money, dt } from '@/lib/format';
import { toTRY } from '@/lib/calc';
import { TIP_RENK } from '@/lib/constants';
import { Icon } from '@/components/Icon';

const DURUM_RENK: Record<string, string> = {
  devam: '#2563eb',
  tamamlandi: '#16a34a',
  iptal: '#dc2626',
};
const DURUM_LABEL: Record<string, string> = {
  devam: 'Devam Ediyor',
  tamamlandi: 'Tamamlandı',
  iptal: 'İptal',
};

export function LimanTalepleri() {
  const { db, ui, setUi, go, openModal } = useStore();

  const limanlar = db.lokasyonlar.filter((l) => l.tip === 'Liman');

  if (!db.limanTalepleri.length && !limanlar.length) {
    return (
      <div className="empty">
        <Icon name="ship" size={46} sw={1.5} />
        <h3>Liman masraf kaydı yok</h3>
        <p>
          Önce Lokasyonlar bölümünden <b>Liman</b> tipinde bir lokasyon ekleyin; ardından buradan liman operasyonu oluşturarak her sefer için masraf
          kalemlerini girin.
        </p>
        <button className="btn primary" onClick={() => go('lokasyonlar')}>
          Lokasyonlara Git
        </button>
      </div>
    );
  }

  if (!db.limanTalepleri.length) {
    return (
      <div className="empty">
        <Icon name="ship" size={46} sw={1.5} />
        <h3>Henüz liman masraf kaydı yok</h3>
        <p>Her gemi seferi veya liman operasyonu için bir kayıt oluşturun; ardından THC, ardiye, acente gibi masraf kalemlerini ekleyin.</p>
        <button className="btn primary" onClick={() => openModal({ type: 'limanTalep' })}>
          + İlk Kaydı Oluştur
        </button>
      </div>
    );
  }

  const limanFilter = ui.lokFilter === 'all' ? null : ui.lokFilter;
  const list = [...db.limanTalepleri]
    .filter((lt) => !limanFilter || lt.limanId === limanFilter)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  function goDetay(id: string) {
    setUi({ limanTalepId: id });
    go('limanTalepDetay');
  }

  const toplamTRY = (lt: (typeof db.limanTalepleri)[0]) =>
    (lt.masraflar || []).reduce((s, m) => s + toTRY(db, m.fiyat, m.paraBirimi), 0);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <div className="filter-bar" style={{ flex: 1 }}>
          <button className={'chip-filter ' + (ui.lokFilter === 'all' ? 'on' : '')} onClick={() => setUi({ lokFilter: 'all' })}>
            Tümü <span className="c">{db.limanTalepleri.length}</span>
          </button>
          {limanlar.map((l) => {
            const cnt = db.limanTalepleri.filter((lt) => lt.limanId === l.id).length;
            return (
              <button
                key={l.id}
                className={'chip-filter ' + (ui.lokFilter === l.id ? 'on' : '')}
                onClick={() => setUi({ lokFilter: l.id })}
              >
                <span
                  style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: TIP_RENK['Liman'] || '#2563eb', marginRight: 5 }}
                />
                {l.ad}
                <span className="c">{cnt}</span>
              </button>
            );
          })}
        </div>
        <button className="btn primary" onClick={() => openModal({ type: 'limanTalep' })}>
          <Icon name="plus" size={13} sw={2.4} />
          Yeni Kayıt
        </button>
      </div>

      {!list.length ? (
        <div className="empty" style={{ padding: 40 }}>
          <h3>Bu filtrede kayıt yok</h3>
          <p>Farklı bir liman seçin ya da filtreyi &quot;Tümü&quot; yapın.</p>
        </div>
      ) : (
        <div className="panel">
          <div className="panel-body flush">
            <table>
              <thead>
                <tr>
                  <th>Talep No</th>
                  <th>Liman</th>
                  <th>Gemi / Sefer</th>
                  <th>Tarih</th>
                  <th style={{ textAlign: 'center' }}>Masraf</th>
                  <th style={{ textAlign: 'right' }}>Toplam (₺)</th>
                  <th style={{ textAlign: 'center' }}>Durum</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((lt) => {
                  const liman = db.lokasyonlar.find((l) => l.id === lt.limanId);
                  const toplam = toplamTRY(lt);
                  const durumRenk = DURUM_RENK[lt.durum] || '#64748b';
                  return (
                    <tr key={lt.id} style={{ cursor: 'pointer' }} onClick={() => goDetay(lt.id)}>
                      <td className="cell-strong">{lt.talepNo}</td>
                      <td>{liman?.ad || '—'}</td>
                      <td style={{ fontSize: 12.5 }}>
                        {lt.gemiAdi || '—'}
                        {lt.seferNo ? <span style={{ color: 'var(--faint)', fontSize: 11 }}> · {lt.seferNo}</span> : null}
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: 12 }}>{lt.createdAt ? dt(lt.createdAt) : '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="tag">{(lt.masraflar || []).length}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>
                        {toplam ? money(toplam, 'TRY') : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: durumRenk,
                            background: durumRenk + '18',
                            border: '1px solid ' + durumRenk + '44',
                            padding: '2px 9px',
                            borderRadius: 10,
                          }}
                        >
                          {DURUM_LABEL[lt.durum] || lt.durum}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn sm ghost"
                          onClick={(e) => { e.stopPropagation(); openModal({ type: 'limanTalep', id: lt.id }); }}
                        >
                          ✎
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
    </>
  );
}
