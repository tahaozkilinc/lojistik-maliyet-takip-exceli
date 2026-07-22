'use client';
import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { ModalShell, ModalHead } from '@/components/Modal';
import { Icon } from '@/components/Icon';
import { ModalMap } from '@/components/maps/ModalMap';
import { LOK_TIP, TEL_PH, PARA_KODLARI } from '@/lib/constants';
import { uid, telFmt } from '@/lib/format';

export function LokasyonModal({ id }: { id?: string }) {
  const { db, mutate, closeModal, toast } = useStore();
  const l = id ? db.lokasyonlar.find((x) => x.id === id) : null;
  const hasC = l && typeof l.lat === 'number' && typeof l.lng === 'number';

  const [ad, setAd] = useState(l ? l.ad : '');
  const [tip, setTip] = useState(l ? l.tip || 'Depo' : 'Depo');
  const [il, setIl] = useState(l ? l.il || l.sehir || '' : '');
  const [ilce, setIlce] = useState(l ? l.ilce || '' : '');
  const [iletisim, setIletisim] = useState(l ? l.iletisim || '' : '');
  const [tel, setTel] = useState(l && l.telefon ? l.telefon : '+90 ');
  const [email, setEmail] = useState(l ? l.email || '' : '');
  const [adres, setAdres] = useState(l ? l.adres || '' : '');
  const [notlar, setNotlar] = useState(l ? l.notlar || '' : '');
  const [fabrika, setFabrika] = useState(!!(l && l.fabrika));
  const [lat, setLat] = useState(hasC ? String(l!.lat) : '');
  const [lng, setLng] = useState(hasC ? String(l!.lng) : '');
  const [flyToken, setFlyToken] = useState(0);
  const [depoFiyat, setDepoFiyat] = useState(l?.depolamaMaliyeti?.fiyat != null ? String(l.depolamaMaliyeti.fiyat) : '');
  const [depoPara, setDepoPara] = useState(l?.depolamaMaliyeti?.paraBirimi || 'TRY');
  const [depoBirim, setDepoBirim] = useState(l?.depolamaMaliyeti?.birim || '');

  const tipList = l && l.tip && !LOK_TIP.includes(l.tip) ? [l.tip, ...LOK_TIP] : LOK_TIP;

  const coordMask = (v: string) => v.replace(',', '.').replace(/[^0-9.\-]/g, '');
  const laNum = parseFloat(lat);
  const loNum = parseFloat(lng);
  const mapLat = isFinite(laNum) && Math.abs(laNum) <= 90 ? laNum : null;
  const mapLng = isFinite(loNum) && Math.abs(loNum) <= 180 ? loNum : null;

  function konumGoster() {
    if (mapLat != null && mapLng != null) {
      setFlyToken((t) => t + 1);
      toast('Konum haritada gösterildi', 'ok');
    } else {
      toast('Geçerli enlem (-90..90) ve boylam (-180..180) girin', 'err');
    }
  }

  function onPick(la: number, lo: number) {
    setLat(la.toFixed(6));
    setLng(lo.toFixed(6));
  }

  function save() {
    const adt = ad.trim();
    if (!adt) {
      toast('Lokasyon adı zorunlu', 'err');
      return;
    }
    const ilt = il.trim();
    const konumVar = mapLat != null && mapLng != null;
    const depoFiyatNum = depoFiyat.trim() ? Number(depoFiyat.replace(',', '.')) : null;
    const data = {
      ad: adt,
      il: ilt,
      sehir: ilt,
      ilce: ilce.trim(),
      tip,
      iletisim: iletisim.trim(),
      telefon: tel.trim(),
      email: email.trim(),
      adres: adres.trim(),
      notlar: notlar.trim(),
      fabrika,
      lat: konumVar ? mapLat : null,
      lng: konumVar ? mapLng : null,
      depolamaMaliyeti:
        tip === 'Depo' && depoFiyatNum != null
          ? { fiyat: depoFiyatNum, paraBirimi: depoPara, birim: depoBirim.trim() }
          : null,
    };
    mutate((d) => {
      if (fabrika) d.lokasyonlar.forEach((x) => { if (x.id !== id) x.fabrika = false; });
      if (id) {
        const loc = d.lokasyonlar.find((x) => x.id === id);
        if (loc) Object.assign(loc, data);
        d.talepler.forEach((t) => {
          if (t.yuklemeLokasyonId === id) t.yuklemeNoktasi = adt;
          if (t.teslimLokasyonId === id) t.teslimNoktasi = adt;
        });
      } else {
        d.lokasyonlar.push({ id: uid('l'), createdAt: new Date().toISOString(), ...data });
      }
    });
    closeModal();
    toast(id ? 'Lokasyon güncellendi' : 'Lokasyon eklendi', 'ok');
  }

  function del() {
    const kullanim = db.talepler.filter((t) => t.yuklemeLokasyonId === id || t.teslimLokasyonId === id).length;
    if (
      !confirm(
        kullanim
          ? `Bu lokasyon ${kullanim} talepte kullanılıyor. Silinirse o taleplerde isim metin olarak kalır, istatistik hesaplanmaz. Devam edilsin mi?`
          : 'Lokasyon silinsin mi?',
      )
    )
      return;
    mutate((d) => {
      d.lokasyonlar = d.lokasyonlar.filter((x) => x.id !== id);
    });
    closeModal();
    toast('Lokasyon silindi');
  }

  return (
    <ModalShell onClose={closeModal} size="wide">
      <ModalHead title={l ? 'Lokasyonu Düzenle' : 'Yeni Lokasyon'} onClose={closeModal} />
      <div className="modal-body">
        <div className="grid-2">
          <div className="field">
            <label>
              Lokasyon Adı <span className="req">*</span>
            </label>
            <input placeholder="örn. Akgüller Deposu" value={ad} onChange={(e) => setAd(e.target.value)} />
          </div>
          <div className="field">
            <label>Tip</label>
            <select value={tip} onChange={(e) => setTip(e.target.value)}>
              {tipList.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid-3">
          <div className="field">
            <label>İl</label>
            <input placeholder="örn. Adana" value={il} onChange={(e) => setIl(e.target.value)} />
          </div>
          <div className="field">
            <label>İlçe</label>
            <input placeholder="örn. Seyhan" value={ilce} onChange={(e) => setIlce(e.target.value)} />
          </div>
          <div className="field">
            <label>İletişim Kişisi</label>
            <input placeholder="Ad Soyad" value={iletisim} onChange={(e) => setIletisim(e.target.value)} />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Telefon</label>
            <input placeholder={TEL_PH} value={tel} onChange={(e) => setTel(telFmt(e.target.value))} />
          </div>
          <div className="field">
            <label>E-posta</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Adres</label>
          <input value={adres} onChange={(e) => setAdres(e.target.value)} />
        </div>
        {tip === 'Depo' && (
          <>
            <div className="section-divider">
              <Icon name="save" size={14} />
              Depolama Maliyeti
            </div>
            <div className="grid-3">
              <div className="field">
                <label>Fiyat</label>
                <input inputMode="decimal" placeholder="0" value={depoFiyat} onChange={(e) => setDepoFiyat(e.target.value.replace(/[^-0-9.,]/g, ''))} />
              </div>
              <div className="field">
                <label>Para Birimi</label>
                <select value={depoPara} onChange={(e) => setDepoPara(e.target.value)}>
                  {PARA_KODLARI.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Birim</label>
                <input placeholder="örn. ton/ay" value={depoBirim} onChange={(e) => setDepoBirim(e.target.value)} />
              </div>
            </div>
          </>
        )}
        <div className="section-divider">
          <Icon name="mappin" size={14} />
          Harita Konumu (Enlem / Boylam)
        </div>
        <div className="grid-3" style={{ alignItems: 'end' }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Enlem (Latitude)</label>
            <input inputMode="decimal" placeholder="37.0671" value={lat} onChange={(e) => setLat(coordMask(e.target.value))} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Boylam (Longitude)</label>
            <input inputMode="decimal" placeholder="35.4126" value={lng} onChange={(e) => setLng(coordMask(e.target.value))} />
          </div>
          <div style={{ marginBottom: 0 }}>
            <button className="btn primary" style={{ width: '100%' }} onClick={konumGoster}>
              Haritada Göster
            </button>
          </div>
        </div>
        <div className="hint" style={{ marginTop: 6 }}>
          Enlem ve boylamı girin (örn. <b>37.0671</b> / <b>35.4126</b>). Google Maps&apos;te bir yere sağ tıklayınca çıkan iki sayıdan ilki enlem,
          ikincisi boylamdır. Harita yüklenirse üzerine tıklayarak da seçebilirsiniz.
        </div>
        <div className="map-modal">
          <div className="hint-overlay">Konumu değiştirmek için haritaya tıklayın</div>
          <ModalMap lat={mapLat} lng={mapLng} onPick={onPick} flyToken={flyToken} />
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label>Notlar</label>
          <textarea placeholder="Yükleme şartları, çalışma saatleri, ürün…" value={notlar} onChange={(e) => setNotlar(e.target.value)} />
        </div>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '11px 13px',
            background: 'var(--gold-soft)',
            border: '1px solid var(--gold)',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <input type="checkbox" style={{ width: 'auto' }} checked={fabrika} onChange={(e) => setFabrika(e.target.checked)} /> Bu bizim fabrikamız — yeni
          taleplerde varsayılan teslim noktası olsun
        </label>
      </div>
      <div className="modal-foot">
        {l && (
          <button className="btn danger" onClick={del}>
            Sil
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={closeModal}>
          Vazgeç
        </button>
        <button className="btn primary" onClick={save}>
          {l ? 'Kaydet' : 'Ekle'}
        </button>
      </div>
    </ModalShell>
  );
}
