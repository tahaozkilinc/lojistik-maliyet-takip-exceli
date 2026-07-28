'use client';
import React, { useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { ModalShell, ModalHead } from '@/components/Modal';
import { Icon } from '@/components/Icon';
import { exportData } from '@/lib/export';
import { normalizeDB } from '@/lib/seed';
import { KAYIT_ALANLARI, recordCount } from '@/lib/calc';
import { ROL_ETIKET, ROL_ACIKLAMA } from '@/lib/constants';
import type { AppRole, DB } from '@/lib/types';

const ROLLER: AppRole[] = ['admin', 'yonetici', 'goruntuleyici'];

/** Yanlışlıkla eski bir yedeğin geri yüklenip güncel kayıtların silinmesini önlemek için yazılması gereken metin. */
const CONFIRM_PHRASE = 'GERİ YÜKLE';

export function ProfilModal() {
  const { db, replaceDB, go, closeModal, toast, displayName, updateDisplayName, changePassword, role, profiles, updateUserRole } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(displayName);

  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [next2, setNext2] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  // Tüm sistemi (herkes için) tek bir dosyayla değiştirebilen bir işlem olduğundan,
  // gündelik düzenleme yetkisi olan "yönetici" değil, yalnızca "admin" tetikleyebilir.
  const canRestore = role === 'admin';
  const [pendingImport, setPendingImport] = useState<{ db: DB; fileName: string } | null>(null);
  const [confirmText, setConfirmText] = useState('');

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
        // Güvenlik: dış JSON prototip kirlenmesine ve tehlikeli belgelere karşı temizlenir.
        const clean = normalizeDB(parsed, db.meta);
        // Doğrudan değiştirmek yerine önce bir karşılaştırma/onay adımı gösterilir —
        // bu, TÜM kullanıcılar için geçerli olan tek paylaşılan veritabanını değiştirir;
        // yanlış (eski) bir dosya seçmek geri alınamaz veri kaybına yol açabilir.
        setConfirmText('');
        setPendingImport({ db: clean, fileName: f.name });
      } catch {
        toast('Geçersiz yedek dosyası', 'err');
      }
    };
    r.readAsText(f);
    ev.target.value = '';
  }

  function confirmRestore() {
    if (!pendingImport || confirmText.trim() !== CONFIRM_PHRASE) return;
    replaceDB(pendingImport.db);
    setPendingImport(null);
    setConfirmText('');
    go('dashboard');
    closeModal();
    toast('Yedek geri yüklendi', 'ok');
  }

  function cancelRestore() {
    setPendingImport(null);
    setConfirmText('');
  }

  if (pendingImport) {
    const lostTotal = KAYIT_ALANLARI.reduce((sum, { key }) => {
      return sum + Math.max(0, recordCount(db, key) - recordCount(pendingImport.db, key));
    }, 0);
    return (
      <ModalShell onClose={cancelRestore} style={{ maxWidth: 560 }}>
        <ModalHead title="Yedek Geri Yükleme Onayı" onClose={cancelRestore} />
        <div className="modal-body">
          <div className="login-err" style={{ marginBottom: 14 }}>
            <b>{pendingImport.fileName}</b> dosyası, sistemdeki TÜM verilerin (talepler, firmalar, fiyatlar,
            onaylar…) yerini alacak — bu değişiklik TÜM kullanıcılar için geçerli olur ve geri alınamaz.
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
                  const backup = recordCount(pendingImport.db, key);
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
          {lostTotal > 0 ? (
            <div className="login-err" style={{ marginBottom: 14 }}>
              Bu yedekte, şu an sistemde olandan toplam <b>{lostTotal}</b> kayıt daha az var (kırmızı işaretli
              satırlar). Bu genellikle yedek alındıktan SONRA eklenen kayıtların bu dosyada bulunmadığı anlamına
              gelir — geri yüklerseniz bu kayıtlar kalıcı olarak silinir.
            </div>
          ) : (
            <div className="hint" style={{ marginBottom: 14 }}>
              Bu yedek, mevcut verilerin gerisinde görünmüyor — yine de bu işlem tüm kullanıcılar için geçerli
              olacağından dikkatli onaylayın.
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
            />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={cancelRestore}>
            Vazgeç
          </button>
          <button className="btn danger" disabled={confirmText.trim() !== CONFIRM_PHRASE} onClick={confirmRestore}>
            Şimdi Geri Yükle
          </button>
        </div>
      </ModalShell>
    );
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
          Değişiklikleriniz zaten otomatik olarak buluta kaydedilir — ayrı bir &quot;kaydet&quot; adımı gerekmez. Ek güvence için
          tüm verilerinizi (talepler, firmalar, lokasyonlar…) JSON olarak yedekleyin ya da önceki bir yedeği geri yükleyin.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={handleExport}>
            <Icon name="download" size={14} />
            Yedek İndir
          </button>
          {canRestore && (
            <button className="btn" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={14} />
              Yedek Geri Yükle
            </button>
          )}
        </div>
        {!canRestore && (
          <div className="hint" style={{ marginTop: 8 }}>
            Yedek geri yükleme (tüm sistemi bu dosyayla değiştirme) yalnızca admin rolündeki kullanıcılar
            tarafından yapılabilir.
          </div>
        )}
        <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={closeModal}>
          Kapat
        </button>
      </div>
    </ModalShell>
  );
}
