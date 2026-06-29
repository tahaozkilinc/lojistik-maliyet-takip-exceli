'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { Icon } from './Icon';
import { TITLES } from '@/lib/constants';

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { ui, setUi, openModal, toast, db } = useStore();
  const [title, crumb] = TITLES[ui.view] || ['', ''];

  // Birincil eylem butonu görünüme göre değişir (orijinal go() davranışı).
  let primary: { label: string; onClick: () => void } | null;
  switch (ui.view) {
    case 'firmalar':
      primary = { label: 'Yeni Firma', onClick: () => openModal({ type: 'firma' }) };
      break;
    case 'lokasyonlar':
      primary = { label: 'Yeni Lokasyon', onClick: () => openModal({ type: 'lokasyon' }) };
      break;
    case 'denizNavlun':
      primary = { label: 'Yeni Navlun Kaydı', onClick: () => openModal({ type: 'navlun' }) };
      break;
    case 'karaNavlun':
      primary = { label: 'Yeni Kara Navlun Kaydı', onClick: () => openModal({ type: 'karaNavlun' }) };
      break;
    case 'analiz':
    case 'haritalar':
    case 'firmaDetay':
      primary = null;
      break;
    default:
      primary = {
        label: 'Yeni Talep',
        onClick: () => {
          if (!db.lokasyonlar.length) {
            toast('Önce en az bir lokasyon eklemelisiniz', 'err');
            openModal({ type: 'lokasyon' });
            return;
          }
          openModal({ type: 'talep' });
        },
      };
  }

  return (
    <div className="topbar">
      <button className="menu-toggle" onClick={onMenu} aria-label="Menü">
        <Icon name="menu" size={22} />
      </button>
      <div>
        <h1 id="pageTitle">{title}</h1>
        <div className="crumb" id="pageCrumb">
          {crumb}
        </div>
      </div>
      <div className="spacer" />
      <div className="search-box">
        <Icon name="search" size={16} />
        <input
          id="globalSearch"
          placeholder="Talep, güzergah, firma ara…"
          value={ui.search}
          onChange={(e) => setUi({ search: e.target.value })}
        />
      </div>
      {primary && (
        <button className="btn primary" onClick={primary.onClick}>
          <Icon name="plus" size={16} sw={2.4} />
          {primary.label}
        </button>
      )}
    </div>
  );
}
