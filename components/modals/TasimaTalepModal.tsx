'use client';
import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { ModalShell, ModalHead } from '@/components/Modal';
import { YUK_TIPLERI, INCOTERMS } from '@/lib/constants';
import { uid } from '@/lib/format';

export function TasimaTalepModal({ id }: { id?: string }) {
  const { db, mutate, closeModal, toast, go } = useStore();
  const x = id ? db.tasimaTalepleri.find((t) => t.id === id) : null;

  // Kimlik kullanıcının kendi sipariş numarasıdır; eski kayıtlarda talepNo'dan devralınır.
  const [siparisNo, setSiparisNo] = useState(x ? x.siparisNo || x.talepNo || '' : '');
  const [kalkis, setKalkis] = useState(x ? x.kalkisYeri || '' : '');
  const [varis, setVaris] = useState(x ? x.varisYeri || '' : '');
  const [yuk, setYuk] = useState(x ? x.yukTipi || '' : '');
  const [tarih, setTarih] = useState(x ? x.tarih || '' : '');
  // Eski kayıtlarda alan adı tasiyiciFirma idi; veri kaybolmasın diye geriye dönük okunur.
  const [yukSahibi, setYukSahibi] = useState(x ? x.yukSahibiFirma || x.tasiyiciFirma || '' : '');
  const [incoterm, setIncoterm] = useState(x ? x.incoterm || '' : '');
  const [notlar, setNotlar] = useState(x ? x.notlar || '' : '');

  // Otomatik tamamlama: mevcut taleplerdeki kalkış/varış yerleri.
  const kalkislar = [...new Set(db.tasimaTalepleri.map((t) => (t.kalkisYeri || '').trim()).filter(Boolean))];
  const varislar = [...new Set(db.tasimaTalepleri.map((t) => (t.varisYeri || '').trim()).filter(Boolean))];

  function save() {
    const sip = siparisNo.trim();
    if (!sip) {
      toast('Sipariş numaranızı girin', 'err');
      return;
    }
    const k = kalkis.trim();
    const v = varis.trim();
    if (!k || !v) {
      toast('Kalkış ve varış yerini girin', 'err');
      return;
    }
    const data = {
      siparisNo: sip,
      talepNo: sip,
      kalkisYeri: k,
      varisYeri: v,
      yukTipi: yuk.trim(),
      tarih: tarih,
      yukSahibiFirma: yukSahibi.trim(),
      incoterm: incoterm,
      notlar: notlar.trim(),
    };
    let newId = '';
    mutate((d) => {
      if (id) {
        const t = d.tasimaTalepleri.find((y) => y.id === id);
        if (t) Object.assign(t, data);
      } else {
        newId = uid('tt');
        d.tasimaTalepleri.push({
          id: newId,
          createdAt: new Date().toISOString(),
          durum: 'toplama',
          teklifler: [],
          secilenTeklifId: null,
          ...data,
        });
      }
    });
    closeModal();
    if (newId) {
      go('tasimaTalepDetay', newId);
      toast('Taşıma talebi oluşturuldu — deniz/kara/hava fiyatlarını girebilirsiniz', 'ok');
    } else {
      toast('Taşıma talebi güncellendi', 'ok');
    }
  }

  function del() {
    if (!confirm('Bu taşıma talebi ve içindeki tüm fiyatlar silinsin mi?')) return;
    mutate((d) => {
      d.tasimaTalepleri = d.tasimaTalepleri.filter((t) => t.id !== id);
    });
    closeModal();
    go('tasimaTalepleri');
    toast('Taşıma talebi silindi', 'ok');
  }

  return (
    <ModalShell onClose={closeModal}>
      <ModalHead title={x ? 'Taşıma Talebini Düzenle' : 'Yeni Taşıma Talebi'} onClose={closeModal} />
      <div className="modal-body">
        <div className="grid-2">
          <div className="field">
            <label>
              Sipariş No <span className="req">*</span>
            </label>
            <input placeholder="örn. SIP-2026-0154" value={siparisNo} onChange={(e) => setSiparisNo(e.target.value)} />
            <div className="hint">Kendi sipariş numaranız — talebin kimliği budur</div>
          </div>
          <div className="field">
            <label>Tarih</label>
            <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>
              Kalkış Yeri <span className="req">*</span>
            </label>
            <input list="ttKalkisList" autoComplete="off" placeholder="örn. Mersin" value={kalkis} onChange={(e) => setKalkis(e.target.value)} />
            <datalist id="ttKalkisList">
              {kalkislar.map((h) => (
                <option key={h} value={h} />
              ))}
            </datalist>
          </div>
          <div className="field">
            <label>
              Varış Yeri <span className="req">*</span>
            </label>
            <input list="ttVarisList" autoComplete="off" placeholder="örn. Rotterdam" value={varis} onChange={(e) => setVaris(e.target.value)} />
            <datalist id="ttVarisList">
              {varislar.map((h) => (
                <option key={h} value={h} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label>Yük</label>
            <input list="ttYukList" autoComplete="off" placeholder="örn. Mısır Özü" value={yuk} onChange={(e) => setYuk(e.target.value)} />
            <datalist id="ttYukList">
              {YUK_TIPLERI.map((y) => (
                <option key={y} value={y} />
              ))}
            </datalist>
          </div>
          <div className="field">
            <label>Yük Sahibi Firma</label>
            <input placeholder="Yükün ait olduğu firmayı yazın" value={yukSahibi} onChange={(e) => setYukSahibi(e.target.value)} />
            <div className="hint">Serbest metin — yükün taşındığı / ait olduğu müşteri firma</div>
          </div>
        </div>
        <div className="field">
          <label>Incoterms</label>
          <select value={incoterm} onChange={(e) => setIncoterm(e.target.value)}>
            <option value="">— Seçiniz —</option>
            {INCOTERMS.map((i) => (
              <option key={i.kod} value={i.kod}>
                {i.ad}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Notlar</label>
          <textarea placeholder="Özel koşul, geçerlilik, açıklama…" value={notlar} onChange={(e) => setNotlar(e.target.value)} />
        </div>
        <div className="hint">
          Deniz / Kara / Hava fiyatları talep oluşturulduktan sonra talep detayında girilir; teklif veren firmalar Navlun
          Firmaları listesinden seçilir.
        </div>
      </div>
      <div className="modal-foot">
        {x && (
          <button className="btn danger" onClick={del}>
            Sil
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={closeModal}>
          Vazgeç
        </button>
        <button className="btn primary" onClick={save}>
          {x ? 'Kaydet' : 'Oluştur'}
        </button>
      </div>
    </ModalShell>
  );
}
