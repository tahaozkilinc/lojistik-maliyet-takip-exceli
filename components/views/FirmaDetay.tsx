'use client';
import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { money, dt, initials, hasPhone } from '@/lib/format';
import { toTRY, lokName } from '@/lib/calc';
import { TIP_RENK } from '@/lib/constants';
import { exportFirmaFiyat, openSignedFile } from '@/lib/export';
import { Icon } from '@/components/Icon';
import { FirmaAvatar } from '@/components/FirmaAvatar';

function AnlDelta({ v, p }: { v: number; p: number | null }) {
  if (p == null || p === 0) return null;
  const d = ((v - p) / p) * 100;
  if (!isFinite(d)) return null;
  return (
    <span style={{ color: d > 0 ? 'var(--red)' : d < 0 ? 'var(--green)' : 'var(--faint)', fontWeight: 700 }}>
      {d > 0 ? '▲' : d < 0 ? '▼' : ''} {Math.abs(d).toFixed(1)}%
    </span>
  );
}

export function FirmaDetay() {
  const { db, ui, go, openModal, mutate, toast } = useStore();
  const f = db.firmalar.find((x) => x.id === ui.firmaId);
  const [urunFilter, setUrunFilter] = useState('all');

  if (!f) {
    return (
      <>
        <button className="btn sm ghost" onClick={() => go('firmalar')}>
          ← Firmalar
        </button>
        <div className="empty" style={{ marginTop: 18 }}>
          <h3>Firma bulunamadı</h3>
        </div>
      </>
    );
  }

  const teklifSay = db.talepler.reduce((s, t) => s + t.teklifler.filter((q) => q.firmaId === f.id).length, 0);
  const secilme = db.talepler.filter((t) => {
    const q = t.teklifler.find((q) => q.id === t.secilenTeklifId);
    return q && q.firmaId === f.id;
  }).length;
  const anls = (f.anlasmalar || [])
    .slice()
    .sort(
      (a, b) =>
        (lokName(db, a.yuklemeLokasyonId) || '').localeCompare(lokName(db, b.yuklemeLokasyonId) || '', 'tr') ||
        (a.yukTipi || '').localeCompare(b.yukTipi || '', 'tr'),
    );
  // Ürün filtresi: aynı depodan/hattan firma ürüne göre farklı fiyat
  // verebildiğinden, tek bir ürünün (ör. yalnızca Mısır) tüm hatlardaki
  // fiyatlarını görmek için filtrelenebilir. Seçenekler bu firmanın
  // anlaşmalarında GERÇEKTEN kullanılan ürün adlarından türetilir (sabit bir
  // liste değil) — "Diğer" yalnızca ürünü belirtilmemiş ("Tüm ürünler")
  // anlaşma varsa ve her zaman en sonda gösterilir.
  const urunTipleri = [...new Set(anls.map((a) => a.yukTipi).filter((t): t is string => !!t))].sort((a, b) =>
    a.localeCompare(b, 'tr'),
  );
  const digerVarMi = anls.some((a) => !a.yukTipi);
  const urunFiltreleri: { key: string; label: string }[] = [
    { key: 'all', label: 'Tümü' },
    ...urunTipleri.map((t) => ({ key: t, label: t })),
    ...(digerVarMi ? [{ key: 'diger', label: 'Diğer' }] : []),
  ];
  const anlsFiltered =
    urunFilter === 'all'
      ? anls
      : urunFilter === 'diger'
        ? anls.filter((a) => !a.yukTipi)
        : anls.filter((a) => a.yukTipi === urunFilter);
  // Aynı hattan (yükleme → teslim) firma ürün bazlı farklı fiyat verebildiği
  // için anlaşmalar hat bazında gruplanır — her grup altında ürünler ayrı
  // satır olarak listelenir.
  const anlGroups: { yuklemeLokasyonId: string; teslimLokasyonId: string; items: typeof anls }[] = [];
  for (const a of anlsFiltered) {
    let g = anlGroups.find((x) => x.yuklemeLokasyonId === a.yuklemeLokasyonId && x.teslimLokasyonId === a.teslimLokasyonId);
    if (!g) {
      g = { yuklemeLokasyonId: a.yuklemeLokasyonId, teslimLokasyonId: a.teslimLokasyonId, items: [] };
      anlGroups.push(g);
    }
    g.items.push(a);
  }
  const sozlesmeler = (f.sozlesmeler || [])
    .slice()
    .sort((a, b) => (b.tarih || b.createdAt || '').localeCompare(a.tarih || a.createdAt || ''));

  // Hat bazlı performans
  const perf: Record<
    string,
    { yuk: string; tes: string; urun?: string; quotes: { fiyat: number; para: string; birim: string; tarih?: string; won: boolean }[]; won: number }
  > = {};
  db.talepler.forEach((t) =>
    t.teklifler.forEach((q) => {
      if (q.firmaId !== f.id) return;
      const key = t.yuklemeLokasyonId + '|' + t.teslimLokasyonId + '|' + (t.yukTipi || '');
      const won = t.secilenTeklifId === q.id;
      const p = (perf[key] = perf[key] || { yuk: t.yuklemeNoktasi, tes: t.teslimNoktasi, urun: t.yukTipi, quotes: [], won: 0 });
      p.quotes.push({ fiyat: q.fiyat, para: q.paraBirimi, birim: t.birim || 'ton', tarih: q.createdAt || t.createdAt, won });
      if (won) p.won++;
    }),
  );
  const perfArr = Object.values(perf).sort(
    (a, b) => b.quotes.length - a.quotes.length || (a.yuk || '').localeCompare(b.yuk || '', 'tr'),
  );

  function delFirma() {
    if (!confirm('Firma silinsin mi?')) return;
    mutate((d) => {
      d.firmalar = d.firmalar.filter((x) => x.id !== f!.id);
    });
    go('firmalar');
    toast('Firma silindi');
  }
  function delAnlasma(anlId: string) {
    if (!confirm('Bu anlaşmalı fiyat (ve geçmişi) silinsin mi?')) return;
    mutate((d) => {
      const ff = d.firmalar.find((x) => x.id === f!.id);
      if (ff) ff.anlasmalar = (ff.anlasmalar || []).filter((x) => x.id !== anlId);
    });
    toast('Anlaşma silindi');
  }
  function delSozlesme(szId: string) {
    if (!confirm('Bu sözleşme belgesi silinsin mi?')) return;
    mutate((d) => {
      const ff = d.firmalar.find((x) => x.id === f!.id);
      if (ff) ff.sozlesmeler = (ff.sozlesmeler || []).filter((x) => x.id !== szId);
    });
    toast('Sözleşme silindi');
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14, flexWrap: 'wrap' }}>
        <button className="btn sm ghost" onClick={() => go('firmalar')}>
          ← Firmalar
        </button>
        <div style={{ flex: 1 }} />
        <button
          className="btn sm"
          onClick={() => {
            if (exportFirmaFiyat(db, f.id)) toast('Excel indiriliyor', 'ok');
            else toast('Bu firmada anlaşmalı fiyat yok', 'err');
          }}
        >
          <Icon name="download" size={13} />
          Excel İndir
        </button>
        <button className="btn sm" onClick={() => openModal({ type: 'firma', id: f.id })}>
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
            <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>
              {f.sehir || ''}
              {f.vergiNo ? ' · VKN ' + f.vergiNo : ''}
            </div>
            {hasPhone(f.telefon) && (
              <div className="fc-line" style={{ marginTop: 9 }}>
                <Icon name="phone" size={15} />
                {f.telefon}
              </div>
            )}
            {f.adres && (
              <div className="fc-line">
                <Icon name="mappin" size={15} />
                {f.adres}
              </div>
            )}
            {f.notlar && <div style={{ marginTop: 9, fontSize: 12.5, color: 'var(--muted)', fontStyle: 'italic' }}>{f.notlar}</div>}
          </div>
          <div style={{ display: 'flex', gap: 22 }}>
            <Stat n={teklifSay} l="Verilen Teklif" />
            <Stat n={secilme} l="Seçildi" color="var(--green)" />
            <Stat n={anls.length} l="Anlaşma" color="var(--amber)" />
            <Stat n={sozlesmeler.length} l="Sözleşme" color="var(--blue)" />
          </div>
        </div>
      </div>

      {f.calisanlar && f.calisanlar.length ? (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-head">
            <h2>İletişim Kişileri</h2>
          </div>
          <div className="panel-body">
            {f.calisanlar.map((c, i) => (
              <div key={i} className="fc-emp-item" style={{ padding: '7px 0' }}>
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
        </div>
      ) : null}

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head">
          <h2>Hat Bazlı Teklif Performansı</h2>
        </div>
        <div className="panel-body flush">
          {perfArr.length ? (
            <table>
              <thead>
                <tr>
                  <th>HAT</th>
                  <th>Ürün</th>
                  <th style={{ textAlign: 'center' }}>Teklif</th>
                  <th style={{ textAlign: 'center' }}>Kazandı</th>
                  <th style={{ textAlign: 'right' }}>Son Fiyat</th>
                  <th style={{ textAlign: 'right' }}>Aralık (₺/birim)</th>
                </tr>
              </thead>
              <tbody>
                {perfArr.map((p, i) => {
                  const qs = p.quotes.slice().sort((a, b) => new Date(a.tarih || 0).getTime() - new Date(b.tarih || 0).getTime());
                  const son = qs[qs.length - 1];
                  const trys = p.quotes.map((q) => toTRY(db, q.fiyat, q.para));
                  const mn = Math.min(...trys);
                  const mx = Math.max(...trys);
                  const oran = Math.round((p.won / p.quotes.length) * 100);
                  return (
                    <tr key={i}>
                      <td className="cell-strong" style={{ whiteSpace: 'nowrap' }}>
                        {p.yuk} → {p.tes}
                      </td>
                      <td>{p.urun || '—'}</td>
                      <td style={{ textAlign: 'center' }}>{p.quotes.length}</td>
                      <td style={{ textAlign: 'center' }}>
                        {p.won ? (
                          <>
                            <span style={{ color: 'var(--green)', fontWeight: 700 }}>{p.won}</span>{' '}
                            <span style={{ color: 'var(--faint)', fontSize: 11 }}>%{oran}</span>
                          </>
                        ) : (
                          <span style={{ color: 'var(--faint)' }}>0</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {money(son.fiyat, son.para)}
                        <span style={{ color: 'var(--faint)', fontSize: 11 }}>/{son.birim}</span>
                        <div style={{ fontSize: 10.5, color: 'var(--faint)' }}>{dt(son.tarih)}</div>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {mn === mx ? money(mn, 'TRY') : money(mn, 'TRY') + ' – ' + money(mx, 'TRY')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty" style={{ padding: 24 }}>
              <p>Bu firma henüz hiçbir talebe teklif vermemiş.</p>
            </div>
          )}
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head">
          <h2>Sözleşmeler</h2>
          <div style={{ flex: 1 }} />
          <button className="btn sm primary" onClick={() => openModal({ type: 'sozlesme', firmaId: f.id })}>
            <Icon name="plus" size={13} sw={2.4} />
            Sözleşme Ekle
          </button>
        </div>
        <div className="panel-body">
          <div style={{ fontSize: 12, color: 'var(--faint)', marginBottom: 12 }}>
            Firmayla imzalanan taranmış/fotoğraflanmış sözleşme belgelerini buraya yükleyip istediğiniz zaman görüntüleyebilirsiniz.
          </div>
          {sozlesmeler.length ? (
            sozlesmeler.map((s) => (
              <div
                key={s.id}
                className="file-chip"
                style={{ cursor: 'pointer', marginBottom: 8 }}
                onClick={async () => {
                  if (!(await openSignedFile(s.belge))) toast('Belge görüntülenemiyor', 'err');
                }}
              >
                <div className="fi">
                  <Icon name="file" size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="fn">{s.baslik || 'Sözleşme'}</div>
                  <div className="fs">
                    {s.tarih ? dt(s.tarih) : 'tarih yok'}
                    {s.belge.boyut ? ' · ' + s.belge.boyut : ''}
                  </div>
                </div>
                <button
                  className="btn sm ghost"
                  style={{ color: 'var(--red)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    delSozlesme(s.id);
                  }}
                >
                  Sil
                </button>
              </div>
            ))
          ) : (
            <div className="empty" style={{ padding: 22 }}>
              <p>
                Bu firmayla henüz sözleşme belgesi eklenmemiş. <b>Sözleşme Ekle</b> ile başlayın.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Anlaşmalı Fiyatlar &amp; Geçmiş</h2>
          <div style={{ flex: 1 }} />
          <button className="btn sm primary" onClick={() => openModal({ type: 'anlasma', firmaId: f.id })}>
            <Icon name="plus" size={13} sw={2.4} />
            Anlaşma Ekle
          </button>
        </div>
        <div className="panel-body">
          <div style={{ fontSize: 12, color: 'var(--faint)', marginBottom: 12 }}>
            Her <b>ürün + hat</b> için tek güncel fiyat tutulur. Fiyatı güncellediğinizde eski değer otomatik geçmişe işlenir; aynı ürün+hat için
            ikinci kez fiyat eklemeye çalışırsanız uyarılırsınız.
          </div>
          {anls.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {urunFiltreleri.map((u) => (
                <button
                  key={u.key}
                  className={'chip-filter ' + (urunFilter === u.key ? 'on' : '')}
                  onClick={() => setUrunFilter(u.key)}
                >
                  {u.label}
                </button>
              ))}
            </div>
          )}
          {anlGroups.length ? (
            anlGroups.map((g) => (
              <div key={g.yuklemeLokasyonId + '|' + g.teslimLokasyonId} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--line)' }}>
                  <Icon name="mappin" size={14} />
                  <b style={{ fontSize: 14 }}>
                    {lokName(db, g.yuklemeLokasyonId) || '—'} → {lokName(db, g.teslimLokasyonId) || '—'}
                  </b>
                  <span className="tag">{g.items.length} ürün</span>
                </div>
                {g.items.map((a) => {
                  const gec = (a.gecmis || []).slice().sort((x, y) => (x.tarih || '').localeCompare(y.tarih || ''));
                  const prev = gec.length ? gec[gec.length - 1] : null;
                  const tl = gec.concat([{ birimFiyat: a.birimFiyat, paraBirimi: a.paraBirimi, tarih: a.tarih || '' }]);
                  const first = tl.length ? toTRY(db, tl[0].birimFiyat, tl[0].paraBirimi) : 0;
                  const last = toTRY(db, a.birimFiyat, a.paraBirimi);
                  const overall = first ? ((last - first) / first) * 100 : 0;
                  let pv: number | null = null;
                  return (
                    <div key={a.id} style={{ border: '1px solid var(--line)', borderRadius: 11, padding: '13px 15px', marginBottom: 11, marginLeft: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                        <span
                          className="tag"
                          style={{
                            background: (a.yukTipi ? TIP_RENK[a.yukTipi] || '#1d4d7e' : '#64748b') + '1f',
                            borderColor: (a.yukTipi ? TIP_RENK[a.yukTipi] || '#1d4d7e' : '#64748b') + '66',
                            color: a.yukTipi ? TIP_RENK[a.yukTipi] || '#1d4d7e' : '#64748b',
                          }}
                        >
                          {a.yukTipi ? a.yukTipi : 'Tüm ürünler'}
                        </span>
                        <div style={{ flex: 1 }} />
                        <button className="btn sm ghost" onClick={() => openModal({ type: 'anlasma', firmaId: f.id, anlId: a.id })}>
                          Düzenle
                        </button>
                        <button className="btn sm ghost" style={{ color: 'var(--red)' }} onClick={() => delAnlasma(a.id!)}>
                          Sil
                        </button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 21, fontWeight: 800, color: 'var(--amber)' }}>
                          {money(a.birimFiyat, a.paraBirimi)}
                          <span style={{ fontSize: 13, color: 'var(--faint)', fontWeight: 500 }}>/ton</span>
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{a.tarih ? dt(a.tarih) : 'tarih yok'}</span>
                        {prev ? (
                          <span style={{ fontSize: 12.5 }}>
                            önceki fiyata göre <AnlDelta v={toTRY(db, a.birimFiyat, a.paraBirimi)} p={toTRY(db, prev.birimFiyat, prev.paraBirimi)} />
                          </span>
                        ) : null}
                        {tl.length > 1 ? (
                          <span style={{ fontSize: 11.5, color: overall > 0 ? 'var(--red)' : overall < 0 ? 'var(--green)' : 'var(--faint)', fontWeight: 600 }}>
                            · başlangıca göre {overall > 0 ? '+' : ''}
                            {overall.toFixed(1)}%
                          </span>
                        ) : null}
                      </div>
                      {tl.length > 1 ? (
                        <details style={{ marginTop: 8 }}>
                          <summary style={{ cursor: 'pointer', fontSize: 11.5, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.4px', fontWeight: 700 }}>
                            Fiyat Geçmişi ({tl.length})
                          </summary>
                          <div style={{ marginTop: 4 }}>
                            {tl.map((h, idx) => {
                              const v = toTRY(db, h.birimFiyat, h.paraBirimi);
                              const node =
                                pv != null ? (
                                  <AnlDelta v={v} p={pv} />
                                ) : (
                                  <span style={{ color: 'var(--faint)' }}>başlangıç</span>
                                );
                              pv = v;
                              return (
                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr auto 84px', gap: 10, padding: '4px 0', fontSize: 12.5, borderTop: '1px solid var(--line-2)' }}>
                                  <span style={{ color: 'var(--muted)' }}>{h.tarih ? dt(h.tarih) : 'tarih yok'}</span>
                                  <b>{money(h.birimFiyat, h.paraBirimi)}/ton</b>
                                  <span style={{ textAlign: 'right' }}>{node}</span>
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))
          ) : anls.length > 0 ? (
            <div className="empty" style={{ padding: 26 }}>
              <p>
                Bu filtrede anlaşmalı fiyat yok.{' '}
                <a style={{ cursor: 'pointer', fontWeight: 600 }} onClick={() => setUrunFilter('all')}>
                  Tümünü göster
                </a>
              </p>
            </div>
          ) : (
            <div className="empty" style={{ padding: 26 }}>
              <p>
                Bu firma için anlaşmalı fiyat girilmemiş. <b>Anlaşma Ekle</b> ile başlayın.
              </p>
            </div>
          )}
        </div>
      </div>
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
