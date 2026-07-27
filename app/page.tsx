'use client';
import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { ViewRouter } from '@/components/ViewRouter';
import { ModalHost } from '@/components/ModalHost';
import { Toasts } from '@/components/Toasts';
import { PrintHost } from '@/components/print/PrintHost';
import { LoginScreen } from '@/components/LoginScreen';

export default function Page() {
  const { ready, authed, loadError, retryLoad } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 14 }}>
        Yükleniyor…
      </div>
    );
  }

  // Giriş kapısı: oturum yoksa giriş ekranı (kayıt/hesap oluşturma ekranı yok).
  if (!authed) {
    return (
      <>
        <LoginScreen />
        <Toasts />
      </>
    );
  }

  // Merkezi veriye hiç ulaşılamadı ve bu cihazda gösterilecek gerçek bir
  // önbellek de yok — boş/yanıltıcı bir panel yerine açık bir hata ekranı.
  if (loadError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Verileriniz yüklenemedi</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 400 }}>{loadError}</div>
        <button className="btn primary" onClick={retryLoad}>
          Tekrar Dene
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="app">
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        {menuOpen && <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />}
        <div className="main">
          <Topbar onMenu={() => setMenuOpen((o) => !o)} />
          <div className="content" id="content">
            <ViewRouter />
          </div>
        </div>
      </div>
      <ModalHost />
      <PrintHost />
      <Toasts />
    </>
  );
}
