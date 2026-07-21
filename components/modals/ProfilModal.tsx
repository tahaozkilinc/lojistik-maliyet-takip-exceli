'use client';
import React, { useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { ModalShell, ModalHead } from '@/components/Modal';
import { Icon } from '@/components/Icon';
import { exportData } from '@/lib/export';
import { normalizeDB, emptyDB } from '@/lib/seed';
import { ROL_ETIKET, ROL_ACIKLAMA } from '@/lib/constants';
import type { AppRole } from '@/lib/types';

const ROLLER: AppRole[] = ['admin', 'yonetici', 'goruntuleyici'];

export function ProfilModal() {
  const { db, replaceDB, go, closeModal, toast, displayName, updateDisplayName, changePassword, role, profiles, updateUserRole } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(displayName);

  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [next2, setNext2] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const canWrite = role === 'admin' || role === 'yonetici';

  async function saveName() {
    await updateDisplayName(name);
    toast('Profil güncellendi', 'ok');
  }

  async function savePassword() {
    setPwErr('');
    if (pwBusy) return;
    if (next !== next2) {
      setPwErr('Yeni şifreler eşleşmiyor.');
      return;
    }
    setPwBusy(true);
    try {
      const res = await changePassword(cur, next);
      if (!res.ok) {
        setPwErr(res.error || 'Şifre değiştirilemedi.');
        return;
      }
      setCur('');
      setNext('');
      setNext2('');
      toast('Şifre güncellendi', 'ok');
    } finally {
      setPwBusy(false);
    }
  }

  async function changeRole(userId: string, current: AppRole, next: string, email: string) {
    if (next === current) return;
    const label = ROL_ETIKET[next] || next;
    if (!confirm(`${email} kullanıcısının rolü "${label}" olarak değiştirilsin mi?`)) return;
    const res = await updateUserRole(userId, next as AppRole);
    if (res.ok) toast('Rol güncellendi', 'ok');
    else toast(res.error || 'Rol güncellenemedi', 'err');
  }

  function handleExport() {
    const ts = exportData(db);
    toast('Yedek indirildi: ' + ts + ' itibarıyla', 'ok');
  }

  function handleImport(ev: React.ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(String(r.result));
        if (!parsed || !parsed.talepler || !parsed.firmalar) throw new Error('invalid');
        if (!confirm('Mevcut veriler bu yedekle değiştirilecek. Devam edilsin mi?')) return;
        // Güvenlik: dış JSON prototip kirlenmesine ve tehlikeli belgelere karşı temizlenir.
        const clean = normalizeDB(parsed, db.meta);
        replaceDB(clean);
        go('dashboard');
        closeModal();
        toast('Yedek geri yüklendi', 'ok');
      } catch {
        toast('Geçersiz yedek dosyası', 'err');
      }
    };
    r.readAsText(f);
    ev.target.value = '';
  }

  return (
    <ModalShell onClose={closeModal} style={{ maxWidth: role === 'admin' ? 620 : 480 }}>
      <ModalHead title="Profil" onClose={closeModal} />
      <div className="modal-body">
        <div className="section-divider">
          <Icon name="user" size={14} />
          Profil Bilgileri
        </div>
        <div className="field">
          <label>Ad Soyad</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Adınızı girin" />
        </div>
        {role && (
          <div className="hint" style={{ marginBottom: 12 }}>
            <b>Rolünüz:</b> {ROL_ETIKET[role] || role} — {ROL_ACIKLAMA[role]}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
          <button className="btn sm primary" onClick={saveName}>
            Kaydet
          </button>
        </div>

        {role === 'admin' && (
          <>
            <div className="section-divider" style={{ marginTop: 18 }}>
              <Icon name="users" size={14} />
              Kullanıcı Yetkileri
            </div>
            <div className="hint" style={{ marginBottom: 10 }}>
              Admin olarak diğer kullanıcıların rolünü buradan değiştirebilirsiniz. Roller sunucu tarafında
              (Supabase RLS) zorunlu kılınır.
            </div>
            {profiles.length ? (
              <div style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', marginBottom: 4 }}>
                <table>
                  <thead>
                    <tr>
                      <th>E-posta</th>
                      <th>Rol</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((p) => (
                      <tr key={p.id}>
                        <td className="cell-strong" style={{ wordBreak: 'break-all' }}>
                          {p.email}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <select
                            value={p.role}
                            style={{ fontSize: 12.5, padding: '5px 8px' }}
                            onChange={(e) => changeRole(p.id, p.role, e.target.value, p.email)}
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
              </div>
            ) : (
              <div className="hint" style={{ marginBottom: 10 }}>
                Henüz başka kullanıcı yok. Yeni kullanıcı eklemek için Supabase Dashboard → Authentication → Users →
                Add user kullanın; kullanıcı otomatik olarak &quot;Görüntüleyici&quot; rolüyle burada listelenir.
              </div>
            )}
          </>
        )}

        <div className="section-divider">
          <Icon name="lock" size={14} />
          Şifre Değiştir
        </div>
        <div className="field">
          <label>Mevcut Şifre</label>
          <input type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />
        </div>
        <div className="field">
          <label>Yeni Şifre</label>
          <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
        <div className="field">
          <label>Yeni Şifre (Tekrar)</label>
          <input type="password" autoComplete="new-password" value={next2} onChange={(e) => setNext2(e.target.value)} />
        </div>
        {pwErr && <div className="login-err">{pwErr}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
          <button className="btn sm primary" onClick={savePassword} disabled={pwBusy}>
            {pwBusy ? 'Kaydediliyor…' : 'Şifreyi Güncelle'}
          </button>
        </div>

        <div className="section-divider">
          <Icon name="save" size={14} />
          Veri Yönetimi
        </div>
        <div className="hint" style={{ marginBottom: 10 }}>
          Tüm verilerinizi (talepler, firmalar, lokasyonlar…) JSON olarak yedekleyin veya önceki bir yedeği geri yükleyin.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canWrite && (
            <button className="btn primary" onClick={() => { replaceDB(db); toast('Veriler buluta kaydediliyor…', 'ok'); }}>
              <Icon name="upload" size={14} />
              Buluta Kaydet (Supabase)
            </button>
          )}
          <button className="btn" onClick={handleExport}>
            <Icon name="download" size={14} />
            Yedek İndir
          </button>
          {canWrite && (
            <button className="btn" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={14} />
              Yedek Geri Yükle
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />

        {canWrite && (
          <>
            <div className="section-divider" style={{ marginTop: 18 }}>
              <Icon name="warning" size={14} />
              Tehlikeli Bölge
            </div>
            <div className="hint" style={{ marginBottom: 10 }}>
              Tüm kayıtları kalıcı olarak siler. Bu işlem geri alınamaz — önce yedek almanızı öneririz.
            </div>
            <button
              className="btn danger"
              onClick={() => {
                if (!confirm('TÜM veri silinecek: talepler, firmalar, lokasyonlar, navlun kayıtları. Bu işlem GERİ ALINAMAZ. Devam edilsin mi?')) return;
                if (!confirm('Son onay: gerçekten her şey silinsin mi?')) return;
                replaceDB(emptyDB());
                go('dashboard');
                closeModal();
                toast('Tüm veriler silindi', 'ok');
              }}
            >
              Tüm Verileri Sil
            </button>
          </>
        )}
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={closeModal}>
          Kapat
        </button>
      </div>
    </ModalShell>
  );
}
