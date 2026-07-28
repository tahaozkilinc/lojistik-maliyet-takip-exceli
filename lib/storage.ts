/* ============================================================
   Dosya ekleri (logo, imzalı belgeler) — Supabase Storage.

   Eskiden bu dosyalar base64 olarak DOĞRUDAN app_db satırının içine
   gömülüydü. Satır dosya sayısı arttıkça büyüdü ve her açılış/kaydetme bu
   TEK büyük satırı taşımak zorunda kaldı — yavaş açılış ve zaman aşımı
   (statement_timeout, lock_timeout) hatalarının kök nedeni buydu. Artık
   dosyalar ayrı bir depoya yüklenir; app_db satırında yalnızca küçük bir
   referans tutulur.

   Geriye dönük uyumluluk: bu değişiklikten ÖNCE yüklenmiş belgeler/logolar
   hâlâ eski (gömülü data: URL) biçimdedir ve öyle çalışmaya devam eder —
   bkz. lib/seed.ts'teki sanitizeBelgeUrls, isValidBelgeData/isValidLogo.
   ============================================================ */
import { supabase, withTimeout } from './supabaseClient';
import { uid } from './format';
import { BELGELER_BUCKET, LOGOLAR_BUCKET } from './constants';
import type { DB, ImzaliBelge } from './types';

const STORAGE_PREFIX = 'storage:';

/** Bir ImzaliBelge.data değeri Storage işaretleyicisi mi (eski gömülü data: URL değil mi). */
export function isStorageRef(data: string | undefined | null): boolean {
  return !!data && data.startsWith(STORAGE_PREFIX);
}

function safeExt(fileName: string, fallback: string): string {
  const m = /\.([a-z0-9]{1,10})$/i.exec(fileName);
  return (m ? m[1] : fallback).toLowerCase();
}

/** Bir imzalı belgeyi (sözleşme, onay belgesi) özel depoya yükler. */
export async function uploadBelge(file: File): Promise<ImzaliBelge> {
  const path = `${uid('belge')}.${safeExt(file.name, 'bin')}`;
  const { error } = await withTimeout(
    supabase.storage.from(BELGELER_BUCKET).upload(path, file, { contentType: file.type, upsert: false }),
    'Belge yükleme',
  );
  if (error) throw error;
  return { ad: file.name, tip: file.type, boyut: (file.size / 1024).toFixed(0) + ' KB', data: STORAGE_PREFIX + path };
}

