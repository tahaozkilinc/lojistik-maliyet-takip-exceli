/* ============================================================
   Kimlik doğrulama — Supabase Auth (gerçek, sunucu taraflı çoklu
   kullanıcı kimlik doğrulaması).

   Şifreler Supabase tarafında güvenli biçimde (bcrypt) saklanır ve
   doğrulanır; oturum belirteçleri (JWT) Supabase istemcisinin kendi
   güvenli depolama anahtarı altında tutulur ve otomatik yenilenir.
   Kaba kuvvet denemelerine karşı hız sınırlaması Supabase'in sunucu
   tarafında uygulanır (istemci tarafından atlatılamaz).

   Yeni kullanıcı oluşturma: Supabase Dashboard → Authentication →
   Users → Add user. Uygulama içinde kayıt ekranı yoktur ve OLMAYACAKTIR.
   ============================================================ */
import { supabase } from './supabaseClient';
import type { AppRole, Profile } from './types';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

function toAuthUser(u: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null | undefined): AuthUser | null {
  if (!u) return null;
  const meta = u.user_metadata || {};
  const displayName = typeof meta.displayName === 'string' && meta.displayName.trim() ? meta.displayName : u.email || '';
  return { id: u.id, email: u.email || '', displayName };
}

/** Geçerli oturumdaki kullanıcıyı döndürür (yoksa null). */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data } = await supabase.auth.getUser();
  return toAuthUser(data.user);
}

/** Oturum durumu değişikliklerini dinler; abonelikten çıkma fonksiyonu döndürür. */
export function onAuthChange(cb: (user: AuthUser | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(toAuthUser(session?.user));
  });
  return () => data.subscription.unsubscribe();
}

/** Ağ/bağlantı hatasını (sunucuya hiç ulaşılamadı) yanlış kimlik bilgisinden ayırt eder. */
function describeAuthError(error: { status?: number; message?: string }, invalidCredsMsg: string): string {
  const isNetworkError = !error.status || /fetch|network/i.test(error.message || '');
  if (isNetworkError) return 'Bağlantı hatası. İnternet bağlantınızı kontrol edip tekrar deneyin.';
  return invalidCredsMsg;
}

export async function login(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  if (!email.trim() || !password) return { ok: false, error: 'E-posta ve şifre girin.' };
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) return { ok: false, error: describeAuthError(error, 'E-posta veya şifre hatalı.') };
  return { ok: true };
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

/** Şifre değiştirir; önce mevcut şifre yeniden giriş denenerek doğrulanır. */
export async function changePassword(current: string, next: string): Promise<{ ok: boolean; error?: string }> {
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email) return { ok: false, error: 'Oturum bulunamadı.' };
  if (!next || next.length < 6) return { ok: false, error: 'Yeni şifre en az 6 karakter olmalı.' };
  const { error: verifyErr } = await supabase.auth.signInWithPassword({ email, password: current });
  if (verifyErr) return { ok: false, error: describeAuthError(verifyErr, 'Mevcut şifre hatalı.') };
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { ok: false, error: describeAuthError(error, error.message || 'Şifre güncellenemedi.') };
  return { ok: true };
}

/** Görünen adı günceller (Supabase kullanıcı meta verisinde tutulur). */
export async function updateDisplayName(name: string): Promise<void> {
  await supabase.auth.updateUser({ data: { displayName: name.trim() } });
}

/**
 * Geçerli kullanıcının yetki rolünü döndürür. Rol `profiles` tablosunda
 * tutulur (kullanıcı meta verisinde DEĞİL — bkz. dosya başındaki not);
 * satır bulunamazsa (örn. profil tetikleyicisi henüz çalışmadıysa) en az
 * yetkili role (goruntuleyici) güvenli varsayılan olarak döner.
 */
export async function getMyRole(): Promise<AppRole | null> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase.from('profiles').select('role').eq('id', uid).maybeSingle();
  if (error || !data) return 'goruntuleyici';
  return data.role as AppRole;
}

/** Tüm kullanıcı profillerini (e-posta + rol) döndürür — Kullanıcı Rolleri ekranı içindir. */
export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('id, email, role').order('email');
  if (error || !data) return [];
  return data as Profile[];
}

/**
 * Bir kullanıcının rolünü değiştirir. Sunucu tarafında (RLS) yalnızca admin
 * rolündeki kullanıcılar bu işlemi yapabilir; başkası çağırırsa Supabase
 * sessizce hiçbir satır güncellemez (0 satır etkilenir) — bu durumda hata
 * döndürülür.
 */
export async function updateUserRole(userId: string, role: AppRole): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.from('profiles').update({ role }).eq('id', userId).select('id');
  if (error) return { ok: false, error: error.message || 'Rol güncellenemedi.' };
  if (!data || !data.length) return { ok: false, error: 'Bu işlem için yetkiniz yok (yalnızca admin rol değiştirebilir).' };
  return { ok: true };
}
