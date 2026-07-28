'use client';
import React, { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { listAppDbHistory, getAppDbHistoryData } from '@/lib/backup';
import type { AppDbHistoryEntry } from '@/lib/backup';
import { dtt } from '@/lib/format';
import { Icon } from '@/components/Icon';
import { KAYIT_ALANLARI, recordCount } from '@/lib/calc';
import type { DB } from '@/lib/types';

/** Yanlışlıkla eski bir yedeğin geri yüklenip güncel kayıtların silinmesini önlemek için yazılması gereken metin. */
const CONFIRM_PHRASE = 'GERİ YÜKLE';

export function YedekGecmisi() {
  const { db, role, profiles, replaceDB, toast } = useStore();
  const [list, setList] = useState<AppDbHistoryEntry[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [pendingRestore, setPendingRestore] = useState<{ entry: AppDbHistoryEntry; data: DB } | null>(null);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (role !== 'admin') return;
    let cancelled = false;
    listAppDbHistory().then((rows) => {
      if (!cancelled) setList(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [role]);

  if (role !== 'admin') {
    return (
      <div className="empty" style={{ padding: 50 }}>
        <Icon name="lock" size={44} sw={1.5} />
        <h3>Bu sayfayı görüntüleme yetkiniz yok</h3>
        <p>Yedek geçmişini yalnızca admin rolündeki kullanıcılar görebilir.</p>
      </div>
    );
  }

  async function geriYukle(entry: AppDbHistoryEntry) {
    setBusyId(entry.id);
    try {
      const data = await getAppDbHistoryData(entry.id);
      if (!data) {
        toast('Yedek verisi okunamadı', 'err');
        return;
      }
      setConfirmText('');
      setPendingRestore({ entry, data });
    } finally {
      setBusyId(null);
    }
  }

  function confirmRestore() {
    if (!pendingRestore || confirmText.trim() !== CONFIRM_PHRASE) return;
    replaceDB(pendingRestore.data);
    setPendingRestore(null);
    setConfirmText('');
    toast('Yedek geri yüklendi', 'ok');
  }

  function cancelRestore() {
    setPendingRestore(null);
    setConfirmText('');
  }

  const emailOf = (uid: string | null) => (uid && profiles.find((p) => p.id === uid)?.email) || null;

  if (pendingRestore) {
    const lostTotal = KAYIT_ALANLARI.reduce((sum, { key }) => {
      return sum + Math.max(0, recordCount(db, key) - recordCount(pendingRestore.data, key));
    }, 0);
    return (
      <div className="panel">
        <div className="panel-head">
          <h2>Geri Yükleme Onayı</h2>
        </div>
        <div className="panel-body">
          <div className="login-err" style={{ marginBottom: 14 }}>
            <b>{dtt(pendingRestore.entry.created_at)}</b> tarihli kurtarma noktasına dönmek üzeresiniz. Bu, sistemdeki
            TÜM verilerin yerini alacak — bu andan sonra eklenmiş kayıtlar bu yedekte yoksa kalıcı olarak silinebilir
            ve bu değişiklik TÜM kullanıcılar için geçerli olur.
          </div>
          <div style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
            <table>
              <thead>
                <tr>
                  <th>Kayıt Türü</th>
                  <th style={{ textAlign: 'right' }}>Şu An</th>
                  <th style={{ textAlign: 'right' }}>Bu Yedekte</th>
                </tr>
              </thead>
              <tbody>
                {KAYIT_ALANLARI.map(({ key, label }) => {
                  const now = recordCount(db, key);
                  const backup = recordCount(pendingRestore.data, key);
                  const kayipVar = backup < now;
                  return (
                    <tr key={key}>
                      <td>{label}</td>
                      <td style={{ textAlign: 'right' }}>{now}</td>
                      <td
                        style={{
                          textAlign: 'right',
                          color: kayipVar ? 'var(--red)' : undefined,
                          fontWeight: kayipVar ? 700 : undefined,
                        }}
                      >
                        {backup}
                        {kayipVar ? ' ▼' : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {lostTotal > 0 && (
            <div className="login-err" style={{ marginBottom: 14 }}>
              Bu yedekte, şu an sistemde olandan toplam <b>{lostTotal}</b> kayıt daha az var (kırmızı işaretli
              satırlar). Geri yüklerseniz bu kayıtlar kalıcı olarak silinir.
            </div>
          )}
          <div className="field">
            <label>
              Onaylamak için <b>{CONFIRM_PHRASE}</b> yazın
            </label>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              autoFocus
              style={{ maxWidth: 260 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={cancelRestore}>
              Vazgeç
            </button>
            <button className="btn danger" disabled={confirmText.trim() !== CONFIRM_PHRASE} onClick={confirmRestore}>
              Şimdi Geri Yükle
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="hint" style={{ marginBottom: 16 }}>
        Sistem, her kaydetmede en fazla 30 dakikada bir otomatik olarak bir kurtarma noktası tutar (30 gün saklanır) —
        elle bir şey yapmanız gerekmez. Bir sorun olursa buradan önceki bir duruma dönebilirsiniz; geri yüklemeden
        önce net bir karşılaştırma ve onay adımı gösterilir.
      </div>
      <div className="panel">
        <div className="panel-head">
          <h2>Yedek Geçmişi</h2>
          <div className="spacer" />
          <span className="tag">{list ? list.length : '…'} kurtarma noktası</span>
        </div>
        <div className="panel-body flush">
          {list === null ? (
            <div className="empty" style={{ padding: 30 }}>
              <p>Yükleniyor…</p>
            </div>
          ) : list.length ? (
            <table>
              <thead>
                <tr>
                  <th>Tarih / Saat</th>
                  <th>Kaydeden</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((e) => (
                  <tr key={e.id}>
                    <td className="cell-strong">{dtt(e.created_at)}</td>
                    <td>{emailOf(e.updated_by) || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn sm" disabled={busyId === e.id} onClick={() => geriYukle(e)}>
                        {busyId === e.id ? 'Geri yükleniyor…' : 'Bu Duruma Geri Yükle'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty" style={{ padding: 30 }}>
              <p>Henüz kurtarma noktası oluşmadı. İlk kaydetmeden sonra burada görünecek.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
