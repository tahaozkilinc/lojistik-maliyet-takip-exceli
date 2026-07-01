'use client';
/* ============================================================
   Merkezi durum (state) yönetimi — Supabase ile merkezi kalıcılık
   (gerçek çoklu kullanıcı), localStorage çevrimdışı önbellek olarak,
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
import { LS_KEY, THEME_KEY, EMBED_FLAG_KEY, DIRTY_KEY, type ViewKey } from './constants';
import { emptyDB, migrate, normalizeDB, seedIfEmpty } from './seed';
import { embeddedData, EMBED_VERSION } from './seedData';
import { supabase } from './supabaseClient';
import {
  login as authLogin,
  logout as authLogout,
  changePassword as authChangePassword,
  updateDisplayName as authUpdateDisplayName,
  getCurrentUser,
  onAuthChange,
} from './auth';

const REMOTE_ROW_ID = 1;

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
  | { type: 'lokasyonToplu' }
  | { type: 'anlasma'; firmaId: string; anlId?: string }
  | { type: 'navlun'; id?: string }
  | { type: 'karaNavlun'; id?: string }
  | { type: 'navlunFirma'; id?: string }
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
  lokasyonId: string | null;
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
  /** E-posta/şifre ile giriş (Supabase Auth). */
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  /** Oturumu kapatır. */
  logout: () => void;
  /** Şifre değiştirir (mevcut şifre doğrulanır). */
  changePassword: (current: string, next: string) => Promise<{ ok: boolean; error?: string }>;
  /** Profilde görünen ad. */
  displayName: string;
  /** Görünen adı günceller. */
  updateDisplayName: (name: string) => Promise<void>;
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

function saveLocalCache(db: DB) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(db));
  } catch {
    // depolama dolu olabilir — sessizce geç (çağıran toast gösterebilir)
  }
}

/** Merkezi veritabanına henüz kaydedilmemiş yerel değişiklik olduğunu işaretler/temizler. */
function markDirty(isDirty: boolean) {
  try {
    if (isDirty) localStorage.setItem(DIRTY_KEY, '1');
    else localStorage.removeItem(DIRTY_KEY);
  } catch {
    /* yok say */
  }
}

/** Orijinal yükleme akışı: load → applyEmbedded → (yoksa) seedIfEmpty → migrate. */
function loadLocalCache(): DB {
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
  saveLocalCache(db);
  return db;
}

/** Merkezi (Supabase) veriyi okur; satır henüz yoksa null döner. */
async function fetchRemoteDB(): Promise<DB | null> {
  const { data, error } = await supabase.from('app_db').select('data').eq('id', REMOTE_ROW_ID).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return normalizeDB(data.data);
}

