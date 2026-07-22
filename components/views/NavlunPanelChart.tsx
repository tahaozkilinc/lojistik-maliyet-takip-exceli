import React from 'react';
import { money } from '@/lib/format';
import { AYLAR_K } from '@/lib/constants';
import type { FirmaAySeri } from '@/lib/navlun';

const PALETTE = ['#2563eb', '#ea580c', '#16a34a', '#7c3aed', '#db2777', '#0891b2', '#ca8a04', '#dc2626', '#4f46e5', '#059669'];

/** Ay bazında, firma başına gruplu çubuk grafik. */
export function NavlunPanelChart({ series }: { series: FirmaAySeri[] }) {
  const allVals = series.flatMap((s) => s.aylar).filter((v): v is number => v != null);
  if (!allVals.length) {
    return <div className="empty" style={{ padding: 30 }}>Bu filtre için firma bazlı fiyat verisi yok.</div>;
  }

  const W = 760,
    H = 300,
    pl = 56,
    pr = 14,
    pt = 14,
    pb = 60;
  const mx = Math.max(...allVals) * 1.15 || 1;
  const innerW = W - pl - pr;
  const innerH = H - pt - pb;
  const groupW = innerW / 12;
  const n = series.length;
  const barGap = 2;
  const barW = Math.max(2, (groupW - 8) / n - barGap);

  const y = (v: number) => pt + innerH * (1 - v / mx);

  const gridLines: React.ReactNode[] = [];
  const yLabels: React.ReactNode[] = [];
  for (let g = 0; g <= 4; g++) {
    const val = (mx * g) / 4;
    const yy = y(val);
    gridLines.push(<line key={'g' + g} x1={pl} y1={yy} x2={W - pr} y2={yy} stroke="var(--line)" strokeWidth={1} />);
    yLabels.push(
      <text key={'l' + g} x={pl - 8} y={yy + 4} textAnchor="end" fontSize={10.5} fill="var(--faint)">
        {Math.round(val).toLocaleString('tr-TR')}
      </text>,
    );
  }

  const bars: React.ReactNode[] = [];
  const xLabels: React.ReactNode[] = [];
  for (let m = 0; m < 12; m++) {
    const groupX = pl + groupW * m + 4;
    xLabels.push(
      <text key={'x' + m} x={groupX + (groupW - 8) / 2} y={pt + innerH + 18} textAnchor="middle" fontSize={10.5} fill="var(--faint)">
        {AYLAR_K[m]}
      </text>,
    );
    series.forEach((s, si) => {
      const v = s.aylar[m];
      if (v == null) return;
      const bx = groupX + si * (barW + barGap);
      const by = y(v);
      const color = PALETTE[si % PALETTE.length];
      bars.push(
        <rect key={m + '-' + si} x={bx} y={by} width={barW} height={pt + innerH - by} fill={color} rx={1.5}>
          <title>
            {s.firmaAd} · {AYLAR_K[m]}: {money(v, 'USD')}
          </title>
        </rect>,
      );
    });
  }

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', maxHeight: 340, fontFamily: 'var(--ff)' }}>
        {gridLines}
        {yLabels}
        {xLabels}
        {bars}
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 6, justifyContent: 'center' }}>
        {series.map((s, si) => (
          <div key={s.firmaId} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: PALETTE[si % PALETTE.length], display: 'inline-block', flexShrink: 0 }} />
            {s.firmaAd}
          </div>
        ))}
      </div>
    </div>
  );
}
