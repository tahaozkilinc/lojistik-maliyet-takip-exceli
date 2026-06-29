/* ============================================================
   İstemci tarafı giriş kapısı (auth gate).

   NOT: Bu, statik/çevrimdışı bir uygulama için bir ERİŞİM KAPISIDIR;
   sunucu düzeyinde kırılamaz bir kimlik doğrulama değildir (arka uç yoktur).
   Yine de şifre düz metin saklanmaz: PBKDF2 (SHA-256, 150k yineleme, rastgele
   tuz) ile türetilmiş özet saklanır, sabit-zamanlı karşılaştırma ve kaba
   kuvvet denemelerine karşı kilitleme uygulanır. Gerçek kimlik doğrulama için
   bir arka uç (örn. Supabase Auth) gerekir.
   ============================================================ */

const AUTH_KEY = 'nfy_auth_v1';
const SESSION_KEY = 'nfy_session_v1';
const LOCK_KEY = 'nfy_auth_lock_v1';
const ITERATIONS = 150000;
const MAX_FAILS = 5;
const LOCK_MS = 30000;

export interface Cred {
  user: string;
  salt: string;
  hash: string;
  iter: number;
  displayName?: string;
}

function buf2hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function hex2buf(hex: string): Uint8Array {
  const a = new Uint8Array(hex.length / 2);
  for (let i = 0; i < a.length; i++) a[i] = parseInt(hex.substr(i * 2, 2), 16);
  return a;
}
function randomSaltHex(): string {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return buf2hex(a.buffer);
}

async function derive(password: string, saltHex: string, iterations: number): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: hex2buf(saltHex), iterations, hash: 'SHA-256' },
    key,
    256,
  );
  return buf2hex(bits);
}

/** Sabit zamanlı hex karşılaştırma (zamanlama sızıntısını azaltır). */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function getCredential(): Cred | null {
  try {
    const r = localStorage.getItem(AUTH_KEY);
    return r ? (JSON.parse(r) as Cred) : null;
  } catch {
    return null;
  }
}

export function hasCredential(): boolean {
  const c = getCredential();
  return !!(c && c.user && c.hash && c.salt);
}

export async function setCredential(user: string, password: string): Promise<void> {
  const salt = randomSaltHex();
  const hash = await derive(password, salt, ITERATIONS);
  const prev = getCredential();
  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({ user: user.trim(), salt, hash, iter: ITERATIONS, displayName: prev?.displayName || '' }),
  );
}

/** Görünen adı günceller (şifre/hash'e dokunmaz). */
export function getDisplayName(): string {
  const c = getCredential();
  return (c && c.displayName) || (c && c.user) || '';
}
export function setDisplayName(name: string): void {
  const c = getCredential();
  if (!c) return;
  localStorage.setItem(AUTH_KEY, JSON.stringify({ ...c, displayName: name.trim() }));
}

export async function verifyCredential(user: string, password: string): Promise<boolean> {
  const c = getCredential();
  if (!c) return false;
  if (user.trim().toLowerCase() !== (c.user || '').toLowerCase()) return false;
  const h = await derive(password, c.salt, c.iter || ITERATIONS);
  return timingSafeEqualHex(h, c.hash);
}

/* ---------- oturum (sekme kapanınca biter) ---------- */
export function hasSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}
export function startSession(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* yok say */
  }
}
export function endSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* yok say */
  }
}

/* ---------- kaba kuvvet kilidi ---------- */
interface Lock {
  fails: number;
  until: number;
}
function getLock(): Lock {
  try {
    const r = localStorage.getItem(LOCK_KEY);
    return r ? (JSON.parse(r) as Lock) : { fails: 0, until: 0 };
  } catch {
    return { fails: 0, until: 0 };
  }
}
function setLock(l: Lock): void {
  try {
    localStorage.setItem(LOCK_KEY, JSON.stringify(l));
  } catch {
    /* yok say */
  }
}
/** Kalan kilit süresi (ms). 0 ise kilit yok. */
export function lockRemainingMs(): number {
  return Math.max(0, getLock().until - Date.now());
}
/** Başarısız denemeyi kaydeder; kilitlenirse kalan süreyi (ms) döndürür. */
export function registerFail(): number {
  const l = getLock();
  const fails = l.fails + 1;
  if (fails >= MAX_FAILS) {
    const until = Date.now() + LOCK_MS;
    setLock({ fails: 0, until });
    return LOCK_MS;
  }
  setLock({ fails, until: 0 });
  return 0;
}
export function clearLock(): void {
  try {
    localStorage.removeItem(LOCK_KEY);
  } catch {
    /* yok say */
  }
}
