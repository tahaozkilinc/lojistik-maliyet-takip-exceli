'use client';
import React from 'react';
import { useStore } from '@/lib/store';
import { ROL_ETIKET, ROL_ACIKLAMA } from '@/lib/constants';
import { Icon } from '@/components/Icon';
import type { AppRole } from '@/lib/types';

const ROLLER: AppRole[] = ['admin', 'yonetici', 'goruntuleyici'];

export function KullaniciRolleri() {
  const { role, profiles, updateUserRole, toast } = useStore();

  if (role !== 'admin') {
    return (
      <div className="empty" style={{ padding: 50 }}>
        <Icon name="lock" size={44} sw={1.5} />
        <h3>Bu sayfayı görüntüleme yetkiniz yok</h3>
        <p>Kullanıcı rollerini yalnızca admin rolündeki kullanıcılar yönetebilir.</p>
      </div>
    );
  }

  async function changeRole(userId: string, current: AppRole, next: AppRole, email: string) {
    if (next === current) return;
    if (!confirm(`${email} kullanıcısının rolü "${ROL_ETIKET[next]}" olarak değiştirilsin mi?`)) return;
    const res = await updateUserRole(userId, next);
    if (res.ok) toast('Rol güncellendi', 'ok');
    else toast(res.error || 'Rol güncellenemedi', 'err');
  }

  return (
    <>
      <div className="hint" style={{ marginBottom: 16 }}>
        <b>Görüntüleyici:</b> yalnızca görüntüler, hiçbir kayıt ekleyemez/değiştiremez/silemez. <b>Yönetici:</b> talep,
        teklif, onay, fiyat — tüm operasyonel işlemleri yapabilir. <b>Admin:</b> yönetici yetkilerine ek olarak
        kullanıcı rollerini değiştirebilir. Roller sunucu tarafında (Supabase RLS) zorunlu kılınır.
      </div>
      <div className="panel">
        <div className="panel-head">
          <h2>Kullanıcılar</h2>
          <div className="spacer" />
          <span className="tag">{profiles.length} kullanıcı</span>
        </div>
        <div className="panel-body flush">
          {profiles.length ? (
            <table>
              <thead>
                <tr>
                  <th>E-posta</th>
                  <th>Rol</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id}>
                    <td className="cell-strong">{p.email}</td>
                    <td>
                      <span className="tag" title={ROL_ACIKLAMA[p.role]}>
                        {ROL_ETIKET[p.role] || p.role}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <select
                        value={p.role}
                        style={{ fontSize: 12.5, padding: '5px 8px' }}
                        onChange={(e) => changeRole(p.id, p.role, e.target.value as AppRole, p.email)}
                      >
                        {ROLLER.map((r) => (
                          <option key={r} value={r}>
                            {ROL_ETIKET[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty" style={{ padding: 30 }}>
              <p>Henüz kullanıcı yok.</p>
            </div>
          )}
        </div>
        <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--faint)', borderTop: '1px solid var(--line-2)' }}>
          Yeni kullanıcı eklemek için Supabase Dashboard → Authentication → Users → Add user kullanın; kullanıcı
          otomatik olarak &quot;Görüntüleyici&quot; rolüyle burada listelenir.
        </div>
      </div>
    </>
  );
}