/** Bir logoyu herkese açık depoya yükler; doğrudan <img src> olarak kullanılabilir tam URL döner. */
export async function uploadLogo(file: File): Promise<string> {
  const path = `${uid('logo')}.${safeExt(file.name, 'png')}`;
  const { error } = await withTimeout(
    supabase.storage.from(LOGOLAR_BUCKET).upload(path, file, { contentType: file.type, upsert: false }),
    'Logo yükleme',
  );
  if (error) throw error;
  return supabase.storage.from(LOGOLAR_BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Bir belgeyi görüntülemek için kullanılabilir bir URL üretir. Eski (gömülü
 * data: URL) kayıtlarda değer zaten doğrudan kullanılabilir olduğundan
 * olduğu gibi döner; Storage işaretleyicisi ise kısa ömürlü (60sn) imzalı
 * bir bağlantı üretilir — belge özel depoda olduğundan (herkese açık değil)
 * her görüntülemede yeniden, oturum sahibi için üretilmesi gerekir.
 */
export async function resolveBelgeUrl(data: string): Promise<string | null> {
  if (!isStorageRef(data)) return data;
  const path = data.slice(STORAGE_PREFIX.length);
  try {
    const { data: signed, error } = await withTimeout(
      supabase.storage.from(BELGELER_BUCKET).createSignedUrl(path, 60),
      'Belge bağlantısı oluşturma',
    );
    if (error || !signed) return null;
    return signed.signedUrl;
  } catch {
    return null;
  }
}

/* ============================================================
   Var olan (bu değişiklikten ÖNCE yüklenmiş, hâlâ gömülü) dosyaları
   geriye dönük olarak Storage'a taşıma — app_db satırını GERÇEKTEN
   küçültmek için. Storage'a geçiş (yukarısı) yalnızca YENİ yüklemeleri
   kapsar; halihazırda gömülü dosyalar bu betik çalıştırılana kadar
   satırı büyük tutmaya devam eder ve tam da bu yüzden kaydetme zaman
   aşımları tekrarlanabilir.
   ============================================================ */

export type LegacyFileKind =
  | 'talepOnay'
  | 'denizOnay'
  | 'karaOnay'
  | 'tasimaOnay'
  | 'firmaLogo'
  | 'navlunFirmaLogo'
  | 'firmaSozlesme'
  | 'lokasyonSozlesme';

export interface LegacyFileRef {
  kind: LegacyFileKind;
  /** Ana kaydın id'si (talep, navlun kaydı, firma, lokasyon…). */
  id: string;
  /** Yalnızca sözleşmeler için: Sozlesme.id (bir firma/lokasyonun birden çok sözleşmesi olabilir). */
  subId?: string;
  data: string;
  ad: string;
  tip: string;
}

/** db içindeki tüm hâlâ-gömülü (data: URL) dosyaları bulur. */
export function findLegacyFiles(db: DB): LegacyFileRef[] {
  const out: LegacyFileRef[] = [];
  const legacy = (v: string | null | undefined): v is string => !!v && v.startsWith('data:');

  db.talepler.forEach((t) => {
    const b = t.onay && t.onay.imzaliBelge;
    if (b && legacy(b.data)) out.push({ kind: 'talepOnay', id: t.id, data: b.data, ad: b.ad, tip: b.tip });
  });
  db.denizNavlun.forEach((n) => {
    const b = n.onay && n.onay.imzaliBelge;
    if (b && legacy(b.data)) out.push({ kind: 'denizOnay', id: n.id, data: b.data, ad: b.ad, tip: b.tip });
  });
  db.karaNavlun.forEach((n) => {
    const b = n.onay && n.onay.imzaliBelge;
    if (b && legacy(b.data)) out.push({ kind: 'karaOnay', id: n.id, data: b.data, ad: b.ad, tip: b.tip });
  });
  db.tasimaTalepleri.forEach((t) => {
    const b = t.onay && t.onay.imzaliBelge;
    if (b && legacy(b.data)) out.push({ kind: 'tasimaOnay', id: t.id, data: b.data, ad: b.ad, tip: b.tip });
  });
  db.firmalar.forEach((f) => {
    if (legacy(f.logo)) out.push({ kind: 'firmaLogo', id: f.id, data: f.logo, ad: 'logo', tip: '' });
    (f.sozlesmeler || []).forEach((s) => {
      if (s.belge && legacy(s.belge.data)) {
        out.push({ kind: 'firmaSozlesme', id: f.id, subId: s.id, data: s.belge.data, ad: s.belge.ad, tip: s.belge.tip });
      }
    });
  });
  db.navlunFirmalari.forEach((f) => {
    if (legacy(f.logo)) out.push({ kind: 'navlunFirmaLogo', id: f.id, data: f.logo, ad: 'logo', tip: '' });
  });
  db.lokasyonlar.forEach((l) => {
    (l.sozlesmeler || []).forEach((s) => {
      if (s.belge && legacy(s.belge.data)) {
        out.push({ kind: 'lokasyonSozlesme', id: l.id, subId: s.id, data: s.belge.data, ad: s.belge.ad, tip: s.belge.tip });
      }
    });
  });
  return out;
}

function dataUrlToFile(dataUrl: string, filename: string, mime: string): File {
  const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(dataUrl);
  if (!m) throw new Error('Geçersiz data URL');
  const isB64 = !!m[2];
  const payload = m[3];
  let bytes: Uint8Array;
  if (isB64) {
    const bin = atob(payload);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } else {
    bytes = new TextEncoder().encode(decodeURIComponent(payload));
  }
  return new File([bytes], filename || 'dosya', { type: mime || m[1] });
}

/** Tek bir eski dosyayı Storage'a yükler; belge için "storage:<yol>", logo için tam URL döner. */
export async function migrateLegacyFile(ref: LegacyFileRef): Promise<string> {
  const file = dataUrlToFile(ref.data, ref.ad, ref.tip);
  if (ref.kind === 'firmaLogo' || ref.kind === 'navlunFirmaLogo') {
    return uploadLogo(file);
  }
  const belge = await uploadBelge(file);
  return belge.data;
}

export interface MigratedFile {
  ref: LegacyFileRef;
  newValue: string;
}

/** Taşınan dosyaların sonuçlarını bir DB taslağına uygular (mutate() içinde çağrılmalıdır). */
export function applyMigratedFiles(draft: DB, results: MigratedFile[]): void {
  for (const { ref, newValue } of results) {
    switch (ref.kind) {
      case 'talepOnay': {
        const t = draft.talepler.find((x) => x.id === ref.id);
        if (t && t.onay && t.onay.imzaliBelge) t.onay.imzaliBelge.data = newValue;
        break;
      }
      case 'denizOnay': {
        const n = draft.denizNavlun.find((x) => x.id === ref.id);
        if (n && n.onay && n.onay.imzaliBelge) n.onay.imzaliBelge.data = newValue;
        break;
      }
      case 'karaOnay': {
        const n = draft.karaNavlun.find((x) => x.id === ref.id);
        if (n && n.onay && n.onay.imzaliBelge) n.onay.imzaliBelge.data = newValue;
        break;
      }
      case 'tasimaOnay': {
        const t = draft.tasimaTalepleri.find((x) => x.id === ref.id);
        if (t && t.onay && t.onay.imzaliBelge) t.onay.imzaliBelge.data = newValue;
        break;
      }
      case 'firmaLogo': {
        const f = draft.firmalar.find((x) => x.id === ref.id);
        if (f) f.logo = newValue;
        break;
      }
      case 'navlunFirmaLogo': {
        const f = draft.navlunFirmalari.find((x) => x.id === ref.id);
        if (f) f.logo = newValue;
        break;
      }
      case 'firmaSozlesme': {
        const f = draft.firmalar.find((x) => x.id === ref.id);
        const s = f && f.sozlesmeler && f.sozlesmeler.find((x) => x.id === ref.subId);
        if (s) s.belge.data = newValue;
        break;
      }
      case 'lokasyonSozlesme': {
        const l = draft.lokasyonlar.find((x) => x.id === ref.id);
        const s = l && l.sozlesmeler && l.sozlesmeler.find((x) => x.id === ref.subId);
        if (s) s.belge.data = newValue;
        break;
      }
    }
  }
}
