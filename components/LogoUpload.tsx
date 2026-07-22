'use client';
import React, { useRef } from 'react';
import { SAFE_IMAGE_MIME, LOGO_MAX_BYTES } from '@/lib/constants';

/** Firma/Navlun Firması formlarında ortak logo yükleme alanı. */
export function LogoUpload({
  value,
  onChange,
  toast,
}: {
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  toast: (msg: string, type?: '' | 'ok' | 'err') => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0];
    if (!f) return;
    // Güvenlik: yalnızca komut çalıştıramayan (script içeremeyen) görsel biçimleri kabul edilir — SVG hariç.
    if (!SAFE_IMAGE_MIME.test(f.type)) {
      toast('Yalnızca görsel (PNG/JPG/GIF/WebP) yükleyebilirsiniz', 'err');
      ev.target.value = '';
      return;
    }
    if (f.size > LOGO_MAX_BYTES) {
      toast(`Logo ${Math.round(LOGO_MAX_BYTES / 1024)} KB'tan büyük olamaz — daha küçük bir görsel seçin`, 'err');
      ev.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(f);
    ev.target.value = '';
  }

  return (
    <div className="field">
      <label>Logo</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {value ? (
          <img
            src={value}
            alt="Logo"
            style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--line)', background: '#fff' }}
          />
        ) : (
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 8,
              border: '1px dashed var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--faint)',
              fontSize: 10,
            }}
          >
            Yok
          </div>
        )}
        <button type="button" className="btn sm" onClick={() => fileRef.current?.click()}>
          {value ? 'Değiştir' : 'Logo Yükle'}
        </button>
        {value && (
          <button type="button" className="btn sm ghost" style={{ color: 'var(--red)' }} onClick={() => onChange(null)}>
            Kaldır
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/bmp,image/avif"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      <div className="hint">PNG/JPG/WebP, en fazla {Math.round(LOGO_MAX_BYTES / 1024)} KB. Küçük, şeffaf arkaplanlı logo önerilir.</div>
    </div>
  );
}
