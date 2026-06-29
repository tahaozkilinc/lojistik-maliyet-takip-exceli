'use client';
import React, { useState } from 'react';
import { useStore } from '@/lib/store';

export function LoginScreen() {
  const { needsSetup, login, setupCredential, toast } = useStore();
  const [user, setUser] = useState(needsSetup ? '' : '');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (busy) return;
    setBusy(true);
    try {
      if (needsSetup) {
        if (!user.trim()) {
          setErr('Bir kullanıcı adı belirleyin.');
          return;
        }
        if (!pass || pass.length < 4) {
          setErr('Şifre en az 4 karakter olmalı.');
          return;
        }
        if (pass !== pass2) {
          setErr('Şifreler eşleşmiyor.');
          return;
        }
        await setupCredential(user, pass);
        toast('Hesap oluşturuldu — hoş geldiniz', 'ok');
      } else {
        const res = await login(user, pass);
        if (!res.ok) {
          setErr(res.error || 'Giriş başarısız.');
          return;
        }
        toast('Giriş yapıldı', 'ok');
      }
    } catch {
      setErr('Beklenmeyen bir hata oluştu. Tarayıcının güvenli bağlamda (https) olduğundan emin olun.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <div className="mark">S</div>
          <div>
            <div className="login-title">Nakliye Yönetimi</div>
            <div className="login-sub">Fiyat • Karşılaştırma • Onay</div>
          </div>
        </div>

        <h2 className="login-h">{needsSetup ? 'İlk Kurulum — Hesap Oluşturun' : 'Sisteme Giriş'}</h2>
        <p className="login-desc">
          {needsSetup
            ? 'Bu cihazda sisteme erişimi korumak için bir kullanıcı adı ve şifre belirleyin.'
            : 'Devam etmek için kullanıcı adı ve şifrenizi girin.'}
        </p>

        <div className="field">
          <label>Kullanıcı Adı</label>
          <input
            autoFocus
            autoComplete="username"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="kullanıcı adı"
          />
        </div>
        <div className="field">
          <label>Şifre</label>
          <input
            type="password"
            autoComplete={needsSetup ? 'new-password' : 'current-password'}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        {needsSetup && (
          <div className="field">
            <label>Şifre (Tekrar)</label>
            <input
              type="password"
              autoComplete="new-password"
              value={pass2}
              onChange={(e) => setPass2(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        )}

        {err && <div className="login-err">{err}</div>}

        <button className="btn primary login-btn" type="submit" disabled={busy}>
          {busy ? 'Lütfen bekleyin…' : needsSetup ? 'Hesabı Oluştur ve Gir' : 'Giriş Yap'}
        </button>

        <div className="login-foot">
          Veriler ve giriş bilgileri yalnızca bu tarayıcıda saklanır. Şifreniz düz metin olarak değil, güvenli özet (PBKDF2) biçiminde tutulur.
        </div>
      </form>
    </div>
  );
}
