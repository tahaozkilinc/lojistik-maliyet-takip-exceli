import React from 'react';
import { money } from '@/lib/format';
import { AYLAR, AYLAR_K } from '@/lib/constants';
import type { KaraAyData } from '@/lib/karaNavlun';

export function KaraNavlunChart({ months, cur }: { months: KaraAyData[]; cur: string }) {
  const W = 720,
    H = 240,
    pl = 58,
    pr = 18,
    pt = 18,
    pb = 30;
  const vals: number[] = [];
  months.forEach((m) => {
    if (m.fiyat != null) vals.push(m.fiyat);
  });
  if (!vals.length) return <div className="empty" style={{ padding: 30 }}>Bu yıl için grafik verisi yok.</div>;
  let mn = Math.min(...vals),
    mx = Math.max(...vals);
  if (mn === mx) {
    mn = mn * 0.9;
    mx = mx * 1.1 || 1;
  }
  const pad = (mx - mn) * 0.12;
  mn = Math.max(0, mn - pad);
  mx = mx + pad;
  const x = (i: number) => pl + (W - pl - pr) * (i / 11);
  const y = (v: number) => pt + (H - pt - pb) * (1 - (v - mn) / (mx - mn));

  const gridLines: React.ReactNode[] = [];
  const labels: React.ReactNode[] = [];
  for (let g = 0; g <= 4; g++) {
    const val = mn + ((mx - mn) * g) / 4;
    const yy = y(val);
    gridLines.push(<line key={'g' + g} x1={pl} y1={yy} x2={W - pr} y2={yy} stroke="var(--line)" strokeWidth={1} />);
    labels.push(
      <text key={'l' + g} x={pl - 8} y={yy + 4} textAnchor="end" fontSize={11} fill="var(--faint)">
        {Math.round(val).toLocaleString('tr-TR')}
      </text>,
    );
  }
  const xlab: React.ReactNode[] = [];
  for (let i = 0; i < 12; i++)
    xlab.push(
      <text key={'x' + i} x={x(i)} y={H - 10} textAnchor="middle" fontSize={11} fill="var(--faint)">
        {AYLAR_K[i]}
      </text>,
    );

  const pts: [number, number, number, number][] = [];
  months.forEach((m, i) => {
    if (m.fiyat != null) pts.push([x(i), y(m.fiyat), i, m.fiyat]);
  });
  const path = pts.map((p, j) => (j ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', maxHeight: 300, fontFamily: 'var(--ff)' }}>
      {gridLines}
      {labels}
      {xlab}
      <path d={path} fill="none" stroke="var(--navy-3)" strokeWidth={2.5} strokeLinejoin="round" />
      {pts.map((p, j) => (
        <circle key={j} cx={p[0].toFixed(1)} cy={p[1].toFixed(1)} r={3.5} fill="var(--navy-3)">
          <title>
            {AYLAR[p[2]]}: {money(p[3], cur)}
          </title>
        </circle>
      ))}
    </svg>
  );
}
