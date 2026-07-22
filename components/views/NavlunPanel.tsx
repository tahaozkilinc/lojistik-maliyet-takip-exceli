'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { navlunYillar, navlunHatlar, navlunFirmaAySeri } from '@/lib/navlun';
import { Icon } from '@/components/Icon';
import { NavlunPanelChart } from './NavlunPanelChart';

export function NavlunPanel() {
  const { db, ui, setUi, openModal } = useStore();

  if (!db.denizNavlun.length) {
    return (
      <div className="empty" style={{ padding: '60px 24px' }}>
        <Icon name="chart" size={46} sw={1.5} style={{ color: 'var(--navy-3)', opacity: 0.5 }} />
        <h3 style={{ marginTop: 14 }}>Henüz grafik için veri yok</h3>
        <p>
          Çin ve muhtelif limanlardan aldığınız <b>20′</b> ve <b>40′</b> konteyner navlun fiyatlarını{' '}
          <b>Deniz Navlun</b> bölümünden firma bazında girin; burada aylara göre firma karşılaştırma grafiği olarak
          görünsün.
        </p>
        <button className="btn primary" style={{ marginTop: 14 }} onClick={() => openModal({ type: 'navlun' })}>
          <Icon name="plus" size={16} sw={2.4} />
          Yeni Navlun Kaydı
        </button>
      </div>
    );
  }

  const yil = ui.navlunPanelYil;
  const hat = ui.navlunPanelHat;
  const tip = ui.navlunPanelTip;
  const yillar = navlunYillar(db);
  const hatlar = navlunHatlar(db);
  const series = navlunFirmaAySeri(db, yil, hat, tip);

  return (
    <>
      <div className="hint" style={{ marginBottom: 16 }}>
        Çin ve muhtelif limanlardan alınan <b>20′</b> ve <b>40′</b> konteyner navlun fiyatlarının, firma bazında aylık
        karşılaştırması. Veri kaynağı: <b>Deniz Navlun</b> bölümüne girilen (doğrudan ya da firma teklifleri
        kıyaslamasıyla eklenen) kayıtlar. Fiyatlar karşılaştırılabilir olması için USD&apos;ye çevrilerek gösterilir.
      </div>

      <div className="filter-bar" style={{ marginBottom: 18 }}>
        <div className="field" style={{ marginBottom: 0, minWidth: 120 }}>
          <label style={{ fontSize: 11 }}>Yıl</label>
          <select value={yil} onChange={(e) => setUi({ navlunPanelYil: +e.target.value })}>
            {yillar.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0, minWidth: 200 }}>
          <label style={{ fontSize: 11 }}>Hat / Güzergah</label>
          <select value={hat} onChange={(e) => setUi({ navlunPanelHat: e.target.value })}>
            <option value="__all">Tümü</option>
            {hatlar.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0, minWidth: 110 }}>
          <label style={{ fontSize: 11 }}>Konteyner</label>
          <select value={tip} onChange={(e) => setUi({ navlunPanelTip: e.target.value as 'c20' | 'c40' })}>
            <option value="c20">20′</option>
            <option value="c40">40′</option>
          </select>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn primary" onClick={() => openModal({ type: 'navlun' })}>
          <Icon name="plus" size={15} sw={2.4} />
          Yeni Navlun Kaydı
        </button>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>
            {tip === 'c20' ? '20′' : '40′'} Konteyner — Firma Bazlı Aylık Fiyatlar ({yil}
            {hat !== '__all' ? ' · ' + hat : ''})
          </h2>
          <div className="spacer" />
          <span style={{ fontSize: 12, color: 'var(--faint)' }}>Para birimi: USD</span>
        </div>
        <div className="panel-body">
          <NavlunPanelChart series={series} />
        </div>
      </div>
    </>
  );
}
