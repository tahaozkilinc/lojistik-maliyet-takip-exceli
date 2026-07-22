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
import type { AppRole, DB, Profile } from './types';
import { LS_KEY, THEME_KEY, EMBED_FLAG_KEY, DIRTY_KEY, type ViewKey } from './constants';
import { emptyDB, migrate, normalizeDB, seedIfEmpty } from './seed';
import { mergeDB } from './merge';
import { embeddedData, EMBED_VERSION } from './seedData';
import { supabase } from './supabaseClient';
import {
  login as authLogin,
  logout as authLogout,
  changePassword as authChangePassword,
  updateDisplayName as authUpdateDisplayName,
  getCurrentUser,
  onAuthChange,
  getMyRole,
  listProfiles,
  updateUserRole as authUpdateUserRole,
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
  | { type: 'sozlesme'; firmaId: string }
  | { type: 'navlun'; id?: string }
  | { type: 'karaNavlun'; id?: string }
  | { type: 'navlunFirma'; id?: string }
  | { type: 'tasimaTalep'; id?: string }
  | { type: 'tasimaIndirim'; talepId: string }
  | { type: 'tasimaOnay'; id: string }
  | { type: 'limanTalep'; id?: string }
  | { type: 'limanMasraf'; talepId: string; masrafId?: string }
  | { type: 'kur' }
  | { type: 'profil' }
  | null;

export type PrintJob =
  | { type: 'single'; id: string }
  | { type: 'combined'; ids: string[] }
  | { type: 'tasima'; id: string }
  | null;

export type ToastItem = { id: number; msg: string; type: '' | 'ok' | 'err' };

export interface UIState {
  view: ViewKey;
  detailId: string | null;
  firmaId: string | null;
  lokasyonId: string | null;
  limanTalepId: string | null;
  navlunFirmaId: string | null;
  talepFilter: string;
  lokFilter: string;
  haritaFilter: string;
  tasimaFilter: string;
  navlunYil: number;
  navlunHat: string;
  navlunPanelYil: number;
  navlunPanelHat: string;
  navlunPanelTip: 'c20' | 'c40';
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
  /** Geçerli kullanıcının yetki rolü — bilinene kadar (giriş sonrası kısa bir süre) null. */
  role: AppRole | null;
  /** Tüm kullanıcı profilleri (Kullanıcı Rolleri ekranı içindir). */
  profiles: Profile[];
  /** Bir kullanıcının rolünü değiştirir — sunucu tarafında (RLS) yalnızca admin yapabilir. */
  updateUserRole: (userId: string, role: AppRole) => Promise<{ ok: boolean; error?: string }>;
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

/**
 * Derin kopya. `structuredClone` eski tarayıcılarda (özellikle iOS Safari
 * 15.4 öncesi) TANIMSIZDIR; orada doğrudan çağırınca ReferenceError fırlatır
 * ve talep ekleme gibi tüm mutasyonlar patlar. DB tamamen JSON'a çevrilebilir
 * olduğundan güvenli evrensel yedek olarak JSON kopyası kullanılır.
 */
function deepClone<T>(obj: T): T {
  try {
    if (typeof structuredClone === 'function') return structuredClone(obj);
  } catch {
    /* structuredClone bazı değerlerde patlayabilir — JSON'a düş */
  }
  return JSON.parse(JSON.stringify(obj)) as T;
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
  const [role, setRole] = useState<AppRole | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const toastId = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Henüz merkezi veritabanına onaylanmış şekilde kaydedilmemiş yerel değişiklik var mı. */
  const dirtyRef = useRef(false);
  const saveFailNotified = useRef(false);
  const historyInitRef = useRef(false);
  const isPoppingRef = useRef(false);
  const dbRef = useRef<DB>(emptyDB());
  /** mutate()/replaceDB() içinde senkron erişim için — role state'i asenkron güncellenir. */
  const roleRef = useRef<AppRole | null>(null);
  /**
   * Son bilinen, sunucuyla eşleşen ortak durum ("base") — üç yönlü birleştirme
   * için gereklidir. Yalnızca sunucudan gerçekten doğrulanmış bir veri alındığında
   * (ilk yükleme, canlı eşitleme veya başarılı bir kaydetme sonrası) güncellenir.
   */
  const baseRef = useRef<DB | null>(null);

  const [ui, setUiState] = useState<UIState>({
    view: 'dashboard',
    detailId: null,
    firmaId: null,
    lokasyonId: null,
    limanTalepId: null,
    navlunFirmaId: null,
    talepFilter: 'all',
    lokFilter: 'all',
    haritaFilter: 'all',
    tasimaFilter: 'toplama',
    navlunYil: new Date().getFullYear(),
    navlunHat: '__all',
    navlunPanelYil: new Date().getFullYear(),
    navlunPanelHat: '__all',
    navlunPanelTip: 'c20',
    karaNavlunYil: new Date().getFullYear(),
    karaNavlunHat: '__all',
    search: '',
  });

  // dbRef'i her render sonrası güncel tut (mutate için senkron erişim).
  useEffect(() => { dbRef.current = db; });
  useEffect(() => { roleRef.current = role; });

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
      if (!user) {
        setRole(null);
        setReady(true);
      }
    })();
    const unsubscribe = onAuthChange((user) => {
      setAuthed(!!user);
      setDisplayNameState(user?.displayName || '');
      if (!user) {
        setDb(emptyDB());
        setRole(null);
        setProfiles([]);
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
          dbRef.current = local;
          setDb(local);
          try {
            // Bu oturumdan önceki bir kaydetme hiç merkeze ulaşmamış olabilir; ama
            // merkezdeki veri de bu arada başkası tarafından değiştirilmiş olabilir.
            // Körlemesine üzerine yazmak yerine, bilinen bir ortak "base" olmadan
            // (base=null → birleşim + çakışmada yerel kazanır) üç yönlü birleştir.
            const remote = await fetchRemoteDB();
            const merged = remote ? mergeDB(null, local, remote) : local;
            await pushRemoteDB(merged);
            baseRef.current = merged;
            dbRef.current = merged;
            setDb(merged);
            saveLocalCache(merged);
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
          dbRef.current = remote;
          baseRef.current = remote;
          setDb(remote);
          saveLocalCache(remote);
          try { localStorage.setItem(EMBED_FLAG_KEY, EMBED_VERSION); } catch { /* yok say */ }
        } else {
          const local = loadLocalCache();
          dbRef.current = local;
          setDb(local);
          await pushRemoteDB(local);
          baseRef.current = local;
        }
      } catch {
        // Ağ/izin hatası: yerel önbellekle devam et (çevrimdışı erişim kaybolmaz).
        const local = loadLocalCache();
        if (!cancelled) setDb(local);
      } finally {
        // Rol, uygulama etkileşimli hale gelmeden ÖNCE bilinmeli — aksi halde
        // mutate() kısa bir süre için rol kontrolünü (henüz null olduğu için)
        // hatalı biçimde reddedebilir/izin verebilir.
        try {
          const r = await getMyRole();
          if (!cancelled) setRole(r);
        } catch {
          if (!cancelled) setRole('goruntuleyici');
        }
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
        () => {
          // Henüz merkeze kaydedilmemiş yerel bir değişiklik varsa, gelen (muhtemelen
          // eski/sıraya girmiş) güncellemeyi uygulamak o değişikliği üzerine yazıp
          // kaybedebilir. Yerel değişiklik kaydı onaylanana kadar olayı atla.
          if (dirtyRef.current) return;
          // ÖNEMLİ: Realtime olay yükü (payload.new.data) büyük JSONB satırlarında
          // Supabase tarafından kırpılabilir; kırpılmış/eksik veriyi doğrudan
          // uygulamak arayüzü boşaltır ("DB'den kopma"). Bunun yerine güvenilir tam
          // satırı tablodan yeniden çekeriz.
          (async () => {
            try {
              const remote = await fetchRemoteDB();
              // Fetch sırasında yerel bir değişiklik başladıysa üzerine yazma.
              if (remote && !dirtyRef.current) {
                dbRef.current = remote;
                baseRef.current = remote;
                setDb(remote);
                saveLocalCache(remote);
              }
            } catch {
              /* geçici ağ hatası — yerel veriyle devam, sonraki olayda tekrar denenir */
            }
          })();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [authed]);

  // Kullanıcı listesi yalnızca Kullanıcı Rolleri ekranı (admin) içindir; admin
  // olunduğunda arka planda yüklenir, uygulamanın hazır olmasını beklemez.
  useEffect(() => {
    if (!authed || role !== 'admin') return;
    let cancelled = false;
    listProfiles().then((list) => {
      if (!cancelled) setProfiles(list);
    });
    return () => {
      cancelled = true;
    };
  }, [authed, role]);

  // Rol değişikliklerini (kendi rolümüz dahil) anında yansıt.
  useEffect(() => {
    if (!authed) return;
    const channel = supabase
      .channel('profiles_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        (async () => {
          try {
            const r = await getMyRole();
            setRole(r);
            if (roleRef.current === 'admin' || r === 'admin') {
              setProfiles(await listProfiles());
            }
          } catch {
            /* geçici ağ hatası — bir sonraki olayda tekrar denenir */
          }
        })();
      })
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

  const updateUserRole = useCallback(async (userId: string, newRole: AppRole): Promise<{ ok: boolean; error?: string }> => {
    const res = await authUpdateUserRole(userId, newRole);
    if (res.ok) {
      setProfiles(await listProfiles());
      const { data } = await supabase.auth.getUser();
      if (data.user?.id === userId) setRole(newRole);
    }
    return res;
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

  /**
   * Kaydetmeden hemen önce sunucudaki güncel veriyi yeniden çekip üç yönlü
   * birleştirir (bkz. lib/merge.ts). Böylece iki kullanıcı/sekme birbirine
   * yakın zamanda kaydettiğinde biri diğerinin eklediği/değiştirdiği
   * kayıtları (fiyatlar dahil) körlemesine silmez — ikisi de korunur.
   */
  const doRemoteSave = useCallback(() => {
    const localSnapshot = dbRef.current;
    (async () => {
      try {
        const remote = await fetchRemoteDB();
        const merged: DB = remote ? mergeDB(baseRef.current, localSnapshot, remote) : localSnapshot;
        await pushRemoteDB(merged);
        baseRef.current = merged;
        // Bu kaydetme sürerken (fetch/push beklenirken) yeni bir mutate()/replaceDB()
        // çalıştıysa dbRef.current artık farklı bir nesneyi gösterir — o durumda
        // ESKİ (localSnapshot tabanlı) sonucu ekrana/dbRef'e yazıp daha yeni yerel
        // değişikliği EZMEYİZ; o değişiklik zaten kendi zamanlanmış kaydını
        // (scheduleRemoteSave) bekliyor ve bir sonraki turda bu güncel base'e göre
        // yeniden birleştirilecek.
        if (dbRef.current === localSnapshot) {
          dbRef.current = merged;
          setDb(merged);
          saveLocalCache(merged);
          dirtyRef.current = false;
          markDirty(false);
        }
        saveFailNotified.current = false;
      } catch {
        // Kaydedilemedi: yerel veri (ve dirty işareti) korunur, kısa süre sonra
        // otomatik tekrar denenir (yeniden çekip yeniden birleştirerek); kullanıcı
        // yalnızca bir kez uyarılır.
        if (!saveFailNotified.current) {
          saveFailNotified.current = true;
          toast(
            'Değişiklik sunucuya kaydedilemedi. Yerel verileriniz korunuyor, bağlantı sağlanınca otomatik olarak yeniden denenecek.',
            'err',
          );
        }
        saveTimer.current = setTimeout(doRemoteSave, 4000);
      }
    })();
  }, [toast]);

  const scheduleRemoteSave = useCallback(() => {
    dirtyRef.current = true;
    markDirty(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(doRemoteSave, 600);
  }, [doRemoteSave]);

  // Güvenlik: görüntüleyici rolü hiçbir veri değiştiremez. Bu kontrol yalnızca
  // arayüzde anında geri bildirim (toast) içindir — asıl zorlama Supabase RLS
  // politikalarıyla (bkz. supabase/migrations/0004_kullanici_rolleri.sql)
  // sunucu tarafında yapılır; biri istemciyi atlayıp doğrudan Supabase'e
  // yazmaya çalışsa bile veritabanı reddeder.
  const canWrite = useCallback((): boolean => {
    if (roleRef.current === 'admin' || roleRef.current === 'yonetici') return true;
    toast('Görüntüleyici yetkisiyle değişiklik yapamazsınız.', 'err');
    return false;
  }, [toast]);

  const mutate = useCallback(
    (fn: (db: DB) => void): DB => {
      if (!canWrite()) return dbRef.current;
      const next = deepClone(dbRef.current);
      fn(next);
      dbRef.current = next;
      saveLocalCache(next);
      setDb(next);
      scheduleRemoteSave();
      return next;
    },
    [scheduleRemoteSave, canWrite],
  );

  const replaceDB = useCallback(
    (newDb: DB) => {
      if (!canWrite()) return;
      const cloned = deepClone(newDb);
      migrate(cloned);
      dbRef.current = cloned;
      saveLocalCache(cloned);
      setDb(cloned);
      scheduleRemoteSave();
    },
    [scheduleRemoteSave, canWrite],
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

  // Sayfa geçişlerinde tarayıcı geçmişine kayıt ekle
  useEffect(() => {
    if (isPoppingRef.current) {
      isPoppingRef.current = false;
      return;
    }
    const histState = {
      view: ui.view,
      detailId: ui.detailId,
      firmaId: ui.firmaId,
      lokasyonId: ui.lokasyonId,
      limanTalepId: ui.limanTalepId,
      navlunFirmaId: ui.navlunFirmaId,
    };
    if (!historyInitRef.current) {
      history.replaceState(histState, '');
      historyInitRef.current = true;
    } else {
      history.pushState(histState, '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.view]);

  // Tarayıcı geri/ileri tuşu desteği
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const s = e.state as {
        view?: string;
        detailId?: string | null;
        firmaId?: string | null;
        lokasyonId?: string | null;
        limanTalepId?: string | null;
        navlunFirmaId?: string | null;
      } | null;
      if (!s?.view) return;
      isPoppingRef.current = true;
      setUiState((prev) => ({
        ...prev,
        view: s.view as ViewKey,
        detailId: s.detailId ?? null,
        firmaId: s.firmaId ?? null,
        lokasyonId: s.lokasyonId ?? null,
        limanTalepId: s.limanTalepId ?? null,
        navlunFirmaId: s.navlunFirmaId ?? null,
      }));
      setModal(null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
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
      role,
      profiles,
      updateUserRole,
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
      role,
      profiles,
      updateUserRole,
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
