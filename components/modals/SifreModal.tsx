'use client';
import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { ModalShell, ModalHead } from '@/components/Modal';

export function SifreModal() {
  const { changePassword, closeModal, toast } = useStore();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [next2, setNext2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setErr('');
    if (busy) return;
    if (next !== next2) {
      setErr('Yeni şifreler eşleşmiyor.');
      return;
    }
    setBusy(true);
    try {
      const res = await changePassword(cur, next);
      if (!res.ok) {
        setErr(res.error || 'Şifre değiştirilemedi.');
        return;
      }
      closeModal();
      toast('Şifre güncellendi', 'ok');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell onClose={closeModal} style={{ maxWidth: 420 }}>
      <ModalHead title="Şifre Değiştir" onClose={closeModal} />
      <div className="modal-body">
        <div className="field">
          <label>Mevcut Şifre</label>
          <input type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />
        </div>
        <div className="field">
          <label>Yeni Şifre</label>
          <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
        <div className="field">
          <label>Yeni Şifre (Tekrar)</label>
          <input type="password" autoComplete="new-password" value={next2} onChange={(e) => setNext2(e.target.value)} />
        </div>
        {err && <div className="login-err">{err}</div>}
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={closeModal}>
          Vazgeç
        </button>
        <button className="btn primary" onClick={save} disabled={busy}>
          {busy ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </ModalShell>
  );
}
