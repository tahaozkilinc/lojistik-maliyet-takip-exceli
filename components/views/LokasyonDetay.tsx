'use client';
import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { money, dt } from '@/lib/format';
import { toTRY } from '@/lib/calc';
import { TIP_RENK } from '@/lib/constants';
import { Icon } from '@/components/Icon';
import type { Teklif, Talep } from '@/lib/types';

const DURUM_LABEL: Record<string, string> = {
  devam: 'Devam Ediyor',
  tamamlandi: 'Tamamlandı',
  iptal: 'İptal',
};

type Row = {
  teklif: Teklif;
  talep: Talep;
  firmaAd: string;
  tryFiyat: number;
  tarih: string;
  secildi: boolean;
  rol: 'yükleme' | 'teslim' | 'her ikisi';
};

export function LokasyonDetay() {
  const { db, ui, go, setUi, openModal } = useStore();
  const lok = db.lokasyonlar.find((l) => l.id === ui.lokasyonId);
  const [sirala, setSirala] = useState<'tarih' | 'fiyat'>('tarih');
  const [firma, setFirma] = useState<string>('all');

  if (!lok) {
    return (
      <>
        <button className="btn sm ghost" onClick={() => go('lokasyonlar')}>
          ← Lokasyonlar
        </button>
        <div className="empty" style={{ marginTop: 18 }}>
          <h3>Lokasyon bulunamadı</h3>
        </div>
      </>
    );
  }

  const renk = lok.fabrika ? '#c9a227' : TIP_RENK[lok.tip || ''] || '#1d4d7e';

  const rows: Row[] = [];
  db.talepler.forEach((t) => {
    const isYuk = t.yuklemeLokasyonId === lok.id;
    const isTes = t.teslimLokasyonId === lok.id;
    if (!isYuk && !isTes) return;
    const rol: Row['rol'] = isYuk && isTes ? 'her ikisi' : isYuk ? 'yükleme' : 'teslim';
    const teklifler = Array.isArray(t.teklifler) ? t.teklifler : [];
    teklifler.forEach((q) => {
      const firmaAd = db.firmalar.find((f) => f.id === q.firmaId)?.ad || 'Bilinmeyen Firma';
      rows.push({
        teklif: q,
        talep: t,
        firmaAd,
        tryFiyat: toTRY(db, q.fiyat, q.paraBirimi),
        tarih: q.createdAt || t.createdAt || '',
        secildi: t.secilenTeklifId === q.id,
        rol,
      });
    });
  });

  const firmaSet = [...new Set(rows.map((r) => r.firmaAd))].sort((a, b) => a.localeCompare(b, 'tr'));
  const filtered = firma === 'all' ? rows : rows.filter((r) => r.firmaAd === firma);
  const sorted = [...filtered].sort((a, b) => {
    if (sirala === 'tarih') return (b.tarih || '').localeCompare(a.tarih || '');
    return a.tryFiyat - b.tryFiyat;
  });

  const teklifSay = rows.length;
  const talepSay = new Set(rows.map((r) => r.talep.id)).size;
  const secilmeSay = rows.filter((r) => r.secildi).length;
  const firmaSay = firmaSet.length;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14, flexWrap: 'wrap' }}>
        <button className="btn sm ghost" onClick={() => go('lokasyonlar')}>
          ← Lokasyonlar
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn sm" onClick={() => openModal({ type: 'lokasyon', id: lok.id })}>
          Bilgileri Düzenle
        </button>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-body" style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div
            className="fc-avatar"
            style={{ width: 56, height: 56, fontSize: 22, background: renk + '22', border: '2px solid ' + renk + '55', color: renk }}
          >
            <Icon name="mappin" size={24} />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 21, fontWeight: 800 }}>{lok.ad}</div>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>
              {[lok.ilce, lok.il].filter(Boolean).join(' / ') || lok.sehir || ''}
              {lok.tip ? (
                <span
                  style={{
                    display: 'inline-block',
                    background: renk,
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 8px',
                    borderRadius: 10,
                    marginLeft: 8,
                  }}
                >
                  {lok.fabrika ? 'Fabrika' : lok.tip}
                </span>
              ) : null}
            </div>
            {lok.adres && (
              <div className="fc-line" style={{ marginTop: 8 }}>
                <Icon name="mappin" size={14} />
                {lok.adres}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 22 }}>
            <Stat n={talepSay} l="Talep" />
            <Stat n={teklifSay} l="Teklif" />
            <Stat n={secilmeSay} l="Seçildi" color="var(--green)" />
            <Stat n={firmaSay} l="Firma" color="var(--amber)" />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Teklif Geçmişi</h2>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {firmaSet.length > 1 && (
              <select
                value={firma}
                onChange={(e) => setFirma(e.target.value)}
                style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--text)' }}
              >
                <option value="all">Tüm Firmalar</option>
                {firmaSet.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            )}
            <button
              className={'btn sm' + (sirala === 'tarih' ? ' primary' : '')}
              onClick={() => setSirala('tarih')}
            >
              Tarihe Göre
            </button>
            <button
              className={'btn sm' + (sirala === 'fiyat' ? ' primary' : '')}
              onClick={() => setSirala('fiyat')}
            >
              Fiyata Göre
            </button>
          </div>
        </div>
        <div className="panel-body flush">
          {sorted.length ? (
            <table>
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Talep No</th>
                  <th>Güzergah</th>
                  <th>Yük / Rol</th>
                  <th>Firma</th>
                  <th style={{ textAlign: 'right' }}>Fiyat</th>
                  <th style={{ textAlign: 'center' }}>Durum</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={r.teklif.id + '_' + i} style={r.secildi ? { background: 'var(--green-dim, rgba(22,163,74,.07))' } : undefined}>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--muted)', fontSize: 12 }}>{r.tarih ? dt(r.tarih) : '—'}</td>
                    <td>
                      <button
                        className="btn sm ghost"
                        style={{ fontWeight: 700, padding: '2px 6px' }}
                        onClick={() => { go('detail', r.talep.id); }}
                      >
                        {r.talep.talepNo}
                      </button>
                    </td>
                    <td style={{ fontSize: 12.5 }}>
                      {r.talep.yuklemeNoktasi} → {r.talep.teslimNoktasi}
                    </td>
                    <td>
                      <div style={{ fontSize: 12.5 }}>{r.talep.yukTipi || '—'}</div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: r.rol === 'yükleme' ? 'var(--amber)' : r.rol === 'teslim' ? 'var(--blue, #2563eb)' : 'var(--muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '.3px',
                        }}
                      >
                        {r.rol === 'yükleme' ? '↑ Yükleme' : r.rol === 'teslim' ? '↓ Teslim' : '↕ İkisi'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{r.firmaAd}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 700 }}>{money(r.teklif.fiyat, r.teklif.paraBirimi)}</span>
                      {r.teklif.paraBirimi !== 'TRY' && (
                        <div style={{ fontSize: 10.5, color: 'var(--faint)' }}>{money(r.tryFiyat, 'TRY')}</div>
                      )}
                      <div style={{ fontSize: 10.5, color: 'var(--faint)' }}>{r.teklif.kdvDahil ? 'KDV dahil' : 'KDV hariç'}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {r.secildi ? (
                        <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: 12 }}>✓ Seçildi</span>
                      ) : (
                        <span style={{ color: 'var(--faint)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty" style={{ padding: 32 }}>
              <Icon name="mappin" size={36} sw={1.5} />
              <h3>Bu lokasyona ait teklif yok</h3>
              <p>Bu lokasyonu kullanan talepler oluşturulduğunda teklif geçmişi burada görünür.</p>
            </div>
          )}
        </div>
      </div>

      {lok.tip === 'Liman' && (() => {
        const limanKayitlari = db.limanTalepleri.filter((lt) => lt.limanId === lok.id);
        return (
          <div className="panel" style={{ marginTop: 16 }}>
            <div className="panel-head">
              <h2>
                <Icon name="ship" size={15} />
                &nbsp;Liman Masraf Kayıtları
              </h2>
              <div style={{ flex: 1 }} />
              <button className="btn sm primary" onClick={() => openModal({ type: 'limanTalep' })}>
                <Icon name="plus" size={13} sw={2.4} />
                Yeni Kayıt
              </button>
              {limanKayitlari.length > 0 && (
                <button
                  className="btn sm"
                  onClick={() => { setUi({ lokFilter: lok.id }); go('limanTalepleri'); }}
                >
                  Tümünü Gör
                </button>
              )}
            </div>
            <div className="panel-body flush">
              {limanKayitlari.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>Talep No</th>
                      <th>Gemi / Sefer</th>
                      <th style={{ textAlign: 'center' }}>Masraf</th>
                      <th style={{ textAlign: 'right' }}>Toplam (₺)</th>
                      <th>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...limanKayitlari]
                      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
                      .slice(0, 5)
                      .map((lt) => {
                        const toplam = (lt.masraflar || []).reduce((s, m) => s + toTRY(db, m.fiyat, m.paraBirimi), 0);
                        return (
                          <tr
                            key={lt.id}
                            style={{ cursor: 'pointer' }}
                            onClick={() => { setUi({ limanTalepId: lt.id }); go('limanTalepDetay'); }}
                          >
                            <td className="cell-strong">{lt.talepNo}</td>
                            <td style={{ fontSize: 12.5 }}>
                              {lt.gemiAdi || '—'}
                              {lt.seferNo ? <span style={{ color: 'var(--faint)', fontSize: 11 }}> · {lt.seferNo}</span> : null}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="tag">{(lt.masraflar || []).length}</span>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>
                              {toplam ? money(toplam, 'TRY') : '—'}
                            </td>
                            <td style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                              {DURUM_LABEL[lt.durum] || lt.durum}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              ) : (
                <div className="empty" style={{ padding: 20 }}>
                  <p>Bu liman için henüz masraf kaydı yok.</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </>
  );
}

function Stat({ n, l, color }: { n: number; l: string; color?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 23, fontWeight: 800, color }}>{n}</div>
      <div style={{ fontSize: 10.5, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.4px' }}>{l}</div>
    </div>
  );
}
