'use client';
import React from 'react';

export function ModalShell({
  children,
  onClose,
  size,
  style,
}: {
  children: React.ReactNode;
  onClose: () => void;
  size?: 'wide' | 'xwide';
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="overlay show"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={'modal' + (size ? ' ' + size : '')} style={style}>
        {children}
      </div>
    </div>
  );
}

export function ModalHead({ title, onClose }: { title: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-head">
      <h3>{title}</h3>
      <button className="x" onClick={onClose} aria-label="Kapat">
        ×
      </button>
    </div>
  );
}
