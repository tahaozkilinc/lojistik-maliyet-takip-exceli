'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { money, fmt, fmtTon } from '@/lib/format';
import { firmName, toTRY, bestQuoteId, routeKmInfo, gerceklesenBirim, indirimYuzde, gercTotalTRY, sonIslem } from '@/lib/calc';

export function PrintCombined({ ids }: { ids: string[] }) {
  const { db } = useStore();
  const idSet = new Set(ids);
  const list = db.talepler.filter((x) => idSet.has(x.id) && x.durum === 'onayda');
  if (!list.length) return null;

  const firmIds: string[] = [];
  list.forEach((t) => t.teklifler.forEach((q) => { if (!firmIds.includes(q.firmaId)) firmIds.push(q.firmaId); }));
  firmIds.sort((a, b) => firmName(db, a).localeCompare(firmName(db, b), 'tr'));

  let grand = 0;
  const preColspan = 5 + firmIds.length + 1;

  return (
    <div className="report-sheet wideform landscape">
      <div className="rh">
        <div className="rmark">S</div>
        <div>
          <h1>{db.meta.firma}</h1>
          <div className="meta">{db.meta.departman} · Toplu Nakliye Onay Formu</div>
        </div>
        <div className="rno">
          Form Tarihi
          <b>{fmtDateNow()}</b>
          {list.length} talep · {firmIds.length} tedarikçi
        </div>
      </div>

      <h2>Onaya Sunulan Talepler — Tedarikçi Fiyat Karşılaştırma Tablosu</h2>
      <table className="grid">
        <thead>
          <tr>
            <th>#</th>
            <th>HAT</th>
            <th>Yük</th>
            <th>Miktar</th>
            <th style={{ textAlign: 'right' }}>
              Önceki
              <br />
              <span style={{ fontWeight: 400, color: '#cfe0f0', fontSize: 8.5 }}>₺/birim</span>
            </th>
            {firmIds.map((fid) => (
              <th key={fid} style={{ textAlign: 'right' }}>
                {firmName(db, fid)}
                <br />
                <span style={{ fontWeight: 400, color: '#cfe0f0', fontSize: 8.5 }}>₺/birim</span>
              </th>
            ))}
            <th style={{ textAlign: 'right' }}>
              Birim
              <br />
              Fiyat
            </th>
            <th style={{ textAlign: 'right' }}>
              Toplam
              <br />
              Tutar
            </th>
          </tr>
        </thead>
        <tbody>
          {list.map((t, i) => {
            const sel = t.secilenTeklifId || bestQuoteId(db, t);
            const g = gerceklesenBirim(t);
            const indy = indirimYuzde(db, t);
            const onc = sonIslem(db, t.yuklemeLokasyonId, t.teslimLokasyonId, t.id);
            const tot = gercTotalTRY(db, t);
            grand += tot;
            const unitTRYs = t.teklifler.map((q) => toTRY(db, q.fiyat, q.paraBirimi));
            const minU = unitTRYs.length ? Math.min(...unitTRYs) : null;
            const rk = routeKmInfo(db, t);
            return (
              <tr key={t.id}>
                <td style={{ textAlign: 'center' }}>{i + 1}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <b>{t.yuklemeNoktasi}</b> → <b>{t.teslimNoktasi}</b>
                  {rk ? (
                    <>
                      <br />
                      <span style={{ fontWeight: 400, color: '#5f6f80', fontSize: 8.5 }}>
                        {fmt(rk.km)} km{rk.approx ? '~' : ''} (en kısa karayolu)
                      </span>
                    </>
                  ) : null}
                </td>
                <td>{t.yukTipi || '—'}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{t.miktar ? fmtTon(t.miktar) + ' ' + (t.birim || '') : '—'}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', color: '#5f6f80' }}>{onc ? money(onc.birimFiyat, onc.paraBirimi) : '—'}</td>
                {firmIds.map((fid) => {
                  const q = t.teklifler.find((x) => x.firmaId === fid);
                  if (!q) return <td key={fid} style={{ textAlign: 'right', color: '#c7d0db' }}>—</td>;
                  const isSel = q.id === sel;
                  const isMin = toTRY(db, q.fiyat, q.paraBirimi) === minU;
                  const st: React.CSSProperties = { textAlign: 'right', whiteSpace: 'nowrap' };
                  if (isSel) {
                    st.background = '#ffdd7a';
                    st.color = '#5c4200';
                    st.fontWeight = 800;
                    st.border = '1.5px solid #c9a227';
                  } else if (isMin) {
                    st.background = '#dcf3e4';
                    st.color = '#0f4d2b';
                    st.fontWeight = 700;
                  }
                  return (
                    <td key={fid} style={st}>
                      {isSel ? '★ ' : ''}
                      {money(q.fiyat, q.paraBirimi)}
                    </td>
                  );
                })}
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 800 }}>
                  {g ? money(g.birimFiyat, g.paraBirimi) : '—'}
                  {g && g.indirimli ? (
                    <>
                      <br />
                      <span style={{ fontWeight: 500, color: '#14633a', fontSize: 9.5 }}>
                        indirimli{indy != null ? ' ▼' + indy.toFixed(1) + '%' : ''}
                      </span>
                    </>
                  ) : null}
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 800 }}>{money(tot, 'TRY')}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={preColspan} style={{ textAlign: 'right', fontWeight: 800, background: '#f4f7fb' }}>
              GENEL TOPLAM
            </td>
            <td style={{ textAlign: 'right', fontWeight: 800, background: '#f4f7fb' }}>{money(grand, 'TRY')}</td>
          </tr>
        </tfoot>
      </table>
      <div style={{ fontSize: 10, color: '#8a98a8', marginTop: 4 }}>
        <span style={{ background: '#ffdd7a', color: '#5c4200', fontWeight: 700, padding: '1px 6px', border: '1.5px solid #c9a227', borderRadius: 3 }}>
          ★ sarı
        </span>{' '}
        = önerilen/seçilen teklif &nbsp;·&nbsp;{' '}
        <span style={{ background: '#dcf3e4', color: '#0f4d2b', fontWeight: 700, padding: '1px 6px', borderRadius: 3 }}>yeşil</span> = satırdaki en
        düşük fiyat &nbsp;·&nbsp; Tutarlar birim × tonaj olarak TRY&apos;ye çevrilmiş, indirim girildiyse gerçekleşen fiyat esas alınmıştır. &nbsp;·&nbsp;
        Geniş tablo; gerekirse <b>yatay (landscape)</b> yazdırın.
      </div>

      <div style={{ marginTop: 24, display: 'flex', gap: 20, alignItems: 'stretch', breakInside: 'avoid' }}>
        <div className="sign-box" style={{ flex: 1 }}>
          <div className="sn">Hazırlayan</div>
          <div className="sl" style={{ marginTop: 46 }}>
            {db.meta.departman}
            <br />
            Tarih: ......./......./..........
          </div>
        </div>
        <div style={{ flex: 1.6, border: '1.6px solid #173a5e', borderRadius: 8, padding: '13px 16px', minHeight: 120, position: 'relative' }}>
          <div style={{ fontWeight: 800, color: '#173a5e', fontSize: 12.5, textTransform: 'uppercase', letterSpacing: '.6px' }}>Onay — Kaşe &amp; İmza</div>
          <div style={{ fontSize: 11.5, color: '#7a8694', marginTop: 4 }}>Yönetim Onayı · Tarih: ......./......./..........</div>
          <div style={{ position: 'absolute', bottom: 12, right: 16, color: '#c2ccd6', fontSize: 11, fontStyle: 'italic' }}>(kaşe &amp; ıslak imza)</div>
        </div>
      </div>
      <div className="report-foot">
        Bu toplu onay formu {db.meta.firma} nakliye fiyat yönetim sistemi tarafından otomatik oluşturulmuştur · {fmtDateTimeNow()}
      </div>
    </div>
  );
}

function fmtDateNow() {
  return new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtDateTimeNow() {
  const d = new Date();
  return (
    d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  );
}
