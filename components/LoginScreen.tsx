'use client';
import React, { useState } from 'react';
import { useStore } from '@/lib/store';

export function LoginScreen() {
  const { login, toast } = useStore();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (busy) return;
    setBusy(true);
    try {
      const res = await login(user, pass);
      if (!res.ok) {
        setErr(res.error || 'Giriş başarısız.');
        return;
      }
      toast('Giriş yapıldı', 'ok');
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

        <h2 className="login-h">Sisteme Giriş</h2>
        <p className="login-desc">Devam etmek için e-posta adresinizi ve şifrenizi girin.</p>

        <div className="field">
          <label>E-posta</label>
          <input
            autoFocus
            type="email"
            autoComplete="email"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="ornek@sirket.com"
          />
        </div>
        <div className="field">
          <label>Şifre</label>
          <input
            type="password"
            autoComplete="current-password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {err && <div className="login-err">{err}</div>}

        <button className="btn primary login-btn" type="submit" disabled={busy}>
          {busy ? 'Lütfen bekleyin…' : 'Giriş Yap'}
        </button>

        <div className="login-foot">
          Veriler tüm kullanıcılar arasında merkezi olarak paylaşılır. Giriş bilgileriniz Supabase tarafından güvenli biçimde saklanır ve doğrulanır.
        </div>
      </form>
    </div>
  );
}
