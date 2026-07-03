'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { TalepModal } from './modals/TalepModal';
import { TeklifModal } from './modals/TeklifModal';
import { IndirimModal } from './modals/IndirimModal';
import { OnayModal } from './modals/OnayModal';
import { FirmaModal } from './modals/FirmaModal';
import { LokasyonModal } from './modals/LokasyonModal';
import { LokasyonTopluModal } from './modals/LokasyonTopluModal';
import { AnlasmaModal } from './modals/AnlasmaModal';
import { NavlunModal } from './modals/NavlunModal';
import { KaraNavlunModal } from './modals/KaraNavlunModal';
import { NavlunFirmaModal } from './modals/NavlunFirmaModal';
import { TasimaTalepModal } from './modals/TasimaTalepModal';
import { TasimaIndirimModal } from './modals/TasimaIndirimModal';
import { LimanTalepModal } from './modals/LimanTalepModal';
import { LimanMasrafModal } from './modals/LimanMasrafModal';
import { KurModal } from './modals/KurModal';
import { ProfilModal } from './modals/ProfilModal';

export function ModalHost() {
  const { modal } = useStore();
  if (!modal) return null;
  switch (modal.type) {
    case 'talep':
      return <TalepModal id={modal.id} />;
    case 'teklif':
      return (
        <TeklifModal
          talepId={modal.talepId}
          teklifId={modal.teklifId}
          presetFirma={modal.presetFirma}
          presetFiyat={modal.presetFiyat}
          presetPara={modal.presetPara}
        />
      );
    case 'indirim':
      return <IndirimModal talepId={modal.talepId} />;
    case 'onay':
      return <OnayModal id={modal.id} />;
    case 'firma':
      return <FirmaModal id={modal.id} />;
    case 'lokasyon':
      return <LokasyonModal id={modal.id} />;
    case 'lokasyonToplu':
      return <LokasyonTopluModal />;
    case 'anlasma':
      return <AnlasmaModal firmaId={modal.firmaId} anlId={modal.anlId} />;
    case 'navlun':
      return <NavlunModal id={modal.id} />;
    case 'karaNavlun':
      return <KaraNavlunModal id={modal.id} />;
    case 'navlunFirma':
      return <NavlunFirmaModal id={modal.id} />;
    case 'tasimaTalep':
      return <TasimaTalepModal id={modal.id} />;
    case 'tasimaIndirim':
      return <TasimaIndirimModal talepId={modal.talepId} />;
    case 'limanTalep':
      return <LimanTalepModal id={modal.id} />;
    case 'limanMasraf':
      return <LimanMasrafModal talepId={modal.talepId} masrafId={modal.masrafId} />;
    case 'kur':
      return <KurModal />;
    case 'profil':
      return <ProfilModal />;
    default:
      return null;
  }
}
