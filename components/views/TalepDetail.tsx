'use client';
import React, { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { money, fmt, fmtTon, dt, dtt, initials } from '@/lib/format';
import {
  bestQuoteId,
  firmName,
  lokById,
  qTotal,
  toTRY,
  selectedQuote,
  gerceklesenBirim,
  gercTotalTRY,
  indirimYuzde,
  sonIslem,
  findAnlasmalar,
} from '@/lib/calc';
import { hasCoord, haversine, osrmShortest } from '@/lib/geo';
import { openSignedFile } from '@/lib/export';
import { StatusBadge } from '@/components/StatusBadge';
import { Icon } from '@/components/Icon';

export function TalepDetail() {
  const { db, ui, go, openModal, mutate, toast, setPrintJob } = useStore();
  const distBusy = useRef<Record<string, boolean>>({});
  const x = db.talepler.find((t) => t.id === ui.detailId);

  // Otomatik mesafe hesabı (orijinal autoDist).
  useEffect(() => {
    if (!x || x.mesafeKm || distBusy.current[x.id]) return;
    const yL = lokById(db, x.yuklemeLokasyonId);
    const tL = lokById(db, x.teslimLokasyonId);
    if (yL && tL && hasCoord(yL) && hasCoord(tL)) {
      distBusy.current[x.id] = true;
      void hesaplaMesafe(x.id, true).finally(() => {
        delete distBusy.current[x.id];
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x?.id]);

  if (!x) {
    return (
      <div className="empty">
        <h3>Talep bulunamadı</h3>
        <button className="btn" onClick={() => go('talepler')}>
          ← Listeye dön
        </button>
      </div>
    );
  }

  async function hesaplaMesafe(id: string, silent?: boolean) {
    const t = db.talepler.find((y) => y.id === id);
    if (!t) return;
    const yL = lokById(db, t.yuklemeLokasyonId);
    const tL = lokById(db, t.teslimLokasyonId);
    if (!hasCoord(yL) || !hasCoord(tL)) {
      if (!silent) toast('İki lokasyonun da konumu girilmeli', 'err');
      return;
    }
    const km = await osrmShortest(yL, tL);
    mutate((d) => {
      const tt = d.talepler.find((y) => y.id === id);
      if (!tt) return;
      tt.kusUcusuKm = Math.round(haversine(yL, tL) * 10) / 10;
      if (km != null) tt.mesafeKm = Math.round(km * 10) / 10;
      else tt.mesafeKm = Math.round(haversine(yL, tL) * 1.3 * 10) / 10;
    });
    if (!silent) {
      if (km != null) toast('En kısa karayolu mesafesi hesaplandı', 'ok');
      else toast('Çevrimiçi rota alınamadı; tahmini mesafe kullanıldı', 'err');
    }
  }

  function selectQuote(teklifId: string) {
    mutate((d) => {
      const t = d.talepler.find((y) => y.id === x!.id)!;
      t.secilenTeklifId = t.secilenTeklifId === teklifId ? null : teklifId;
    });
  }
  function delQuote(teklifId: string) {
    if (!confirm('Bu teklif silinsin mi?')) return;
    mutate((d) => {
      const t = d.talepler.find((y) => y.id === x!.id)!;
      t.teklifler = t.teklifler.filter((q) => q.id !== teklifId);
      if (t.secilenTeklifId === teklifId) t.secilenTeklifId = null;
    });
    toast('Teklif silindi');
  }
  function sendToApproval() {
    if (!x!.teklifler.length) {
      toast('Önce teklif ekleyin', 'err');
      return;
    }
    if (!x!.secilenTeklifId) {
      if (!confirm('Önerilecek teklif seçmediniz. En uygun (en düşük) teklif otomatik önerilsin mi?')) return;
    }
    mutate((d) => {
      const t = d.talepler.find((y) => y.id === x!.id)!;
      if (!t.secilenTeklifId) t.secilenTeklifId = bestQuoteId(d, t);
      t.durum = 'onayda';
      t.onay = { ...(t.onay || {}), gonderim: new Date().toISOString() };
    });
    toast('Talep onaya gönderildi', 'ok');
  }
  function withdrawApproval() {
    if (x!.durum !== 'onayda') return;
    if (!confirm('Talep onaydan geri çekilip "fiyat toplama" durumuna alınacak. Fiyat revizesi yapabilirsiniz. Devam edilsin mi?'))
      return;
    mutate((d) => {
      const t = d.talepler.find((y) => y.id === x!.id)!;
      t.durum = 'toplama';
      if (t.onay) t.onay.gonderim = null;
    });
    toast('Talep onaydan geri çekildi — fiyat revizesi yapabilirsiniz', 'ok');
  }
  function indirimSil() {
    if (x!.gerceklesen && !confirm('Gerçekleşen/indirimli fiyat kaldırılsın mı?')) return;
    mutate((d) => {
      const t = d.talepler.find((y) => y.id === x!.id)!;
      t.gerceklesen = null;
    });
    toast('İndirim kaldırıldı', 'ok');
  }

  const teklifler = Array.isArray(x.teklifler) ? x.teklifler : [];
  const best = bestQuoteId(db, x);
  const sortedQ = [...teklifler].sort((a, b) => toTRY(db, a.fiyat, a.paraBirimi) - toTRY(db, b.fiyat, b.paraBirimi));
  const canSend = x.durum === 'toplama' && teklifler.length > 0;
  const yL = lokById(db, x.yuklemeLokasyonId);
  const tL = lokById(db, x.teslimLokasyonId);
  const kus = hasCoord(yL) && hasCoord(tL) ? haversine(yL, tL) : null;
  const son = sonIslem(db, x.yuklemeLokasyonId, x.teslimLokasyonId, x.id);
  const anlasmalar = findAnlasmalar(db, x.yuklemeLokasyonId, x.teslimLokasyonId, x.yukTipi);
  const trys = teklifler.map((q) => toTRY(db, q.fiyat, q.paraBirimi));
  const g = gerceklesenBirim(x);
  const sq = selectedQuote(x);
  const ind = indirimYuzde(db, x);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <button className="btn sm ghost" onClick={() => go('talepler')}>
          ← Talepler
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>{x.talepNo}</h2>
        <StatusBadge durum={x.durum} />
        <div style={{ flex: 1 }} />
        {x.durum === 'toplama' && (
          <button className="btn sm" onClick={() => openModal({ type: 'talep', id: x.id })}>
            Düzenle
          </button>
        )}
        {canSend && (
          <button className="btn sm gold" onClick={sendToApproval}>
            <Icon name="send" size={14} />
            Onaya Gönder
          </button>
        )}
        {x.durum === 'onayda' && (
          <button className="btn sm primary" onClick={() => openModal({ type: 'onay', id: x.id })}>
            Onay İşlemi
          </button>
        )}
        {x.durum === 'onayda' && (
          <button className="btn sm danger" onClick={withdrawApproval}>
            <Icon name="back" size={14} />
            Onaydan Geri Çek
          </button>
        )}
        {(x.durum === 'onayda' || x.durum === 'onaylandi') && (
          <button className="btn sm" onClick={() => setPrintJob({ type: 'single', id: x.id })}>
            <Icon name="print" size={14} />
            Rapor / Yazdır
          </button>
        )}
      </div>

      <div className="detail-grid">
        <div>
          <div className="route-box">
            <div className="pin">
              <div className="dot" />
              <div className="line" />
              <div className="dot end" />
            </div>
            <div className="places">
              <div>
                <div className="place-l">Yükleme</div>
                <div className="place">{x.yuklemeNoktasi}</div>
              </div>
              <div>
                <div className="place-l">Teslim</div>
                <div className="place">{x.teslimNoktasi}</div>
              </div>
            </div>
          </div>

          <div className="dist-box">
            <div>
              <div className="dv">
                {x.mesafeKm ? fmt(x.mesafeKm) + ' km' : hasCoord(yL) && hasCoord(tL) ? 'Hesaplanıyor…' : '—'}
              </div>
              <div className="dl">En Kısa Karayolu</div>
            </div>
            <div>
              <div className="dv" style={{ color: 'var(--muted)', fontSize: 16 }}>
                {kus != null ? fmt(Math.round(kus)) + ' km' : '—'}
              </div>
              <div className="dl">Kuş Uçuşu</div>
            </div>
            {x.mesafeKm && x.secilenTeklifId && sq ? (
              <div>
                <div className="dv" style={{ fontSize: 16 }}>
                  {money(qTotal(db, sq, x) / x.mesafeKm, 'TRY')}
                </div>
                <div className="dl">Seçilen ₺/km</div>
              </div>
            ) : null}
            <div style={{ flex: 1 }} />
            {hasCoord(yL) && hasCoord(tL) ? (
              <button
                className="btn sm ghost"
                onClick={() => hesaplaMesafe(x.id)}
                title="En kısa karayolu mesafesini yeniden hesapla"
              >
                <Icon name="refresh" size={14} />
                Yenile
              </button>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--amber)' }}>Mesafe için iki lokasyonun da konumu girilmeli</span>
            )}
          </div>

          {x.durum === 'toplama' && (son || anlasmalar.length) ? (
            <div className="panel" style={{ marginBottom: 16 }}>
              <div className="panel-body" style={{ padding: '14px 16px' }}>
                {anlasmalar.map((a) => (
                  <div
                    key={a.anlasma.id || a.firma.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line-2)' }}
                  >
                    <span className="tag" style={{ background: 'var(--gold-soft)', borderColor: 'var(--gold)', color: 'var(--amber)' }}>
                      ANLAŞMALI
                    </span>
                    <span>
                      <b>{a.firma.ad}</b> · <b>{money(a.anlasma.birimFiyat, a.anlasma.paraBirimi)}/{x.birim || 'ton'}</b>
                      {a.anlasma.yukTipi ? (
                        <> · <span style={{ color: 'var(--muted)' }}>{a.anlasma.yukTipi}</span></>
                      ) : (
                        <> · <span style={{ color: 'var(--faint)' }}>tüm ürünler</span></>
                      )}
                      {a.anlasma.tarih ? <> · <span style={{ color: 'var(--faint)' }}>{dt(a.anlasma.tarih)}</span></> : null}
                    </span>
                    <button
                      className="btn sm gold"
                      style={{ marginLeft: 'auto' }}
                      onClick={() =>
                        openModal({
                          type: 'teklif',
                          talepId: x.id,
                          presetFirma: a.firma.id,
                          presetFiyat: a.anlasma.birimFiyat,
                          presetPara: a.anlasma.paraBirimi,
                        })
                      }
                    >
                      Bu fiyatı teklif olarak ekle
                    </button>
                  </div>
                ))}
                {son && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', fontSize: 13, color: 'var(--muted)' }}>
                    <Icon name="history" size={15} />
                    Bu hatta önceki işlem: <b style={{ color: 'var(--text)' }}>{firmName(db, son.firmaId)}</b> ·{' '}
                    <b style={{ color: 'var(--text)' }}>
                      {money(son.birimFiyat, son.paraBirimi)}/{x.birim || 'ton'}
                    </b>{' '}
                    <span style={{ color: 'var(--faint)' }}>({dt(son.tarih)})</span>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div className="panel">
            <div className="panel-head">
              <h2>Teklifler ({teklifler.length})</h2>
              <div className="spacer" />
              {x.durum === 'toplama' && (
                <button className="btn sm primary" onClick={() => openModal({ type: 'teklif', talepId: x.id })}>
                  <Icon name="plus" size={14} sw={2.4} />
                  Teklif Ekle
                </button>
              )}
            </div>
            <div className="panel-body">
              {teklifler.length ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 14 }}>
                    {sortedQ.map((q) => {
                      const isBest = q.id === best;
                      const isSel = q.id === x.secilenTeklifId;
                      return (
                        <div key={q.id} className={'quote-card ' + (isBest ? 'best ' : '') + (isSel ? 'selected' : '')}>
                          {isSel ? (
                            <div className="qc-ribbon sel">SEÇİLDİ</div>
                          ) : isBest ? (
                            <div className="qc-ribbon best">EN UYGUN</div>
                          ) : null}
                          <div className="qc-head">
                            <div className="qc-avatar">{initials(firmName(db, q.firmaId))}</div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{firmName(db, q.firmaId)}</div>
                              <div style={{ fontSize: 11.5, color: 'var(--faint)' }}>{dt(q.createdAt)}</div>
                            </div>
                          </div>
                          <div className="qc-price">
                            <div className="amount">
                              {money(q.fiyat, q.paraBirimi)}
                              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)' }}>/{x.birim || 'ton'}</span>
                            </div>
                            <div className="unit-price">
                              {x.miktar ? (
                                <>
                                  Toplam: <b style={{ color: 'var(--text)' }}>{money(qTotal(db, q, x), 'TRY')}</b> (
                                  {fmtTon(x.miktar)} {x.birim})
                                </>
                              ) : q.paraBirimi !== 'TRY' ? (
                                <>≈ {money(toTRY(db, q.fiyat, q.paraBirimi), 'TRY')}/{x.birim || 'ton'}</>
                              ) : (
                                ''
                              )}
                            </div>
                          </div>
                          <div className="qc-meta">
                            <span className="tag">{q.kdvDahil ? 'KDV dahil' : 'KDV hariç'}</span>
                            {q.teslimSuresi ? <span className="tag">{q.teslimSuresi}</span> : null}
                            {q.gecerlilik ? <span className="tag">Geçerlilik: {dt(q.gecerlilik)}</span> : null}
                          </div>
                          {q.notlar ? (
                            <div style={{ padding: '0 15px 12px', fontSize: 12.5, color: 'var(--muted)' }}>{q.notlar}</div>
                          ) : null}
                          {x.durum === 'toplama' ? (
                            <div className="qc-actions">
                              <button className={'btn sm ' + (isSel ? 'gold' : '')} style={{ flex: 1 }} onClick={() => selectQuote(q.id)}>
                                {isSel ? '✓ Seçili' : 'Bunu seç'}
                              </button>
                              <button className="btn sm ghost" onClick={() => openModal({ type: 'teklif', talepId: x.id, teklifId: q.id })}>
                                ✎
                              </button>
                              <button className="btn sm danger" onClick={() => delQuote(q.id)}>
                                ✕
                              </button>
                            </div>
                          ) : isSel ? (
                            <div className="qc-actions">
                              <span style={{ color: 'var(--gold)', fontWeight: 600, fontSize: 12.5 }}>★ Onaya sunulan teklif</span>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  {teklifler.length > 1 && (
                    <div
                      style={{
                        marginTop: 16,
                        padding: '13px 15px',
                        background: 'var(--surface-2)',
                        borderRadius: 8,
                        border: '1px solid var(--line)',
                        fontSize: 13,
                        display: 'flex',
                        gap: 18,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <span style={{ color: 'var(--muted)' }}>Birim aralığı (₺/{x.birim || 'ton'}):</span>{' '}
                        <b>{money(Math.min(...trys), 'TRY')}</b> – <b>{money(Math.max(...trys), 'TRY')}</b>
                      </div>
                      <div>
                        <span style={{ color: 'var(--muted)' }}>Ortalama:</span>{' '}
                        <b>{money(trys.reduce((s, v) => s + v, 0) / teklifler.length, 'TRY')}/{x.birim || 'ton'}</b>
                      </div>
                      {x.miktar ? (
                        <div>
                          <span style={{ color: 'var(--muted)' }}>En uyguna göre tasarruf:</span>{' '}
                          <b style={{ color: 'var(--green)' }}>
                            {money((Math.max(...trys) - Math.min(...trys)) * (Number(x.miktar) || 0), 'TRY')}
                          </b>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {x.secilenTeklifId && g && (
                    <div
                      style={{
                        marginTop: 16,
                        padding: '14px 16px',
                        border: '1px solid ' + (g.indirimli ? 'var(--green)' : 'var(--line)'),
                        borderRadius: 10,
                        background: g.indirimli ? 'rgba(34,160,90,.07)' : 'var(--surface-2)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5 }}>İndirim / Gerçekleşen Fiyat</div>
                        <div style={{ flex: 1 }} />
                        <button className={'btn sm ' + (g.indirimli ? '' : 'primary')} onClick={() => openModal({ type: 'indirim', talepId: x.id })}>
                          {g.indirimli ? 'Düzenle' : 'Fiyat Gir'}
                        </button>
                        {g.indirimli && (
                          <button className="btn sm ghost" style={{ color: 'var(--red)' }} onClick={indirimSil}>
                            Kaldır
                          </button>
                        )}
                      </div>
                      {g.indirimli && sq ? (
                        <>
                          <div style={{ marginTop: 11, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <div>
                              <div style={{ fontSize: 11, color: 'var(--faint)' }}>Teklif</div>
                              <div style={{ textDecoration: 'line-through', color: 'var(--muted)' }}>
                                {money(sq.fiyat, sq.paraBirimi)}/{x.birim || 'ton'}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: 'var(--faint)' }}>Gerçekleşen (indirimli)</div>
                              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)' }}>
                                {money(g.birimFiyat, g.paraBirimi)}/{x.birim || 'ton'}
                              </div>
                            </div>
                            {x.miktar ? (
                              <div>
                                <div style={{ fontSize: 11, color: 'var(--faint)' }}>İndirimli Toplam</div>
                                <div style={{ fontSize: 15, fontWeight: 800 }}>{money(gercTotalTRY(db, x), 'TRY')}</div>
                              </div>
                            ) : null}
                            {ind != null ? (
                              <div>
                                <div style={{ fontSize: 11, color: 'var(--faint)' }}>İndirim</div>
                                <div style={{ fontWeight: 700, color: 'var(--green)' }}>▼ {ind.toFixed(1)}%</div>
                              </div>
                            ) : null}
                            {x.gerceklesen && x.gerceklesen.not ? (
                              <div style={{ flexBasis: '100%', fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', marginTop: 2 }}>
                                {x.gerceklesen.not}
                              </div>
                            ) : null}
                          </div>
                          <div style={{ marginTop: 9, fontSize: 11.5, color: 'var(--faint)' }}>
                            Bu fiyat raporlarda indirimli tutar olarak görünür ve bu hattın bir sonraki &quot;önceki fiyatı&quot; olarak baz alınır.
                          </div>
                        </>
                      ) : (
                        <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--muted)' }}>
                          Firma görüşme sonrası indirim yaptıysa gerçekleşen birim fiyatı girin — raporda indirimli tutar olarak çıkar ve bu hattın bir
                          sonraki &quot;önceki fiyatı&quot; olur.
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="empty" style={{ padding: 30 }}>
                  <h3>Henüz teklif girilmedi</h3>
                  <p>3-4 farklı nakliyeciden aldığınız fiyatları tek tek ekleyin; sistem en uygun olanı otomatik işaretler.</p>
                  {x.durum === 'toplama' && (
                    <button className="btn primary" onClick={() => openModal({ type: 'teklif', talepId: x.id })}>
                      + İlk Teklifi Ekle
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="panel">
            <div className="panel-head">
              <h2>Talep bilgileri</h2>
            </div>
            <div className="panel-body">
              <InfoRow l="Talep no" v={x.talepNo} />
              <InfoRow l="Yük tipi" v={x.yukTipi || '—'} />
              <InfoRow l="Miktar" v={x.miktar ? fmtTon(x.miktar) + ' ' + (x.birim || '') : '—'} />
              <InfoRow l="Araç tipi" v={x.aracTipi || '—'} />
              <InfoRow l="Yükleme tarihi" v={dt(x.yuklemeTarihi)} />
              <InfoRow l="Oluşturulma" v={dtt(x.createdAt)} />
              {x.aciklama ? (
                <div className="info-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div className="il">Açıklama</div>
                  <div className="iv" style={{ fontWeight: 400, marginTop: 4 }}>
                    {x.aciklama}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Süreç</h2>
            </div>
            <div className="panel-body">
              <div className="timeline">
                <div className="tl-item done">
                  <div className="tl-t">Talep oluşturuldu</div>
                  <div className="tl-d">{dtt(x.createdAt)}</div>
                </div>
                <div className={'tl-item ' + (teklifler.length ? 'done' : 'active')}>
                  <div className="tl-t">Fiyatlar toplandı</div>
                  <div className="tl-d">{teklifler.length} teklif girildi</div>
                </div>
                <div className={'tl-item ' + (x.durum === 'onayda' ? 'active' : x.durum === 'onaylandi' || x.durum === 'reddedildi' ? 'done' : '')}>
                  <div className="tl-t">Onaya gönderildi</div>
                  <div className="tl-d">{x.onay && x.onay.gonderim ? dtt(x.onay.gonderim) : '—'}</div>
                </div>
                <div className={'tl-item ' + (x.durum === 'onaylandi' ? 'done' : x.durum === 'reddedildi' ? 'reject' : '')}>
                  <div className="tl-t">{x.durum === 'reddedildi' ? 'Reddedildi' : 'Yönetim onayı'}</div>
                  <div className="tl-d">
                    {x.onay && x.onay.tarih ? dtt(x.onay.tarih) + (x.onay.yonetici ? ' · ' + x.onay.yonetici : '') : 'bekleniyor'}
                  </div>
                </div>
                <div className={'tl-item ' + (x.onay && x.onay.imzaliBelge ? 'done' : '')}>
                  <div className="tl-t">Islak imzalı belge</div>
                  <div className="tl-d">{x.onay && x.onay.imzaliBelge ? 'arşivlendi' : '—'}</div>
                </div>
              </div>
            </div>
          </div>

          {x.onay && (x.onay.not || x.onay.imzaliBelge) ? (
            <div className="panel">
              <div className="panel-head">
                <h2>Onay kaydı</h2>
              </div>
              <div className="panel-body">
                {x.onay.yonetici ? <InfoRow l="Onaylayan" v={x.onay.yonetici} /> : null}
                {x.onay.not ? (
                  <div className="info-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div className="il">Not</div>
                    <div className="iv" style={{ fontWeight: 400, marginTop: 4 }}>
                      {x.onay.not}
                    </div>
                  </div>
                ) : null}
                {x.onay.imzaliBelge ? (
                  <div
                    className="file-chip"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      if (!openSignedFile(x.onay!.imzaliBelge)) toast('Belge görüntülenemiyor', 'err');
                    }}
                  >
                    <div className="fi">
                      <Icon name="file" size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="fn">{x.onay.imzaliBelge.ad}</div>
                      <div className="fs">Islak imzalı · görüntülemek için tıklayın</div>
                    </div>
                  </div>
                ) : x.durum === 'onaylandi' ? (
                  <button className="btn sm" style={{ marginTop: 8 }} onClick={() => openModal({ type: 'onay', id: x.id })}>
                    + Islak imzalı belge ekle
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

function InfoRow({ l, v }: { l: string; v: React.ReactNode }) {
  return (
    <div className="info-row">
      <div className="il">{l}</div>
      <div className="iv">{v}</div>
    </div>
  );
}
