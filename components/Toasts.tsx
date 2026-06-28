'use client';
import React from 'react';
import { useStore } from '@/lib/store';

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="toast-wrap" id="toastWrap">
      {toasts.map((t) => (
        <div key={t.id} className={'toast ' + t.type}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
            {t.type === 'err' ? <circle cx="12" cy="12" r="10" /> : null}
            <path d={t.type === 'err' ? 'M12 8v4M12 16h.01' : 'M20 6L9 17l-5-5'} />
          </svg>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
