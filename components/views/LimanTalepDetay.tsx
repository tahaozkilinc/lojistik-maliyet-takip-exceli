'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { money, dt } from '@/lib/format';
import { toTRY } from '@/lib/calc';
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

export function LimanTalepDetay() {
  const { db, ui, go, openModal, mutate, toast } = useStore();
  const lt = db.limanTalepleri.find((x) => x.id === ui.limanTalepId);

  if (!lt) {
    return (
      <>
        <button className="btn sm ghost" onClick={() => go('limanTalepleri')}>
          ← Liman Masrafları
        </button>
        <div className="empty" style={{ marginTop: 18 }}>
          <h3>Kayıt bulunamadı</h3>
        </div>
      </>
    );
  }

  const liman = db.lokasyonlar.find((l) => l.id === lt.limanId);
  const masraflar = Array.isArray(lt.masraflar) ? lt.masraflar : [];
  const durumRenk = DURUM_RENK[lt.durum] || '#64748b';

  const toplamTRY = masraflar.reduce((s, m) => s + toTRY(db, m.fiyat, m.paraBirimi), 0);

  function delMasraf(masrafId: string) {
    if (!confirm('Bu masraf kalemi silinsin mi?')) return;
    mutate((d) => {
      const t = d.limanTalepleri.find((x) => x.id === lt!.id);
      if (t) t.masraflar = t.masraflar.filter((m) => m.id !== masrafId);
    });
    toast('Masraf silindi');
  }

  function delTalep() {
    if (!confirm('Bu liman kaydı ve tüm masrafleri silinsin mi?')) return;
    mutate((d) => {
      d.limanTalepleri = d.limanTalepleri.filter((x) => x.id !== lt!.id);
    });
    go('limanTalepleri');
    toast('Kayıt silindi');
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14, flexWrap: 'wrap' }}>
        <button className="btn sm ghost" onClick={() => go('limanTalepleri')}>
          ← Liman Masrafları
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn sm" onClick={() => openModal({ type: 'limanTalep', id: lt.id })}>
          Kaydı Düzenle
        </button>
        <button className="btn sm danger" onClick={delTalep}>
          Sil
        </button>
      </div>

      {/* Üst bilgi kartı */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-body">
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 20, fontWeight: 800 }}>{lt.talepNo}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: durumRenk,
                    background: durumRenk + '18',
                    border: '1px solid ' + durumRenk + '44',
                    padding: '2px 10px',
                    borderRadius: 10,
                  }}
                >
                  {DURUM_LABEL[lt.durum] || lt.durum}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '6px 20px', fontSize: 13 }}>
                <InfoRow icon="mappin" label="Liman" value={liman?.ad || '—'} />
                {lt.gemiAdi && <InfoRow icon="ship" label="Gemi" value={lt.gemiAdi} />}
                {lt.seferNo && <InfoRow icon="tag" label="Sefer No" value={lt.seferNo} />}
                {lt.yukTipi && <InfoRow icon="box" label="Yük Tipi" value={lt.yukTipi} />}
                {lt.konteynerSayisi != null && (
                  <InfoRow
                    icon="box"
                    label="Konteyner"
                    value={lt.konteynerSayisi + (lt.konteynerTipi ? " × " + lt.konteynerTipi : '')}
                  />
                )}
                {lt.girisTarihi && <InfoRow icon="calendar" label="Giriş" value={dt(lt.girisTarihi)} />}
                {lt.cikisTarihi && <InfoRow icon="calendar" label="Çıkış" value={dt(lt.cikisTarihi)} />}
              </div>
              {lt.notlar && (
                <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--muted)', fontStyle: 'italic' }}>{lt.notlar}</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              <Stat n={masraflar.length} l="Masraf Kalemi" />
              <Stat n={money(toplamTRY, 'TRY')} l="Toplam (₺)" color="var(--green)" />
            </div>
          </div>
        </div>
      </div>

      {/* Masraflar */}
      <div className="panel">
        <div className="panel-head">
          <h2>Masraf Kalemleri</h2>
          <div style={{ flex: 1 }} />
          <button className="btn sm primary" onClick={() => openModal({ type: 'limanMasraf', talepId: lt.id })}>
            <Icon name="plus" size={13} sw={2.4} />
            Masraf Ekle
          </button>
        </div>
        <div className="panel-body flush">
          {masraflar.length ? (
            <table>
              <thead>
                <tr>
                  <th>Masraf Tipi</th>
                  <th>Açıklama</th>
                  <th>Firma</th>
                  <th style={{ textAlign: 'right' }}>Fiyat</th>
                  <th style={{ textAlign: 'right' }}>TL Karşılığı</th>
                  <th>KDV</th>
                  <th>Tarih</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {masraflar.map((m) => {
                  const firmaAd = m.firmaId ? db.firmalar.find((f) => f.id === m.firmaId)?.ad || '—' : '—';
                  const tryVal = toTRY(db, m.fiyat, m.paraBirimi);
                  return (
                    <tr key={m.id}>
                      <td className="cell-strong">{m.masrafTipi}</td>
                      <td style={{ color: 'var(--muted)', fontSize: 12.5 }}>{m.aciklama || '—'}</td>
                      <td>{firmaAd}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(m.fiyat, m.paraBirimi)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--faint)', fontSize: 12 }}>
                        {m.paraBirimi !== 'TRY' ? money(tryVal, 'TRY') : ''}
                      </td>
                      <td style={{ fontSize: 11.5, color: 'var(--muted)' }}>{m.kdvDahil ? 'Dahil' : 'Hariç'}</td>
                      <td style={{ color: 'var(--faint)', fontSize: 12 }}>{m.createdAt ? dt(m.createdAt) : '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button
                          className="btn sm ghost"
                          onClick={() => openModal({ type: 'limanMasraf', talepId: lt.id, masrafId: m.id })}
                        >
                          ✎
                        </button>
                        <button
                          className="btn sm ghost"
                          style={{ color: 'var(--red)', marginLeft: 2 }}
                          onClick={() => delMasraf(m.id)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 800, fontSize: 14 }}>
                  <td colSpan={4} style={{ textAlign: 'right', paddingTop: 10 }}>
                    Toplam:
                  </td>
                  <td style={{ textAlign: 'right', paddingTop: 10, color: 'var(--green)' }}>{money(toplamTRY, 'TRY')}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          ) : (
            <div className="empty" style={{ padding: 28 }}>
              <p>
                Henüz masraf kalemi eklenmemiş. <b>Masraf Ekle</b> ile THC, ardiye, acente gibi kalemleri girin.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ color: 'var(--faint)', fontSize: 11, minWidth: 60 }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function Stat({ n, l, color }: { n: number | string; l: string; color?: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 80 }}>
      <div style={{ fontSize: typeof n === 'string' ? 16 : 23, fontWeight: 800, color }}>{n}</div>
      <div style={{ fontSize: 10.5, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.4px' }}>{l}</div>
    </div>
  );
}
