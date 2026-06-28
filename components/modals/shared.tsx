import React from 'react';
import type { DB } from '@/lib/types';

/** Lokasyon <option> listesi (orijinal locOptions). */
export function LokOptions({ db }: { db: DB }) {
  return (
    <>
      {db.lokasyonlar.map((l) => (
        <option key={l.id} value={l.id}>
          {l.ad}
          {l.sehir ? ' — ' + l.sehir : ''}
          {l.fabrika ? ' (Fabrika)' : ''}
        </option>
      ))}
    </>
  );
}
