'use client';
/* ============================================================
   Merkezi durum (state) yönetimi — localStorage kalıcılığı,
   bildirimler (toast), tema, gezinme, modal ve yazdırma.
   ============================================================ */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { DB } from './types';
import { LS_KEY, THEME_KEY, EMBED_FLAG_KEY, type ViewKey } from './constants';
import { emptyDB, migrate, normalizeDB, seedIfEmpty } from './seed';
import { embeddedData, EMBED_VERSION } from './seedData';
import {
  hasCredential,
  hasSession,
  getCredential,
  setCredential,
  verifyCredential,
  startSession,
  endSession,
  lockRemainingMs,
  registerFail,
  clearLock,
  getDisplayName,
  setDisplayName,
} from './auth';

/* ---------- modal & print türleri ---------- */
export type ModalState =
  | { type: 'talep'; id?: string }
  | {
      type: 'teklif';
      talepId: string;
      teklifId?: string;
      presetFirma?: string;
      presetFiyat?: number | string;
      presetPara?: string;
    }
  | { type: 'indirim'; talepId: string }
  | { type: 'onay'; id: string }
  | { type: 'firma'; id?: string }
  | { type: 'lokasyon'; id?: string }
  | { type: 'anlasma'; firmaId: string; anlId?: string }
  | { type: 'navlun'; id?: string }
  | { type: 'karaNavlun'; id?: string }
  | { type: 'kur' }
  | { type: 'profil' }
  | null;

export type PrintJob =
  | { type: 'single'; id: string }
  | { type: 'combined'; ids: string[] }
  | null;

export type ToastItem = { id: number; msg: string; type: '' | 'ok' | 'err' };

export interface UIState {
  view: ViewKey;
  detailId: string | null;
  firmaId: string | null;
  talepFilter: string;
  lokFilter: string;
  haritaFilter: string;
  navlunYil: number;
  navlunHat: string;
  karaNavlunYil: number;
  karaNavlunHat: string;
  search: string;
}

export interface StoreValue {
  db: DB;
  ready: boolean;
  /** Oturum açık mı. */
  authed: boolean;
  /** Henüz hiç şifre belirlenmemiş (ilk kurulum). */
  needsSetup: boolean;
  /** Kullanıcı adı/şifre ile giriş. */
  login: (user: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  /** İlk kurulumda kimlik bilgisi oluşturup oturum açar. */
  setupCredential: (user: string, password: string) => Promise<void>;
  /** Oturumu kapatır. */
  logout: () => void;
  /** Şifre değiştirir (mevcut şifre doğrulanır). */
  changePassword: (current: string, next: string) => Promise<{ ok: boolean; error?: string }>;
  /** Profilde görünen ad. */
  displayName: string;
  /** Görünen adı günceller. */
  updateDisplayName: (name: string) => void;
  ui: UIState;
  setUi: (p: Partial<UIState>) => void;
  go: (view: ViewKey, id?: string) => void;
  /** Veriyi bir klon üzerinde değiştirir, kalıcılaştırır; yeni DB'yi döndürür. */
  mutate: (fn: (db: DB) => void) => DB;
  /** Tüm veriyi değiştirir (yedek geri yükleme / içe aktarma). */
  replaceDB: (db: DB) => void;
  toast: (msg: string, type?: '' | 'ok' | 'err') => void;
  toasts: ToastItem[];
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  modal: ModalState;
  openModal: (m: ModalState) => void;
  closeModal: () => void;
  printJob: PrintJob;
  setPrintJob: (p: PrintJob) => void;
  bulkSel: Set<string>;
  setBulkSel: (s: Set<string>) => void;
  talepSel: Set<string>;
  setTalepSel: (s: Set<string>) => void;
}

const StoreCtx = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

function save(db: DB) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(db));
  } catch {
    // depolama dolu olabilir — sessizce geç (çağıran toast gösterebilir)
  }
}

