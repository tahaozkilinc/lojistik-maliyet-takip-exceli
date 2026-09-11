'use client';
import React from 'react';
import { fmt, dt } from '@/lib/format';

export interface ChartSeriesPoint {
  tarih: string; // YYYY-MM-DD
  value: number;
}

export interface ChartSeries {
  label: string;
  color: string;
  unit: string;
  axis: 'left' | 'right';
  points: ChartSeriesPoint[];
  /** true ise noktalar arası merdiven (step-after) çizgi kullanılır — bir
   * sonraki değişikliğe kadar sabit kalan (anlaşmalı) fiyatlar içindir;
   * false/yok ise düz çizgiyle birleştirilir (akaryakıt gibi günlük seri). */
  stepped?: boolean;
  /** true ise çizgi kesikli çizilir — iki seriyi görsel olarak ayırt etmek içindir. */
  dashed?: boolean;
}

const W = 600;
const PAD_L = 54;
const PAD_R = 58;
const PAD_T = 14;
const PAD_B = 26;
const TICK_COUNT = 4;

function shortDate(tarih: string): string {
  const d = new Date(tarih);
  if (isNaN(d.getTime())) return tarih;
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
}

function scaleFor(points: ChartSeriesPoint[]) {
  const vals = points.map((p) => p.value);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (min === max) {
    const bump = Math.abs(min) * 0.1 || 1;
    min -= bump;
    max += bump;
  }
  const pad = (max - min) * 0.15;
  min -= pad;
  max += pad;
  return { min, max };
}

/** Fiyat dalgalanması grafiği — bağımsız iki eksen (sol/sağ), tarih bazlı X ekseni. Harici kütüphane kullanmaz. */
export function PriceTrendChart({ series, height = 220 }: { series: ChartSeries[]; height?: number }) {
  const H = height;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const withData = series.filter((s) => s.points.length > 0);
  if (!withData.length) return null;

  const allDates = [...new Set(withData.flatMap((s) => s.points.map((p) => p.tarih)))].sort();
  const minT = new Date(allDates[0]).getTime();
  const maxT = new Date(allDates[allDates.length - 1]).getTime();
  const xOf = (tarih: string) => {
    if (!isFinite(minT) || !isFinite(maxT) || maxT === minT) return PAD_L + plotW / 2;
    return PAD_L + ((new Date(tarih).getTime() - minT) / (maxT - minT)) * plotW;
  };

  const left = withData.find((s) => s.axis === 'left');
  const right = withData.find((s) => s.axis === 'right');
  const leftRange = left ? scaleFor(left.points) : null;
  const rightRange = right ? scaleFor(right.points) : null;
  const yOfLeft = leftRange ? (v: number) => PAD_T + plotH - ((v - leftRange.min) / (leftRange.max - leftRange.min)) * plotH : null;
  const yOfRight = rightRange ? (v: number) => PAD_T + plotH - ((v - rightRange.min) / (rightRange.max - rightRange.min)) * plotH : null;

  function pathFor(s: ChartSeries, yOf: (v: number) => number) {
    const pts = [...s.points].sort((a, b) => a.tarih.localeCompare(b.tarih));
    if (!pts.length) return '';
    let d = `M ${xOf(pts[0].tarih)},${yOf(pts[0].value)}`;
    for (let i = 1; i < pts.length; i++) {
      const x = xOf(pts[i].tarih);
      const y = yOf(pts[i].value);
      d += s.stepped ? ` H ${x} V ${y}` : ` L ${x},${y}`;
    }
    // Merdiven serilerde son bilinen değer, elimizdeki en son veri gününe
    // kadar hâlâ geçerli olduğundan çizgi sağ kenara kadar uzatılır.
    if (s.stepped) d += ` H ${PAD_L + plotW}`;
    return d;
  }

  const leftTicks = leftRange
    ? Array.from({ length: TICK_COUNT + 1 }, (_, i) => leftRange.min + ((leftRange.max - leftRange.min) / TICK_COUNT) * i)
    : [];
  const xTickDates =
    allDates.length > 1
      ? Array.from({ length: 5 }, (_, i) => {
          const t = minT + ((maxT - minT) / 4) * i;
          return new Date(t).toISOString().slice(0, 10);
        })
      : allDates;

  return (
    <div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Fiyat dalgalanması grafiği">
        {leftTicks.map((v, i) => {
          const y = yOfLeft!(v);
          return (
            <g key={i}>
              <line x1={PAD_L} y1={y} x2={PAD_L + plotW} y2={y} stroke="var(--line)" strokeWidth={1} />
              <text x={PAD_L - 8} y={y + 3.5} textAnchor="end" fontSize={9.5} fill="var(--faint)">
                {fmt(v)}
              </text>
            </g>
          );
        })}
        {rightRange &&
          leftTicks.map((_, i) => {
            const v = rightRange.min + ((rightRange.max - rightRange.min) / TICK_COUNT) * i;
            const y = yOfRight!(v);
            return (
              <text key={i} x={PAD_L + plotW + 8} y={y + 3.5} textAnchor="start" fontSize={9.5} fill="var(--faint)">
                {fmt(v)}
              </text>
            );
          })}

        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + plotH} stroke="var(--line)" strokeWidth={1} />
        <line x1={PAD_L + plotW} y1={PAD_T} x2={PAD_L + plotW} y2={PAD_T + plotH} stroke="var(--line)" strokeWidth={1} />

        {xTickDates.map((tD, i) => (
          <text key={i} x={xOf(tD)} y={H - 8} textAnchor="middle" fontSize={9.5} fill="var(--faint)">
            {shortDate(tD)}
          </text>
        ))}

        {left && yOfLeft && (
          <path
            d={pathFor(left, yOfLeft)}
            fill="none"
            stroke={left.color}
            strokeWidth={2}
            strokeDasharray={left.dashed ? '4 3' : undefined}
          />
        )}
        {right && yOfRight && (
          <path
            d={pathFor(right, yOfRight)}
            fill="none"
            stroke={right.color}
            strokeWidth={2}
            strokeDasharray={right.dashed ? '4 3' : undefined}
          />
        )}
        {left &&
          yOfLeft &&
          left.points.map((p, i) => (
            <circle key={i} cx={xOf(p.tarih)} cy={yOfLeft(p.value)} r={3.2} fill={left.color} stroke="var(--surface)" strokeWidth={1}>
              <title>
                {dt(p.tarih)} — {left.label}: {fmt(p.value)} {left.unit}
              </title>
            </circle>
          ))}
        {right &&
          yOfRight &&
          right.points.map((p, i) => (
            <circle key={i} cx={xOf(p.tarih)} cy={yOfRight(p.value)} r={2.4} fill={right.color}>
              <title>
                {dt(p.tarih)} — {right.label}: {fmt(p.value)} {right.unit}
              </title>
            </circle>
          ))}
      </svg>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11.5, marginTop: 4 }}>
        {withData.map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                display: 'inline-block',
                width: 14,
                height: 2,
                background: s.dashed ? 'none' : s.color,
                borderTop: s.dashed ? `2px dashed ${s.color}` : undefined,
              }}
            />
            <span style={{ color: 'var(--muted)' }}>
              {s.label} <span style={{ color: 'var(--faint)' }}>({s.unit})</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