/** Merkezi (Supabase) veriyi yazar (upsert). */
async function pushRemoteDB(db: DB): Promise<void> {
  const { error } = await supabase.from('app_db').upsert({ id: REMOTE_ROW_ID, data: db });
  if (error) throw error;
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
  const [displayName, setDisplayNameState] = useState('');
  const toastId = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Henüz merkezi veritabanına onaylanmış şekilde kaydedilmemiş yerel değişiklik var mı. */
  const dirtyRef = useRef(false);
  const saveFailNotified = useRef(false);

  const [ui, setUiState] = useState<UIState>({
    view: 'dashboard',
    detailId: null,
    firmaId: null,
    lokasyonId: null,
    talepFilter: 'all',
    lokFilter: 'all',
    haritaFilter: 'all',
    navlunYil: new Date().getFullYear(),
    navlunHat: '__all',
    karaNavlunYil: new Date().getFullYear(),
    karaNavlunHat: '__all',
    search: '',
  });

  // Tema (auth'tan bağımsız, anında uygulanır).
  useEffect(() => {
    const t = localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
    setTheme(t);
    document.documentElement.setAttribute('data-theme', t);
  }, []);

  // Supabase oturum durumu: ilk yükleme + canlı değişiklik dinleyicisi.
  useEffect(() => {
    let active = true;
    (async () => {
      let user = null;
      try {
        user = await getCurrentUser();
      } catch {
        // Ağ hatası: oturumsuz kabul edilir, giriş ekranı gösterilir.
      }
      if (!active) return;
      setAuthed(!!user);
      setDisplayNameState(user?.displayName || '');
      if (!user) setReady(true);
    })();
    const unsubscribe = onAuthChange((user) => {
      setAuthed(!!user);
      setDisplayNameState(user?.displayName || '');
      if (!user) {
        setDb(emptyDB());
        setReady(true);
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Oturum açıldığında: merkezi veriyi yükle; ilk kurulumda yerel önbellekten taşı.
  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    (async () => {
      try {
        // Önceki oturumda bir değişiklik merkeze hiç kaydedilememiş olabilir (ör. ağ
        // hatası, beklenmedik kapanma). Böyle bir durumda sunucudaki (eski) veriyi
        // körlemesine kabul edip yerel değişikliği kaybetmemek için önce yerel
        // önbelleği merkeze göndermeyi dener, ardından merkezi veriyi kullanır.
        let unsynced = false;
        try {
          unsynced = localStorage.getItem(DIRTY_KEY) === '1';
        } catch {
          /* yok say */
        }
        if (unsynced) {
          const local = loadLocalCache();
          if (cancelled) return;
          dirtyRef.current = true;
          setDb(local);
          try {
            await pushRemoteDB(local);
            dirtyRef.current = false;
            markDirty(false);
          } catch {
            // Yine kaydedilemedi: yerel veriyle devam, bir sonraki değişiklikte tekrar denenecek
            // (dirtyRef true kalır — canlı eşitleme bu eski veriyi üzerine yazmaz).
          }
          if (!cancelled) setReady(true);
          return;
        }
        const remote = await fetchRemoteDB();
        if (cancelled) return;
        if (remote) {
          setDb(remote);
          saveLocalCache(remote);
        } else {
          const local = loadLocalCache();
          setDb(local);
          await pushRemoteDB(local);
        }
      } catch {
        // Ağ/izin hatası: yerel önbellekle devam et (çevrimdışı erişim kaybolmaz).
        const local = loadLocalCache();
        if (!cancelled) setDb(local);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authed]);

  // Canlı eşitleme: başka bir kullanıcı/sekme veriyi değiştirirse anında yansıt.
  useEffect(() => {
    if (!authed) return;
    const channel = supabase
      .channel('app_db_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_db', filter: `id=eq.${REMOTE_ROW_ID}` },
        (payload) => {
          // Henüz merkeze kaydedilmemiş yerel bir değişiklik varsa, gelen (muhtemelen
          // eski/sıraya girmiş) güncellemeyi uygulamak o değişikliği üzerine yazıp
          // kaybedebilir (talebin "kapanması"na yol açan tam da bu yarış durumuydu).
          // Yerel değişiklik kaydı onaylanana kadar gelen olayı atla.
          if (dirtyRef.current) return;
          const incoming = normalizeDB((payload.new as { data: unknown }).data);
          setDb(incoming);
          saveLocalCache(incoming);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [authed]);

  const login = useCallback(async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    return authLogin(email, password);
  }, []);

  const logout = useCallback(() => {
    authLogout().catch(() => {
      /* ağ hatası — yerel oturum durumu yine de temizlenir (onAuthChange ile) */
    });
    setModal(null);
    setUiState((prev) => ({ ...prev, view: 'dashboard', detailId: null }));
  }, []);

  const changePassword = useCallback(
    async (current: string, next: string): Promise<{ ok: boolean; error?: string }> => {
      return authChangePassword(current, next);
    },
    [],
  );

  const updateDisplayName = useCallback(async (name: string) => {
    await authUpdateDisplayName(name);
    setDisplayNameState(name.trim());
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

  const toast = useCallback((msg: string, type: '' | 'ok' | 'err' = '') => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3050);
  }, []);

  const scheduleRemoteSave = useCallback(
    (next: DB) => {
      dirtyRef.current = true;
      markDirty(true);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        pushRemoteDB(next)
          .then(() => {
            dirtyRef.current = false;
            markDirty(false);
            saveFailNotified.current = false;
          })
          .catch(() => {
            // Kaydedilemedi: yerel veri (ve dirty işareti) korunur, kısa süre sonra
            // otomatik tekrar denenir; kullanıcı yalnızca bir kez uyarılır.
            if (!saveFailNotified.current) {
              saveFailNotified.current = true;
              toast(
                'Değişiklik sunucuya kaydedilemedi. Yerel verileriniz korunuyor, bağlantı sağlanınca otomatik olarak yeniden denenecek.',
                'err',
              );
            }
            saveTimer.current = setTimeout(() => scheduleRemoteSave(next), 4000);
          });
      }, 600);
    },
    [toast],
  );

  const mutate = useCallback(
    (fn: (db: DB) => void): DB => {
      let next!: DB;
      setDb((prev) => {
        next = structuredClone(prev);
        fn(next);
        saveLocalCache(next);
        return next;
      });
      scheduleRemoteSave(next);
      return next;
    },
    [scheduleRemoteSave],
  );

  const replaceDB = useCallback(
    (newDb: DB) => {
      const cloned = structuredClone(newDb);
      migrate(cloned);
      saveLocalCache(cloned);
      setDb(cloned);
      scheduleRemoteSave(cloned);
    },
    [scheduleRemoteSave],
  );

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
      login,
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
      login,
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
