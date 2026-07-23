'use client';
import React, { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { listAppDbHistory, getAppDbHistoryData } from '@/lib/backup';
import type { AppDbHistoryEntry } from '@/lib/backup';
import { dtt } from '@/lib/format';
import { Icon } from '@/components/Icon';

export function YedekGecmisi() {
  const { role, profiles, replaceDB, toast } = useStore();
  const [list, setList] = useState<AppDbHistoryEntry[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

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
    if (
      !confirm(
        `${dtt(entry.created_at)} tarihli yedeğe geri dönülsün mü? Bu andan sonra yapılan değişiklikler (bu yedekte olmayanlar) kaybolabilir — devam etmeden önce dilerseniz önce Profil > Yedek İndir ile şu anki durumu da indirin.`,
      )
    )
      return;
    setBusyId(entry.id);
    try {
      const data = await getAppDbHistoryData(entry.id);
      if (!data) {
        toast('Yedek verisi okunamadı', 'err');
        return;
      }
      replaceDB(data);
      toast('Yedek geri yüklendi', 'ok');
    } finally {
      setBusyId(null);
    }
  }

  const emailOf = (uid: string | null) => (uid && profiles.find((p) => p.id === uid)?.email) || null;

  return (
    <>
      <div className="hint" style={{ marginBottom: 16 }}>
        Sistem, her kaydetmede en fazla 30 dakikada bir otomatik olarak bir kurtarma noktası tutar (30 gün saklanır) —
        elle bir şey yapmanız gerekmez. Bir sorun olursa buradan önceki bir duruma dönebilirsiniz. Geri yükleme,
        aradaki değişikliklerle güvenli şekilde birleştirilir (yalnızca gerçekten çakışan kayıtlarda seçtiğiniz yedek
        önceliklidir) — yine de emin olun.
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
