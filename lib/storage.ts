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
import type { ImzaliBelge } from './types';

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
