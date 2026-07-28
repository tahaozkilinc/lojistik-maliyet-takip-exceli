'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { Icon } from './Icon';
import { TITLES } from '@/lib/constants';

const SEARCH_VIEWS = new Set<string>(['talepler', 'onaylar', 'firmalar', 'lokasyonlar', 'navlunFirmalar', 'haritalar', 'tasimaTalepleri']);

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { ui, setUi, openModal, toast, db, go, syncState } = useStore();
  const [title, crumb] = TITLES[ui.view] || ['', ''];

  // Birincil eylem butonu yalnızca ilgili bölümde görünür; diğer sayfalarda buton yok.
  let primary: { label: string; onClick: () => void } | null;
  let secondary: { label: string; onClick: () => void } | null = null;
  switch (ui.view) {
    case 'talepler':
    case 'detail':
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
      break;
    case 'firmalar':
      primary = { label: 'Yeni Firma', onClick: () => openModal({ type: 'firma' }) };
      break;
    case 'lokasyonlar':
      primary = { label: 'Yeni Lokasyon', onClick: () => openModal({ type: 'lokasyon' }) };
      secondary = { label: 'Toplu Ekle', onClick: () => openModal({ type: 'lokasyonToplu' }) };
      break;
    case 'denizNavlun':
      primary = { label: 'Yeni Navlun Kaydı', onClick: () => openModal({ type: 'navlun' }) };
      break;
    case 'karaNavlun':
      primary = { label: 'Yeni Kara Navlun Kaydı', onClick: () => openModal({ type: 'karaNavlun' }) };
      break;
    case 'tasimaTalepleri':
    case 'tasimaTalepDetay':
      primary = { label: 'Yeni Taşıma Talebi', onClick: () => openModal({ type: 'tasimaTalep' }) };
      break;
    default:
      primary = null;
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
      {syncState !== 'idle' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 20,
            fontSize: 12.5,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            background: syncState === 'error' ? 'var(--red-bg)' : 'var(--surface-2)',
            color: syncState === 'error' ? 'var(--red)' : 'var(--muted)',
            border: '1px solid ' + (syncState === 'error' ? 'var(--red)' : 'var(--line)'),
          }}
          title={
            syncState === 'error'
              ? 'Son değişiklik sunucuya kaydedilemedi — otomatik olarak yeniden deneniyor. Sayfayı kapatmadan önce bağlantının düzeldiğinden emin olun.'
              : 'Değişiklik sunucuya kaydediliyor…'
          }
        >
          <Icon name={syncState === 'error' ? 'warning' : 'refresh'} size={13} className={syncState === 'saving' ? 'spin' : undefined} />
          {syncState === 'error' ? 'Kaydedilemedi — yeniden deneniyor' : 'Kaydediliyor…'}
        </div>
      )}
      <div className="search-box">
        <Icon name="search" size={16} />
        <input
          id="globalSearch"
          placeholder="Talep, güzergah, firma ara…"
          value={ui.search}
          onChange={(e) => {
            if (e.target.value && !SEARCH_VIEWS.has(ui.view)) go('talepler');
            setUi({ search: e.target.value });
          }}
        />
      </div>
      {secondary && (
        <button className="btn" onClick={secondary.onClick}>
          <Icon name="upload" size={16} />
          {secondary.label}
        </button>
      )}
      {primary && (
        <button className="btn primary" onClick={primary.onClick}>
          <Icon name="plus" size={16} sw={2.4} />
          {primary.label}
        </button>
      )}
    </div>
  );
}
