'use client';
import React from 'react';

const SIZES = [10, 15, 20];

/** Uzun listeler için sayfalama kontrolü — yalnızca geçerli sayfadaki kayıtlar ekrana çizilir. */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexWrap: 'wrap',
        padding: '10px 16px',
        borderTop: '1px solid var(--line-2)',
        fontSize: 12,
        color: 'var(--faint)',
      }}
    >
      <div>{total ? `${from}–${to} / ${total} kayıt` : '0 kayıt'}</div>
      <div className="spacer" />
      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        Sayfa başına
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          style={{ fontSize: 12, padding: '3px 6px', borderRadius: 6 }}
        >
          {SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button className="btn sm ghost" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          ‹ Önceki
        </button>
        <span style={{ padding: '0 4px' }}>
          {page} / {totalPages}
        </span>
        <button className="btn sm ghost" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Sonraki ›
        </button>
      </div>
    </div>
  );
}
