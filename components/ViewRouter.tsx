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
import { Haritalar } from './views/Haritalar';
import { Analiz } from './views/Analiz';
import { DenizNavlun } from './views/DenizNavlun';
import { KaraNavlun } from './views/KaraNavlun';
import { NavlunFirmalar } from './views/NavlunFirmalar';

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
    default:
      return <Dashboard />;
  }
}
