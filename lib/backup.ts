/* ============================================================
   Otomatik yedek geçmişi — bkz. supabase/migrations/0005_otomatik_yedekleme.sql.
   Her kaydetmede sunucu tarafında (tetikleyiciyle) en fazla 30 dakikada bir
   anlık görüntü alınır, 30 gün saklanır. İstemciden yalnızca okunabilir ve
   (mevcut replaceDB() akışı üzerinden) geri yüklenebilir — yazılamaz/silinemez.
   ============================================================ */
import { supabase } from './supabaseClient';
import { normalizeDB } from './seed';
import type { DB } from './types';

export interface AppDbHistoryEntry {
  id: number;
  created_at: string;
  updated_by: string | null;
}

/** Kayıtlı yedek noktalarının listesini (veri içeriği hariç, hafif) döner — en yeni önce. */
export async function listAppDbHistory(): Promise<AppDbHistoryEntry[]> {
  const { data, error } = await supabase
    .from('app_db_history')
    .select('id, created_at, updated_by')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error || !data) return [];
  return data as AppDbHistoryEntry[];
}

/** Belirli bir yedek noktasının tam verisini döner (bulunamazsa null). */
export async function getAppDbHistoryData(id: number): Promise<DB | null> {
  const { data, error } = await supabase.from('app_db_history').select('data').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return normalizeDB(data.data);
}
