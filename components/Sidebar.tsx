'use client';
import React, { useRef } from 'react';
import { useStore } from '@/lib/store';
import { Icon, type IconName } from './Icon';
import type { ViewKey } from '@/lib/constants';
import { exportData } from '@/lib/export';
import { normalizeDB } from '@/lib/seed';

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
    group: 'Deniz Taşıması',
    items: [{ view: 'denizNavlun', label: 'Deniz Navlun', icon: 'ship' }],
  },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { db, ui, go, toast, replaceDB, toggleTheme, openModal, logout } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const navTalep = db.talepler.length;
  const navOnay = db.talepler.filter((x) => x.durum === 'onayda').length;

  function handleExport() {
    const ts = exportData(db);
    toast('Yedek indirildi: ' + ts + ' itibarıyla', 'ok');
  }

  function handleImport(ev: React.ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(String(r.result));
        if (!parsed || !parsed.talepler || !parsed.firmalar) throw new Error('invalid');
        if (!confirm('Mevcut veriler bu yedekle değiştirilecek. Devam edilsin mi?')) return;
        // Güvenlik: dış JSON prototip kirlenmesine ve tehlikeli belgelere karşı temizlenir.
        const clean = normalizeDB(parsed, db.meta);
        replaceDB(clean);
        go('dashboard');
        toast('Yedek geri yüklendi', 'ok');
      } catch {
        toast('Geçersiz yedek dosyası', 'err');
      }
    };
    r.readAsText(f);
    ev.target.value = '';
  }

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
        <button onClick={handleExport} title="Verileri yedekle">
          <Icon name="download" size={14} />
          Yedek
        </button>
        <button onClick={() => fileRef.current?.click()} title="Yedek yükle">
          <Icon name="upload" size={14} />
          Geri Yükle
        </button>
        <button className="icon-only" onClick={toggleTheme} title="Tema">
          <Icon name="sun" size={14} />
        </button>
        <button className="icon-only" onClick={() => openModal({ type: 'sifre' })} title="Şifre Değiştir">
          <Icon name="lock" size={14} />
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
      <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
    </aside>
  );
}
