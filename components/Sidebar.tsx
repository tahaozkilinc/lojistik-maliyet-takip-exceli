'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { Icon, type IconName } from './Icon';
import type { ViewKey } from '@/lib/constants';

const NAV: { group: string; items: { view: ViewKey; label: string; icon: IconName; badge?: 'talep' | 'onay' }[] }[] = [
  {
    group: 'Operasyon',
    items: [
      { view: 'dashboard', label: 'Panel', icon: 'panel' },
      { view: 'talepler', label: 'Nakliye Talepleri', icon: 'talepler', badge: 'talep' },
      { view: 'onaylar', label: 'Onay Merkezi', icon: 'onaylar', badge: 'onay' },
    ],
  },
  {
    group: 'Kayıt',
    items: [
      { view: 'firmalar', label: 'Nakliye Firmaları', icon: 'building' },
      { view: 'lokasyonlar', label: 'Lokasyonlar', icon: 'mappin' },
      { view: 'haritalar', label: 'Haritalar', icon: 'map' },
      { view: 'analiz', label: 'Fiyat Analizi', icon: 'chart' },
    ],
  },
  {
    group: 'Navlun Takibi',
    items: [
      { view: 'denizNavlun', label: 'Deniz Navlun', icon: 'ship' },
      { view: 'karaNavlun', label: 'Kara Navlun', icon: 'truck' },
      { view: 'navlunFirmalar', label: 'Navlun Firmaları', icon: 'users' },
      { view: 'limanTalepleri', label: 'Liman Masrafları', icon: 'ship' },
    ],
  },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { db, ui, go, toggleTheme, openModal, logout } = useStore();

  const navTalep = db.talepler.filter((x) => x.durum === 'toplama').length;
  const navOnay = db.talepler.filter((x) => x.durum === 'onayda').length;

  return (
    <aside className={'sidebar' + (open ? ' open' : '')} id="sidebar">
      <div className="brand">
        <div className="logo">
          <div className="mark">S</div>
          <div>
            <div className="name">Nakliye Yönetimi</div>
            <div className="sub">Fiyat • Karşılaştırma • Onay</div>
          </div>
        </div>
      </div>
      <nav className="nav">
        {NAV.map((g) => (
          <React.Fragment key={g.group}>
            <div className="nav-label">{g.group}</div>
            {g.items.map((it) => (
              <a
                key={it.view}
                data-view={it.view}
                className={ui.view === it.view ? 'active' : undefined}
                onClick={() => {
                  go(it.view);
                  onClose();
                }}
              >
                <Icon name={it.icon} className="ico" />
                {it.label}
                {it.badge === 'talep' && <span className="badge">{navTalep}</span>}
                {it.badge === 'onay' && <span className="badge">{navOnay}</span>}
              </a>
            ))}
          </React.Fragment>
        ))}
      </nav>
      <div className="side-foot">
        <button onClick={() => openModal({ type: 'profil' })} title="Profil">
          <Icon name="user" size={14} />
          Profil
        </button>
        <button className="icon-only" onClick={toggleTheme} title="Tema">
          <Icon name="sun" size={14} />
        </button>
        <button
          className="icon-only"
          onClick={() => {
            if (confirm('Oturumu kapatmak istiyor musunuz?')) logout();
          }}
          title="Çıkış"
        >
          <Icon name="logout" size={14} />
        </button>
      </div>
    </aside>
  );
}
