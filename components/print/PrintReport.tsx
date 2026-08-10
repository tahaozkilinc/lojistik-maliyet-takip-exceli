'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { money, fmt, fmtTon, dt, dtt } from '@/lib/format';
import { firmName, qTotal, toTRY, bestQuoteId, sonIslem, gerceklesenBirim, gercTotalTRY, indirimYuzde } from '@/lib/calc';

export function PrintReport({ id }: { id: string }) {
  const { db } = useStore();
  const t = db.talepler.find((x) => x.id === id);
  if (!t) return null;

  const sorted = [...t.teklifler].sort((a, b) => toTRY(db, a.fiyat, a.paraBirimi) - toTRY(db, b.fiyat, b.paraBirimi));
  const sel = t.secilenTeklifId || bestQuoteId(db, t);
  const selQ = t.teklifler.find((q) => q.id === sel);
  const onc = sonIslem(db, t.yuklemeLokasyonId, t.teslimLokasyonId, t.id);
  const gr = gerceklesenBirim(t);
  const indy = indirimYuzde(db, t);
  const trys = t.teklifler.map((q) => toTRY(db, q.fiyat, q.paraBirimi));

  return (
    <div className="report-sheet">
      <div className="rh">
        <div className="rmark">S</div>
        <div>
          <h1>{db.meta.firma}</h1>
          <div className="meta">{db.meta.departman} · Nakliye Fiyat Onay Formu</div>
        </div>
        <div className="rno">
          Form Tarihi
          <b>{dt(new Date().toISOString())}</b>
          {t.yuklemeNoktasi} → {t.teslimNoktasi}
        </div>
      </div>

      <h2>Nakliye Bilgileri</h2>
      <div className="report-grid">
        <div className="rg">
          <b>Yükleme</b>
          {t.yuklemeNoktasi}
        </div>
        <div className="rg">
          <b>Teslim</b>
          {t.teslimNoktasi}
        </div>
        <div className="rg">
          <b>Yük tipi</b>
          {t.yukTipi || '—'}
        </div>
        <div className="rg">
          <b>Miktar</b>
          {t.miktar ? fmtTon(t.miktar) + ' ' + (t.birim || '') : '—'}
        </div>
        <div className="rg">
          <b>Araç tipi</b>
          {t.aracTipi || '—'}
        </div>
        <div className="rg">
          <b>Yükleme tarihi</b>
          {dt(t.yuklemeTarihi)}
        </div>
        <div className="rg">
          <b>Mesafe</b>
          {t.mesafeKm ? fmt(t.mesafeKm) + ' km (en kısa karayolu)' : '—'}
        </div>
      </div>
      {t.aciklama ? (
        <div style={{ fontSize: 12.5, marginTop: 4 }}>
          <b style={{ color: '#5f6f80' }}>Açıklama:</b> {t.aciklama}
        </div>
      ) : null}
      {onc ? (
        <div style={{ fontSize: 12, marginTop: 8, color: '#5f6f80' }}>
          Bu hatta önceki fiyat: <b>{firmName(db, onc.firmaId)}</b> ·{' '}
          <b>
            {money(onc.birimFiyat, onc.paraBirimi)}/{t.birim || 'ton'}
          </b>
          {onc.indirimli ? ' (indirimli)' : ''} <span style={{ color: '#9aa6b2' }}>({dt(onc.tarih)})</span>
          {onc.yukTipi ? (
            onc.yukTipi !== t.yukTipi ? (
              <b style={{ color: '#b9821a' }}> · {onc.yukTipi} — farklı ürün!</b>
            ) : (
              <span> · {onc.yukTipi}</span>
            )
          ) : null}
        </div>
      ) : null}

      <h2>Alınan Teklifler — Tüm Tedarikçiler ({t.teklifler.length})</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Tedarikçi (Nakliye Firması)</th>
            <th>Birim Fiyat</th>
            <th>Toplam Tutar</th>
            <th>KDV</th>
            <th>Teslim</th>
            <th>Geçerlilik</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((q, i) => {
            const isSel = q.id === sel;
            return (
              <tr key={q.id} className={isSel ? 'rec' : undefined}>
                <td>
                  {i + 1}
                  {isSel ? ' ★' : ''}
                </td>
                <td>{firmName(db, q.firmaId)}</td>
                <td>
                  {money(q.fiyat, q.paraBirimi)}/{t.birim || 'ton'}
                </td>
                <td>{t.miktar ? money(qTotal(db, q, t), 'TRY') : '—'}</td>
                <td>{q.kdvDahil ? 'Dahil' : 'Hariç'}</td>
                <td>{q.teslimSuresi || '—'}</td>
                <td>{q.gecerlilik ? dt(q.gecerlilik) : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ fontSize: 11.5, color: '#8a98a8', marginTop: 6 }}>
        ★ ile işaretli satır önerilen tekliftir.{' '}
        {t.teklifler.length > 1 ? (
          <>
            En düşük–en yüksek birim fiyat farkı:{' '}
            <b>
              {money(Math.max(...trys) - Math.min(...trys), 'TRY')}/{t.birim || 'ton'}
            </b>
            {t.miktar ? <> (toplamda {money((Math.max(...trys) - Math.min(...trys)) * (Number(t.miktar) || 0), 'TRY')})</> : ''}.
          </>
        ) : null}
      </div>

      <h2>Öneri</h2>
      <div style={{ fontSize: 13.5 }}>
        {selQ ? (
          <>
            <b>{firmName(db, selQ.firmaId)}</b> firmasının{' '}
            <b>
              {money(selQ.fiyat, selQ.paraBirimi)}/{t.birim || 'ton'}
            </b>{' '}
            birim fiyatlı teklifi
            {t.miktar ? (
              <>
                , toplam <b>{money(qTotal(db, selQ, t), 'TRY')}</b>,
              </>
            ) : null}{' '}
            onaylanması önerilmektedir.
          </>
        ) : (
          'Önerilen teklif seçilmemiştir.'
        )}
      </div>
      {gr && gr.indirimli ? (
        <div style={{ marginTop: 10, padding: '9px 12px', border: '1.4px solid #1a7a44', borderRadius: 7, background: '#f0faf4', fontSize: 13, color: '#14633a' }}>
          <b>Görüşme sonrası gerçekleşen (indirimli) fiyat:</b> {firmName(db, gr.firmaId)} ·{' '}
          <b>
            {money(gr.birimFiyat, gr.paraBirimi)}/{t.birim || 'ton'}
          </b>
          {t.miktar ? (
            <>
              {' '}· toplam <b>{money(gercTotalTRY(db, t), 'TRY')}</b>
            </>
          ) : null}
          {indy != null ? ` (▼ ${indy.toFixed(1)}% indirim)` : ''}
          {t.gerceklesen && t.gerceklesen.not ? ' · ' + t.gerceklesen.not : ''}
        </div>
      ) : null}

      <div className="sign-area">
        <div className="sign-box">
          <div className="sn">Hazırlayan</div>
          <div className="sl">{db.meta.departman}</div>
        </div>
        <div className="sign-box">
          <div className="sn">Onaylayan (Islak İmza)</div>
          <div className="sl">Yönetim · Tarih: ......./......./..........</div>
        </div>
      </div>
      <div className="report-foot">
        Bu form {db.meta.firma} nakliye fiyat yönetim sistemi tarafından otomatik oluşturulmuştur · {dtt(new Date().toISOString())}
      </div>
    </div>
  );
}
