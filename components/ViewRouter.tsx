'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { Dashboard } from './views/Dashboard';
import { Talepler } from './views/Talepler';
import { TalepDetail } from './views/TalepDetail';
import { Onaylar } from './views/Onaylar';
import { Firmalar } from './views/Firmalar';
import { FirmaDetay } from './views/FirmaDetay';
import { Lokasyonlar } from './views/Lokasyonlar';
import { LokasyonDetay } from './views/LokasyonDetay';
import { LimanTalepleri } from './views/LimanTalepleri';
import { LimanTalepDetay } from './views/LimanTalepDetay';
import { Haritalar } from './views/Haritalar';
import { Analiz } from './views/Analiz';
import { DenizNavlun } from './views/DenizNavlun';
import { KaraNavlun } from './views/KaraNavlun';
import { NavlunFirmalar } from './views/NavlunFirmalar';
import { TasimaTalepleri } from './views/TasimaTalepleri';
import { TasimaTalepDetail } from './views/TasimaTalepDetail';
import { KullaniciRolleri } from './views/KullaniciRolleri';
import { YedekGecmisi } from './views/YedekGecmisi';
import { NavlunFirmaDetay } from './views/NavlunFirmaDetay';
import { NavlunPanel } from './views/NavlunPanel';

export function ViewRouter() {
  const { ui } = useStore();
  switch (ui.view) {
    case 'dashboard':
      return <Dashboard />;
    case 'talepler':
      return <Talepler />;
    case 'detail':
      return <TalepDetail />;
    case 'onaylar':
      return <Onaylar />;
    case 'firmalar':
      return <Firmalar />;
    case 'firmaDetay':
      return <FirmaDetay />;
    case 'lokasyonlar':
      return <Lokasyonlar />;
    case 'lokasyonDetay':
      return <LokasyonDetay />;
    case 'limanTalepleri':
      return <LimanTalepleri />;
    case 'limanTalepDetay':
      return <LimanTalepDetay />;
    case 'haritalar':
      return <Haritalar />;
    case 'analiz':
      return <Analiz />;
    case 'denizNavlun':
      return <DenizNavlun />;
    case 'karaNavlun':
      return <KaraNavlun />;
    case 'navlunFirmalar':
      return <NavlunFirmalar />;
    case 'navlunFirmaDetay':
      return <NavlunFirmaDetay />;
    case 'navlunPanel':
      return <NavlunPanel />;
    case 'tasimaTalepleri':
      return <TasimaTalepleri />;
    case 'tasimaTalepDetay':
      return <TasimaTalepDetail />;
    case 'kullaniciRolleri':
      return <KullaniciRolleri />;
    case 'yedekGecmisi':
      return <YedekGecmisi />;
    default:
      return <Dashboard />;
  }
}
