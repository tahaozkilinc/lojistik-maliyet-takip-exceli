import React from 'react';

export function EmptyTalep({ onNew }: { onNew: () => void }) {
  return (
    <div className="empty">
      <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M16 3h5v5M21 3l-7 7M3 8v11a1 1 0 0 0 1 1h11M3 8l5-5h5" />
      </svg>
      <h3>Henüz talep yok</h3>
      <p>
        Bir nakliye için fiyat toplamaya başlamak üzere ilk talebinizi oluşturun. Sonra her firmadan aldığınız teklifi
        ekleyebilirsiniz.
      </p>
      <button className="btn primary" onClick={onNew}>
        + Yeni Talep Oluştur
      </button>
    </div>
  );
}
