'use client';
import React, { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { PrintReport } from './PrintReport';
import { PrintCombined } from './PrintCombined';
import { PrintTasimaReport } from './PrintTasimaReport';

export function PrintHost() {
  const { printJob, setPrintJob } = useStore();

  // İçerik basıldıktan sonra yazdırma işini temizle.
  useEffect(() => {
    if (!printJob) return;
    const timer = setTimeout(() => window.print(), 150);
    const after = () => setPrintJob(null);
    window.addEventListener('afterprint', after);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', after);
    };
  }, [printJob, setPrintJob]);

  return (
    <div id="printArea">
      {printJob?.type === 'single' ? <PrintReport id={printJob.id} /> : null}
      {printJob?.type === 'combined' ? <PrintCombined ids={printJob.ids} /> : null}
      {printJob?.type === 'tasima' ? <PrintTasimaReport id={printJob.id} /> : null}
    </div>
  );
}
