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
  const { ready, authed } = useStore();
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

  return (
    <>
      <div className="app">
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
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