/** Orijinal yükleme akışı: load → applyEmbedded → (yoksa) seedIfEmpty → migrate. */
function initialLoad(): DB {
  let db = emptyDB();
  try {
    const r = localStorage.getItem(LS_KEY);
    if (r) db = normalizeDB(JSON.parse(r), db.meta);
  } catch {
    /* bozuk veri — varsayılanla devam */
  }
  let applied = false;
  try {
    if (localStorage.getItem(EMBED_FLAG_KEY) !== EMBED_VERSION) {
      db = normalizeDB(embeddedData, db.meta);
      localStorage.setItem(EMBED_FLAG_KEY, EMBED_VERSION);
      applied = true;
    }
  } catch {
    /* yok say */
  }
  if (!applied) seedIfEmpty(db);
  migrate(db);
  save(db);
  return db;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(() => emptyDB());
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [modal, setModal] = useState<ModalState>(null);
  const [printJob, setPrintJob] = useState<PrintJob>(null);
  const [bulkSel, setBulkSel] = useState<Set<string>>(new Set());
  const [talepSel, setTalepSel] = useState<Set<string>>(new Set());
  const [authed, setAuthed] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [displayName, setDisplayNameState] = useState('');
  const toastId = useRef(0);

  const [ui, setUiState] = useState<UIState>({
    view: 'dashboard',
    detailId: null,
    firmaId: null,
    talepFilter: 'all',
    lokFilter: 'all',
    haritaFilter: 'all',
    navlunYil: new Date().getFullYear(),
    navlunHat: '__all',
    karaNavlunYil: new Date().getFullYear(),
    karaNavlunHat: '__all',
    search: '',
  });

  // İlk istemci yüklemesi (localStorage yalnızca tarayıcıda).
  useEffect(() => {
    const loaded = initialLoad();
    setDb(loaded);
    const t = localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
    setTheme(t);
    document.documentElement.setAttribute('data-theme', t);
    // Giriş durumu
    const credSet = hasCredential();
    setNeedsSetup(!credSet);
    setAuthed(credSet && hasSession());
    if (credSet) setDisplayNameState(getDisplayName());
    setReady(true);
  }, []);

  const login = useCallback(async (user: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    const lock = lockRemainingMs();
    if (lock > 0) return { ok: false, error: `Çok fazla hatalı deneme. ${Math.ceil(lock / 1000)} sn sonra tekrar deneyin.` };
    if (!user.trim() || !password) return { ok: false, error: 'Kullanıcı adı ve şifre girin.' };
    const ok = await verifyCredential(user, password);
    if (ok) {
      clearLock();
      startSession();
      setAuthed(true);
      return { ok: true };
    }
    const locked = registerFail();
    return {
      ok: false,
      error: locked > 0 ? `Çok fazla hatalı deneme. ${Math.ceil(locked / 1000)} sn kilitlendi.` : 'Kullanıcı adı veya şifre hatalı.',
    };
  }, []);

  const setupCredential = useCallback(async (user: string, password: string) => {
    await setCredential(user, password);
    clearLock();
    startSession();
    setNeedsSetup(false);
    setAuthed(true);
    setDisplayNameState(getDisplayName());
  }, []);

  const logout = useCallback(() => {
    endSession();
    setAuthed(false);
    setModal(null);
    setUiState((prev) => ({ ...prev, view: 'dashboard', detailId: null }));
  }, []);

  const changePassword = useCallback(
    async (current: string, next: string): Promise<{ ok: boolean; error?: string }> => {
      if (!hasCredential()) return { ok: false, error: 'Önce bir şifre belirleyin.' };
      const me = getCredential();
      const ok = await verifyCredential(me?.user || '', current);
      if (!ok) return { ok: false, error: 'Mevcut şifre hatalı.' };
      if (!next || next.length < 4) return { ok: false, error: 'Yeni şifre en az 4 karakter olmalı.' };
      await setCredential(me?.user || '', next);
      return { ok: true };
    },
    [],
  );

  const updateDisplayName = useCallback((name: string) => {
    setDisplayName(name);
    setDisplayNameState(getDisplayName());
  }, []);

  const setUi = useCallback((p: Partial<UIState>) => {
    setUiState((prev) => ({ ...prev, ...p }));
  }, []);

  const go = useCallback((view: ViewKey, id?: string) => {
    setUiState((prev) => ({
      ...prev,
      view,
      detailId: id !== undefined ? id : prev.detailId,
    }));
    setModal(null);
  }, []);

  const mutate = useCallback((fn: (db: DB) => void): DB => {
    let next!: DB;
    setDb((prev) => {
      next = structuredClone(prev);
      fn(next);
      save(next);
      return next;
    });
    return next;
  }, []);

  const replaceDB = useCallback((newDb: DB) => {
    const cloned = structuredClone(newDb);
    migrate(cloned);
    save(cloned);
    setDb(cloned);
  }, []);

  const toast = useCallback((msg: string, type: '' | 'ok' | 'err' = '') => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3050);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        /* yok say */
      }
      return next;
    });
  }, []);

  const openModal = useCallback((m: ModalState) => setModal(m), []);
  const closeModal = useCallback(() => setModal(null), []);

  // ESC ile modal kapat (orijinal davranış)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModal(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      db,
      ready,
      authed,
      needsSetup,
      login,
      setupCredential,
      logout,
      changePassword,
      displayName,
      updateDisplayName,
      ui,
      setUi,
      go,
      mutate,
      replaceDB,
      toast,
      toasts,
      theme,
      toggleTheme,
      modal,
      openModal,
      closeModal,
      printJob,
      setPrintJob,
      bulkSel,
      setBulkSel,
      talepSel,
      setTalepSel,
    }),
    [
      db,
      ready,
      authed,
      needsSetup,
      login,
      setupCredential,
      logout,
      changePassword,
      displayName,
      updateDisplayName,
      ui,
      setUi,
      go,
      mutate,
      replaceDB,
      toast,
      toasts,
      theme,
      toggleTheme,
      modal,
      openModal,
      closeModal,
      printJob,
      bulkSel,
      talepSel,
    ],
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
