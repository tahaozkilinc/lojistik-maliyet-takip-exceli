'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { Icon, type IconName } from './Icon';
import type { ViewKey } from '@/lib/constants';

const NAV: { group: string; items: { view: ViewKey; label: string; icon: IconName; badge?: 'talep' | 'onay' | 'tasima' }[] }[] = [
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
    group: 'İthalat Nakliye Takibi',
    items: [
      { view: 'navlunPanel', label: 'Panel', icon: 'panel' },
      { view: 'tasimaTalepleri', label: 'Taşıma Talepleri', icon: 'send', badge: 'tasima' },
      { view: 'denizNavlun', label: 'Deniz Navlun', icon: 'ship' },
      { view: 'navlunFirmalar', label: 'Navlun Firmaları', icon: 'users' },
    ],
  },
  {
    group: 'Liman ve Depo',
    items: [
      { view: 'limanTalepleri', label: 'Liman ve Depo Masrafı', icon: 'ship' },
      { view: 'limanFirmalari', label: 'Liman Firmaları', icon: 'users' },
    ],
  },
];

const YONETIM_GROUP: { group: string; items: { view: ViewKey; label: string; icon: IconName; badge?: 'talep' | 'onay' | 'tasima' }[] } = {
  group: 'Yönetim',
  items: [{ view: 'kullaniciRolleri', label: 'Kullanıcı Rolleri', icon: 'lock' }],
};

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { db, ui, go, toggleTheme, openModal, logout, role } = useStore();

  const navTalep = db.talepler.filter((x) => x.durum === 'toplama').length;
  const navOnay =
    db.talepler.filter((x) => x.durum === 'onayda').length +
    db.tasimaTalepleri.filter((x) => x.durum === 'onayda').length;
  const navTasima = db.tasimaTalepleri.filter((x) => x.durum === 'toplama').length;
  const nav = role === 'admin' ? [...NAV, YONETIM_GROUP] : NAV;

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
        {nav.map((g) => (
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
                {it.badge === 'tasima' && <span className="badge">{navTasima}</span>}
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
