'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { money, dt, initials, hasPhone } from '@/lib/format';
import { Icon } from '@/components/Icon';
import { FirmaAvatar } from '@/components/FirmaAvatar';

function Stat({ n, l, color }: { n: number; l: string; color?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 23, fontWeight: 800, color }}>{n}</div>
      <div style={{ fontSize: 10.5, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.4px' }}>{l}</div>
    </div>
  );
}

export function LimanFirmaDetay() {
  const { db, ui, go, openModal, mutate, toast } = useStore();
  const f = db.limanFirmalari.find((x) => x.id === ui.limanFirmaId);

  if (!f) {
    return (
      <>
        <button className="btn sm ghost" onClick={() => go('limanFirmalari')}>
          ← Liman Firmaları
        </button>
        <div className="empty" style={{ marginTop: 18 }}>
          <h3>Firma bulunamadı</h3>
        </div>
      </>
    );
  }

  const ucretler = [...(f.ucretler || [])].sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''));

  function delFirma() {
    if (!confirm('Bu liman firması silinsin mi? Ücret listesi de birlikte silinir.')) return;
    mutate((d) => {
      d.limanFirmalari = d.limanFirmalari.filter((x) => x.id !== f!.id);
    });
    go('limanFirmalari');
    toast('Firma silindi');
  }

  function delUcret(ucretId: string) {
    if (!confirm('Bu ücret kaydı silinsin mi?')) return;
    mutate((d) => {
      const ff = d.limanFirmalari.find((x) => x.id === f!.id);
      if (ff) ff.ucretler = (ff.ucretler || []).filter((x) => x.id !== ucretId);
    });
    toast('Ücret silindi');
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14, flexWrap: 'wrap' }}>
        <button className="btn sm ghost" onClick={() => go('limanFirmalari')}>
          ← Liman Firmaları
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn sm" onClick={() => openModal({ type: 'limanFirma', id: f.id })}>
          Bilgileri Düzenle
        </button>
        <button className="btn sm danger" onClick={delFirma}>
          Sil
        </button>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-body" style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <FirmaAvatar
            logo={f.logo}
            ad={f.ad}
            className="fc-avatar"
            style={{ width: 56, height: 56, fontSize: 21, background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 12 }}
          />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 21, fontWeight: 800 }}>{f.ad}</div>
            {hasPhone(f.telefon) && (
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
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
            <Stat n={ucretler.length} l="Kayıtlı Ücret" />
            <Stat n={(f.calisanlar || []).length} l="İletişim Kişisi" color="var(--green)" />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Ücretler</h2>
          <div style={{ flex: 1 }} />
          <button className="btn sm primary" onClick={() => openModal({ type: 'limanUcret', firmaId: f.id })}>
            <Icon name="plus" size={13} sw={2.4} />
            Ücret Ekle
          </button>
        </div>
        <div className="panel-body flush">
          {ucretler.length ? (
            <table>
              <thead>
                <tr>
                  <th>Masraf Tipi</th>
                  <th>Liman / Depo</th>
                  <th style={{ textAlign: 'right' }}>Fiyat</th>
                  <th>Tarih</th>
                  <th>Notlar</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {ucretler.map((u) => {
                  const liman = u.limanId ? db.lokasyonlar.find((l) => l.id === u.limanId) : null;
                  return (
                    <tr key={u.id}>
                      <td className="cell-strong">{u.masrafTipi}</td>
                      <td style={{ fontSize: 12.5 }}>{liman ? liman.ad : <span style={{ color: 'var(--faint)' }}>Tüm limanlar</span>}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(u.fiyat, u.paraBirimi)}</td>
                      <td style={{ color: 'var(--muted)', fontSize: 12 }}>{u.tarih ? dt(u.tarih) : '—'}</td>
                      <td style={{ color: 'var(--muted)', fontSize: 12.5 }}>{u.notlar || '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn sm ghost" onClick={() => openModal({ type: 'limanUcret', firmaId: f.id, ucretId: u.id })}>
                          ✎
                        </button>
                        <button className="btn sm ghost" style={{ color: 'var(--red)' }} onClick={() => delUcret(u.id)}>
                          Sil
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty" style={{ padding: 26 }}>
              <p>
                Bu firma için henüz ücret girilmemiş. <b>Ücret Ekle</b> ile başlayın.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
