import React from 'react';

const MAP: Record<string, [string, string]> = {
  toplama: ['b-toplama', 'Fiyat toplanıyor'],
  onayda: ['b-onayda', 'Onay bekliyor'],
  onaylandi: ['b-onaylandi', 'Onaylandı'],
  reddedildi: ['b-reddedildi', 'Reddedildi'],
};

export function StatusBadge({ durum }: { durum: string }) {
  const x = MAP[durum] || MAP.toplama;
  return <span className={`badge-s ${x[0]}`}>{x[1]}</span>;
}
