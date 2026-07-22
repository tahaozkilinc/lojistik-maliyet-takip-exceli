'use client';
import React, { useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { ModalShell, ModalHead } from '@/components/Modal';
import { Icon } from '@/components/Icon';
import { SAFE_FILE_MIME } from '@/lib/constants';
import { uid } from '@/lib/format';
import type { ImzaliBelge } from '@/lib/types';

export function LokasyonSozlesmeModal({ lokasyonId }: { lokasyonId: string }) {
  const { db, mutate, closeModal, toast } = useStore();
  const l = db.lokasyonlar.find((x) => x.id === lokasyonId);
  const fileInput = useRef<HTMLInputElement>(null);

  const [baslik, setBaslik] = useState('');
  const [tarih, setTarih] = useState(new Date().toISOString().slice(0, 10));
  const [belge, setBelge] = useState<ImzaliBelge | null>(null);

  if (!l) return null;

  function handleFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    // Güvenlik: yalnızca script çalıştıramayan görsel biçimleri ve PDF kabul edilir.
    if (!SAFE_FILE_MIME.test(file.type)) {
      toast('Yalnızca görsel (PNG/JPG/GIF/WebP) veya PDF yükleyebilirsiniz', 'err');
      ev.target.value = '';
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast("Dosya 4MB'tan büyük olamaz", 'err');
      ev.target.value = '';
      return;
    }
    const r = new FileReader();
    r.onload = () => {
      setBelge({ ad: file.name, tip: file.type, boyut: (file.size / 1024).toFixed(0) + ' KB', data: String(r.result) });
      toast("Belge hazır — Ekle'ye basınca kaydedilir", 'ok');
    };
    r.readAsDataURL(file);
    ev.target.value = '';
  }

  function save() {
    if (!belge) {
      toast('Önce sözleşme dosyasını yükleyin', 'err');
      return;
    }
    mutate((d) => {
      const loc = d.lokasyonlar.find((x) => x.id === lokasyonId);
      if (!loc) return;
      if (!Array.isArray(loc.sozlesmeler)) loc.sozlesmeler = [];
      loc.sozlesmeler.push({
        id: uid('sz'),
        baslik: baslik.trim(),
        tarih,
        belge,
        createdAt: new Date().toISOString(),
      });
    });
    closeModal();
    toast('Sözleşme eklendi', 'ok');
  }

  return (
    <ModalShell onClose={closeModal}>
      <ModalHead title={'Sözleşme Ekle — ' + l.ad} onClose={closeModal} />
      <div className="modal-body">
        <div className="grid-2">
          <div className="field">
            <label>Sözleşme Başlığı</label>
            <input placeholder="örn. 2026 Yıllık Liman Sözleşmesi" value={baslik} onChange={(e) => setBaslik(e.target.value)} />
          </div>
          <div className="field">
            <label>Sözleşme Tarihi</label>
            <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>
            Sözleşme Belgesi <span className="req">*</span>
          </label>
          {belge ? (
            <div className="file-chip">
              <div className="fi">
                <Icon name="file" size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="fn">{belge.ad}</div>
                <div className="fs">{belge.boyut}</div>
              </div>
              <button className="btn sm ghost" onClick={() => setBelge(null)}>
                Kaldır
              </button>
            </div>
          ) : (
            <div className="dropzone" onClick={() => fileInput.current?.click()}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <path d="M17 8l-5-5-5 5" />
                <path d="M12 3v12" />
              </svg>
              <div style={{ fontWeight: 600, color: 'var(--text)' }}>Sözleşme belgesini yükleyin</div>
              <div style={{ fontSize: 12, marginTop: 3 }}>Taranmış PDF veya fotoğraf · sürükleyin ya da tıklayın</div>
            </div>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp,image/bmp,image/avif,application/pdf"
            style={{ display: 'none' }}
            onChange={handleFile}
          />
        </div>
      </div>
      <div className="modal-foot">
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={closeModal}>
          Vazgeç
        </button>
        <button className="btn primary" onClick={save}>
          Ekle
        </button>
      </div>
    </ModalShell>
  );
}
