'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { money, fmtTon, dt } from '@/lib/format';
import { firmName, toTRY, efektifFiyat, efektifTotalTRY, priceAnalysisRows } from '@/lib/calc';

export function PrintPriceAnalysis({ startDate, endDate }: { startDate: string; endDate: string }) {
  const { db } = useStore();
  const list = priceAnalysisRows(db, startDate, endDate);
  if (!list.length) return null;

  let grand = 0;

  return (
    <div className="report-sheet wideform landscape">
      <div className="rh">
        <div className="rmark">S</div>
        <div>
          <h1>{db.meta.firma}</h1>
          <div className="meta">{db.meta.departman} · Fiyat Analizi Raporu</div>
        </div>
        <div className="rno">
          {dt(startDate)} – {dt(endDate)}
          <b>{fmtDateNow()}</b>
          {list.length} kayıt
        </div>
      </div>

      <h2>Dönem İçinde Gerçekleşen Taşımalar — Lokasyon &amp; Ürün Bazlı</h2>
      <table className="grid">
        <thead>
          <tr>
            <th>#</th>
            <th>Tarih</th>
            <th>Yükleme Lokasyonu</th>
            <th>Varış Noktası</th>
            <th>Ürün</th>
            <th>Firma</th>
            <th style={{ textAlign: 'right' }}>Miktar</th>
            <th style={{ textAlign: 'right' }}>
              Birim Fiyat
              <br />
              <span style={{ fontWeight: 400, color: '#cfe0f0', fontSize: 8.5 }}>₺</span>
            </th>
            <th style={{ textAlign: 'right' }}>
              Toplam
              <br />
              Tutar (₺)
            </th>
          </tr>
        </thead>
        <tbody>
          {list.map((t, i) => {
            const eff = efektifFiyat(db, t);
            const tot = efektifTotalTRY(db, t);
            grand += tot;
            return (
              <tr key={t.id}>
                <td style={{ textAlign: 'center' }}>{i + 1}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{dt(t.yuklemeTarihi || t.createdAt)}</td>
                <td>{t.yuklemeNoktasi}</td>
                <td>{t.teslimNoktasi}</td>
                <td>{t.yukTipi || '—'}</td>
                <td>{eff ? firmName(db, eff.firmaId) : '—'}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{t.miktar ? fmtTon(t.miktar) + ' ' + (t.birim || '') : '—'}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {eff ? money(toTRY(db, eff.birimFiyat, eff.paraBirimi), 'TRY') : '—'}
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 800 }}>{tot > 0 ? money(tot, 'TRY') : '—'}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={8} style={{ textAlign: 'right', fontWeight: 800, background: '#f4f7fb' }}>
              GENEL TOPLAM
            </td>
            <td style={{ textAlign: 'right', fontWeight: 800, background: '#f4f7fb' }}>{money(grand, 'TRY')}</td>
          </tr>
        </tfoot>
      </table>

      <div className="report-foot">
        Bu rapor {db.meta.firma} nakliye fiyat yönetim sistemi tarafından otomatik oluşturulmuştur · {fmtDateTimeNow()}
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
