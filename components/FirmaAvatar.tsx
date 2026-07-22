'use client';
import React from 'react';
import { initials } from '@/lib/format';

/**
 * Firma/Navlun Firması kartlarında ve detay başlığında ortak avatar: logo
 * varsa görsel, yoksa isim baş harfleri. Var olan `.fc-avatar` sınıfı ve
 * inline boyut/renk override'ları korunur — yalnızca içerik değişir.
 */
export function FirmaAvatar({
  logo,
  ad,
  className,
  style,
}: {
  logo?: string | null;
  ad: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (logo) {
    return <img src={logo} alt={ad} className={className} style={{ ...style, background: '#fff', objectFit: 'contain' }} />;
  }
  return (
    <div className={className} style={style}>
      {initials(ad)}
    </div>
  );
}
