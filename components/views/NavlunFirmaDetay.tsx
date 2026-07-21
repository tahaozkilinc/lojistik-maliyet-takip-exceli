'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { money, dt, initials } from '@/lib/format';
import { navlunFirmaTeklifleri } from '@/lib/calc';
import { StatusBadge } from '@/components/StatusBadge';
import { Icon } from '@/components/Icon';

function Stat({ n, l, color }: { n: number; l: string; color?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 23, fontWeight: 800, color }}>{n}</div>
      <div style={{ fontSize: 10.5, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.4px' }}>{l}</div>
    </div>
  );
}

export function NavlunFirmaDetay() {
  const { db, ui, go, openModal, mutate, toast } = useStore();
  const f = db.navlunFirmalari.find((x) => x.id === ui.navlunFirmaId);

  if (!f) {
    return (
      <>
        <button className="btn sm ghost" onClick={() => go('navlunFirmalar')}>
          ← Navlun Firmaları
        </button>
        <div className="empty" style={{ marginTop: 18 }}>
          <h3>Firma bulunamadı</h3>
        </div>
      </>
    );
  }

  const teklifler = navlunFirmaTeklifleri(db, f.id);
  const secilme = teklifler.filter((t) => t.secildi).length;
  const denizSay = teklifler.filter((t) => t.tur === 'deniz').length;
  const karaSay = teklifler.filter((t) => t.tur === 'kara').length;

  function delFirma() {
    if (!confirm('Bu navlun firması silinsin mi? Geçmiş tekliflerdeki adı korunmaz.')) return;
    mutate((d) => {
      d.navlunFirmalari = d.navlunFirmalari.filter((x) => x.id !== f!.id);
    });
    go('navlunFirmalar');
    toast('Firma silindi');
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14, flexWrap: 'wrap' }}>
        <button className="btn sm ghost" onClick={() => go('navlunFirmalar')}>
          ← Navlun Firmaları
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn sm" onClick={() => openModal({ type: 'navlunFirma', id: f.id })}>
          Bilgileri Düzenle
        </button>
        <button className="btn sm danger" onClick={delFirma}>
          Sil
        </button>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-body" style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div className="fc-avatar" style={{ width: 56, height: 56, fontSize: 21, background: 'var(--navy)', color: '#fff', border: 'none' }}>
            {initials(f.ad)}
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 21, fontWeight: 800 }}>{f.ad}</div>
            {f.telefon && (
              <div className="fc-line" style={{ marginTop: 9 }}>
                <Icon name="phone" size={15} />
                {f.telefon}
              </div>
            )}
            {f.calisanlar && f.calisanlar.length ? (
              <div className="fc-emp" style={{ marginTop: 10 }}>
                {f.calisanlar.map((c, i) => (
                  <div key={i} className="fc-emp-item">
                    <div className="ea">{initials(c.ad)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="en">
                        {c.ad}
                        {c.unvan ? (
                          <>
                            {' · '}
                            <span style={{ fontWeight: 500, color: 'var(--muted)' }}>{c.unvan}</span>
                          </>
                        ) : null}
                      </div>
                      <div className="et">
                        {c.email ? c.email : ''}
                        {c.telefon ? (c.email ? ' · ' : '') + c.telefon : ''}
                      </div>
                    </div>
                    {c.email ? (
                      <a className="btn sm ghost" href={'mailto:' + c.email}>
                        ✉
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
            {f.notlar && <div style={{ marginTop: 9, fontSize: 12.5, color: 'var(--muted)', fontStyle: 'italic' }}>{f.notlar}</div>}
          </div>
          <div style={{ display: 'flex', gap: 22 }}>
            <Stat n={teklifler.length} l="Verilen Teklif" />
            <Stat n={secilme} l="Seçildi / Onaylandı" color="var(--green)" />
            <Stat n={denizSay} l="Deniz" color="var(--blue)" />
            <Stat n={karaSay} l="Kara" color="var(--amber)" />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Verilen Teklifler</h2>
        </div>
        <div className="panel-body flush">
          {teklifler.length ? (
            <table>
              <thead>
                <tr>
                  <th>Tür</th>
                  <th>Hat</th>
                  <th>Tarih</th>
                  <th style={{ textAlign: 'right' }}>Fiyat</th>
                  <th>Durum</th>
                  <th style={{ textAlign: 'center' }}>Seçildi</th>
                </tr>
              </thead>
              <tbody>
                {teklifler.map((t) => (
                  <tr
                    key={t.id}
                    className="t-row-click"
                    onClick={() => openModal({ type: t.tur === 'deniz' ? 'navlun' : 'karaNavlun', id: t.kayitId })}
                  >
                    <td>
                      <span
                        className="tag"
                        style={{
                          background: (t.tur === 'deniz' ? 'var(--blue)' : 'var(--amber)') + '1f',
                          color: t.tur === 'deniz' ? 'var(--blue)' : 'var(--amber)',
                        }}
                      >
                        {t.tur === 'deniz' ? 'Deniz' : 'Kara'}
                      </span>
                    </td>
                    <td className="cell-strong">{t.hat}</td>
                    <td>{t.tarih ? dt(t.tarih) : '—'}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{money(t.fiyat, t.paraBirimi)}</td>
                    <td>
                      <StatusBadge durum={t.durum} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {t.secildi ? <span style={{ color: 'var(--green)', fontWeight: 700 }}>✓</span> : <span style={{ color: 'var(--faint)' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty" style={{ padding: 26 }}>
              <p>Bu firma henüz hiçbir navlun kaydına teklif vermemiş.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
