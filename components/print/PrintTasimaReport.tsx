'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { money, dt, dtt } from '@/lib/format';
import { toTRY, navlunFirmName } from '@/lib/calc';
import {
  TASIMA_MODLAR,
  tasimaBestQuoteId,
  tasimaEfektifFiyat,
  tasimaIndirimYuzde,
  tasimaGecmisi,
  tasimaModLabel,
} from '@/lib/tasima';

export function PrintTasimaReport({ id }: { id: string }) {
  const { db } = useStore();
  const t = db.tasimaTalepleri.find((x) => x.id === id);
  if (!t) return null;

  const sorted = [...t.teklifler].sort((a, b) => toTRY(db, a.fiyat, a.paraBirimi) - toTRY(db, b.fiyat, b.paraBirimi));
  const selId = t.secilenTeklifId || tasimaBestQuoteId(db, t);
  const selQ = t.teklifler.find((q) => q.id === selId);
  const eff = tasimaEfektifFiyat(db, t);
  const indy = tasimaIndirimYuzde(db, t);
  const trys = t.teklifler.map((q) => toTRY(db, q.fiyat, q.paraBirimi));
  const gecmis = tasimaGecmisi(db, t.kalkisYeri, t.varisYeri, t.id);
  const onc = gecmis.find((g) => tasimaEfektifFiyat(db, g));
  const oncEff = onc ? tasimaEfektifFiyat(db, onc) : null;

  return (
    <div className="report-sheet">
      <div className="rh">
        <div className="rmark">S</div>
        <div>
          <h1>{db.meta.firma}</h1>
          <div className="meta">{db.meta.departman} · Taşıma Fiyat Onay Formu</div>
        </div>
        <div className="rno">
          Form Tarihi
          <b>{dt(new Date().toISOString())}</b>
          {t.kalkisYeri} → {t.varisYeri}
        </div>
      </div>

      <h2>Taşıma Bilgileri</h2>
      <div className="report-grid">
        <div className="rg">
          <b>Sipariş No</b>
          {t.siparisNo || t.talepNo}
        </div>
        <div className="rg">
          <b>Kalkış Yeri</b>
          {t.kalkisYeri}
        </div>
        <div className="rg">
          <b>Varış Yeri</b>
          {t.varisYeri}
        </div>
        <div className="rg">
          <b>Yük</b>
          {t.yukTipi || '—'}
        </div>
        <div className="rg">
          <b>Yük Sahibi Firma</b>
          {t.yukSahibiFirma || t.tasiyiciFirma || '—'}
        </div>
        <div className="rg">
          <b>Incoterms</b>
          {t.incoterm || '—'}
        </div>
        <div className="rg">
          <b>Tarih</b>
          {t.tarih ? dt(t.tarih) : '—'}
        </div>
      </div>
      {t.notlar ? (
        <div style={{ fontSize: 12.5, marginTop: 4 }}>
          <b style={{ color: '#5f6f80' }}>Not:</b> {t.notlar}
        </div>
      ) : null}
      {onc && oncEff ? (
        <div style={{ fontSize: 12, marginTop: 8, color: '#5f6f80' }}>
          Bu güzergahta önceki taşıma: <b>{navlunFirmName(db, oncEff.firmaId)}</b> · <b>{money(oncEff.fiyat, oncEff.paraBirimi)}</b>
          {oncEff.indirimli ? ' (indirimli)' : ''} <span style={{ color: '#9aa6b2' }}>({dt(onc.tarih || onc.createdAt)})</span>
        </div>
      ) : null}

      <h2>Alınan Fiyatlar — Tüm Firmalar ({t.teklifler.length})</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Firma (Navlun Firması)</th>
            <th>Mod</th>
            <th>Fiyat</th>
            <th>TRY Karşılığı</th>
            <th>Not</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((q, i) => {
            const isSel = q.id === selId;
            return (
              <tr key={q.id} className={isSel ? 'rec' : undefined}>
                <td>
                  {i + 1}
                  {isSel ? ' ★' : ''}
                </td>
                <td>{navlunFirmName(db, q.firmaId)}</td>
                <td>{tasimaModLabel(q.mod)}</td>
                <td>{money(q.fiyat, q.paraBirimi)}</td>
                <td>{money(toTRY(db, q.fiyat, q.paraBirimi), 'TRY')}</td>
                <td>{q.notlar || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ fontSize: 11.5, color: '#8a98a8', marginTop: 6 }}>
        ★ ile işaretli satır önerilen fiyattır.{' '}
        {t.teklifler.length > 1 ? (
          <>
            En düşük–en yüksek TRY farkı: <b>{money(Math.max(...trys) - Math.min(...trys), 'TRY')}</b>.
          </>
        ) : null}
      </div>

      <h2>Öneri</h2>
      <div style={{ fontSize: 13.5 }}>
        {selQ ? (
          <>
            <b>{navlunFirmName(db, selQ.firmaId)}</b> firmasının <b>{money(selQ.fiyat, selQ.paraBirimi)}</b> ({tasimaModLabel(selQ.mod)})
            fiyatlı teklifinin onaylanması önerilmektedir.
          </>
        ) : (
          'Önerilen fiyat seçilmemiştir.'
        )}
      </div>
      {eff && eff.indirimli ? (
        <div style={{ marginTop: 10, padding: '9px 12px', border: '1.4px solid #1a7a44', borderRadius: 7, background: '#f0faf4', fontSize: 13, color: '#14633a' }}>
          <b>Görüşme sonrası gerçekleşen (indirimli) fiyat:</b> {navlunFirmName(db, eff.firmaId)} · <b>{money(eff.fiyat, eff.paraBirimi)}</b>
          {indy != null ? ` (▼ ${indy.toFixed(1)}% indirim)` : ''}
          {t.gerceklesen && t.gerceklesen.not ? ' · ' + t.gerceklesen.not : ''}
        </div>
      ) : null}

      {t.onay && (t.durum === 'onaylandi' || t.durum === 'reddedildi') ? (
        <div style={{ fontSize: 12.5, marginTop: 12 }}>
          <b style={{ color: '#5f6f80' }}>Karar:</b> {t.durum === 'onaylandi' ? 'Onaylandı' : 'Reddedildi'}
          {t.onay.yonetici ? ' · Onaylayan: ' + t.onay.yonetici : ''}
          {t.onay.tarih ? ' · ' + dt(t.onay.tarih) : ''}
          {t.onay.not ? ' · ' + t.onay.not : ''}
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
