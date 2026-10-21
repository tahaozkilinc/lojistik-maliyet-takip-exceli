'use client';
import React, { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { ModalShell, ModalHead } from '@/components/Modal';
import { LokOptions } from './shared';
import { defaultTeslimId } from '@/lib/calc';
import { YUK_TIPLERI, PARA_KODLARI } from '@/lib/constants';
import { money, uid } from '@/lib/format';
import type { Lokasyon } from '@/lib/types';

interface TopluSatir {
  key: string;
  urunRaw: string;
  urun: string;
  lokasyonRaw: string;
  lokasyonId: string;
  fiyat: number;
  dahil: boolean;
  uyari?: string;
}

// Bilinen kısaltma/varyasyonların tam ürün adına eşlenmesi. Eşleşmeyen
// metinler olduğu gibi (baştaki/sondaki boşluk kırpılmış) bırakılır —
// önizleme ekranında kullanıcı yine de bir ürün seçmek zorundadır.
const URUN_ESLESTIRME: Record<string, string> = {
  MISIR: 'Mısır',
  'M.ÖZÜ': 'Mısır Özü',
  'MISIR ÖZÜ': 'Mısır Özü',
  'M.ÖZÜ KÜSPESİ': 'Mısır Özü Küspesi',
  'M.ÖZÜ KÜSP': 'Mısır Özü Küspesi',
  'MISIR ÖZÜ KÜSPESİ': 'Mısır Özü Küspesi',
  AYÇEKİRDEK: 'Ayçekirdeği',
  AYÇEKİRDEĞİ: 'Ayçekirdeği',
  SOYA: 'Soya',
  'SOYA KÜSPESİ': 'Soya Küspesi',
  'SOYA FASULYESİ': 'Soya Fasulyesi',
  ATK: 'ATK',
  GLUTEN: 'Gluten',
};

function normUrun(raw: string): string {
  const key = raw.trim().toLocaleUpperCase('tr-TR');
  return URUN_ESLESTIRME[key] || raw.trim();
}

function normTxt(s: string): string {
  return s.trim().toLocaleUpperCase('tr-TR').replace(/\s+/g, ' ');
}

/** "Ad — Şehir" veya "Ad - Şehir" biçimindeki lokasyon adının yalnızca baş kısmı. */
function lokAdBas(l: Lokasyon): string {
  return normTxt(l.ad.split(/[—-]/)[0]);
}

function eslesenLokasyon(fragment: string, lokalar: Lokasyon[]): Lokasyon | null {
  const nf = normTxt(fragment);
  if (!nf) return null;
  let hit = lokalar.find((l) => normTxt(l.ad) === nf || lokAdBas(l) === nf);
  if (hit) return hit;
  hit = lokalar.find((l) => lokAdBas(l).startsWith(nf) || nf.startsWith(lokAdBas(l)));
  return hit || null;
}

/** "1.250,50" / "1250.5" / "7498" gibi çeşitli biçimleri sayıya çevirir. */
function parseFiyat(raw: string): number | null {
  let s = raw.trim().replace(/[^\d.,]/g, '');
  if (!s) return null;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    const parts = s.split('.');
    const last = parts[parts.length - 1];
    if (!(parts.length === 2 && last.length <= 2)) s = s.replace(/\./g, '');
  }
  const n = parseFloat(s);
  return isFinite(n) && n > 0 ? n : null;
}

export function TopluAnlasmaModal({ firmaId }: { firmaId: string }) {
  const { db, mutate, closeModal, toast } = useStore();
  const f = db.firmalar.find((x) => x.id === firmaId);
  const [step, setStep] = useState<'yapistir' | 'onizleme'>('yapistir');
  const [metin, setMetin] = useState('');
  const [satirlar, setSatirlar] = useState<TopluSatir[]>([]);
  const [atlanan, setAtlanan] = useState<string[]>([]);
  const [teslimId, setTeslimId] = useState(() => defaultTeslimId(db));
  const [paraBirimi, setParaBirimi] = useState('TRY');

  const urunOptionsAll = useMemo(() => {
    const set = new Set(YUK_TIPLERI);
    (f?.anlasmalar || []).forEach((a) => a.yukTipi && set.add(a.yukTipi));
    satirlar.forEach((r) => r.urun && set.add(r.urun));
    return [...set].sort((a, b) => a.localeCompare(b, 'tr'));
  }, [f, satirlar]);

  if (!f) return null;

  function ayristir() {
    const lines = metin
      .split('\n')
      .map((l) => l.replace(/\r$/, ''))
      .filter((l) => l.trim());
    const rows: TopluSatir[] = [];
    const skipped: string[] = [];
    let seq = 0;
    for (const line of lines) {
      let parts = line.split('\t').map((p) => p.trim());
      if (parts.length < 3) parts = line.split(/\s{2,}/).map((p) => p.trim());
      parts = parts.filter((p) => p !== '');
      if (parts.length < 3) {
        skipped.push(line);
        continue;
      }
      const urunRaw = parts[0];
      const fiyatRaw = parts[parts.length - 1];
      const lokasyonRaw = parts.slice(1, parts.length - 1).join(' ');
      const fiyat = parseFiyat(fiyatRaw);
      if (!urunRaw || !lokasyonRaw || fiyat == null) {
        skipped.push(line);
        continue;
      }
      const urun = normUrun(urunRaw);
      // Tek hücrede "/" ile ayrılmış birden fazla lokasyon varsa, hepsi için
      // aynı fiyatla ayrı birer satır oluşturulur (örn. "Erenler / Naba").
      const fragments = lokasyonRaw
        .split('/')
        .map((x) => x.trim())
        .filter(Boolean);
      for (const frag of fragments) {
        seq++;
        const match = eslesenLokasyon(frag, db.lokasyonlar);
        rows.push({
          key: 'r' + seq,
          urunRaw,
          urun,
          lokasyonRaw: frag,
          lokasyonId: match ? match.id : '',
          fiyat,
          dahil: true,
        });
      }
    }
    // Parti içinde aşırı sapan fiyatlar (olası veri hatası) varsayılan
    // olarak işaretlenir ama DAHİL EDİLMEZ — kullanıcı kontrol edip isterse açar.
    const degerler = rows.map((r) => r.fiyat).filter((v) => v > 0).sort((a, b) => a - b);
    const medyan = degerler.length ? degerler[Math.floor(degerler.length / 2)] : 0;
    rows.forEach((r) => {
      if (medyan > 0 && (r.fiyat > medyan * 3 || r.fiyat < medyan / 3)) {
        r.uyari = 'Fiyat diğerlerinden çok farklı — kontrol edin';
        r.dahil = false;
      }
    });
    setSatirlar(rows);
    setAtlanan(skipped);
    setStep('onizleme');
  }

  function satirGuncelle(key: string, patch: Partial<TopluSatir>) {
    setSatirlar((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function eslesenAnlasma(r: TopluSatir) {
    if (!r.lokasyonId || !r.urun) return undefined;
    return (f!.anlasmalar || []).find(
      (a) => a.yuklemeLokasyonId === r.lokasyonId && a.teslimLokasyonId === teslimId && (a.yukTipi || '') === r.urun,
    );
  }

  function iceAktar() {
    const gecerli = satirlar.filter((r) => r.dahil && r.lokasyonId && r.urun && r.fiyat > 0);
    if (!gecerli.length) {
      toast('İçe aktarılacak geçerli satır yok', 'err');
      return;
    }
    // Aynı (ürün, lokasyon) ikilisi listede birden fazla kez varsa sonuncusu kazanır.
    const sonHal = new Map<string, TopluSatir>();
    gecerli.forEach((r) => sonHal.set(r.urun + '|' + r.lokasyonId, r));
    const nihaiSatirlar = [...sonHal.values()];

    let yeniSayi = 0;
    let guncellenenSayi = 0;
    mutate((d) => {
      const ff = d.firmalar.find((x) => x.id === firmaId);
      if (!ff) return;
      if (!Array.isArray(ff.anlasmalar)) ff.anlasmalar = [];
      const bugun = new Date().toISOString().slice(0, 10);
      nihaiSatirlar.forEach((r) => {
        const existing = ff.anlasmalar!.find(
          (a) => a.yuklemeLokasyonId === r.lokasyonId && a.teslimLokasyonId === teslimId && (a.yukTipi || '') === r.urun,
        );
        if (existing) {
          if ((Number(existing.birimFiyat) || 0) !== r.fiyat || existing.paraBirimi !== paraBirimi) {
            existing.gecmis = Array.isArray(existing.gecmis) ? existing.gecmis : [];
            existing.gecmis.push({
              birimFiyat: Number(existing.birimFiyat) || 0,
              paraBirimi: existing.paraBirimi || 'TRY',
              tarih: existing.tarih || '',
            });
            existing.birimFiyat = r.fiyat;
            existing.paraBirimi = paraBirimi;
            existing.tarih = bugun;
          }
          guncellenenSayi++;
        } else {
          ff.anlasmalar!.push({
            id: uid('a'),
            yuklemeLokasyonId: r.lokasyonId,
            teslimLokasyonId: teslimId,
            yukTipi: r.urun,
            birimFiyat: r.fiyat,
            paraBirimi,
            tarih: bugun,
            gecmis: [],
          });
          yeniSayi++;
        }
      });
    });
    closeModal();
    toast(`${yeniSayi} yeni, ${guncellenenSayi} güncellenen anlaşmalı fiyat içe aktarıldı`, 'ok');
  }

  const dahilSatirlar = satirlar.filter((r) => r.dahil && r.lokasyonId && r.urun && r.fiyat > 0);
  const eslesmeyenSayisi = satirlar.filter((r) => !r.lokasyonId).length;

  return (
    <ModalShell onClose={closeModal} size="xwide">
      <ModalHead title={'Toplu Anlaşmalı Fiyat İçe Aktar — ' + f.ad} onClose={closeModal} />
      <div className="modal-body">
        {step === 'yapistir' ? (
          <>
            <div className="hint" style={{ marginBottom: 10 }}>
              Excel/Sheets&apos;ten kopyaladığınız <b>Ürün — Lokasyon — Fiyat</b> sütunlu listeyi aşağıya yapıştırın (her satır bir
              kayıt; sütunlar TAB ile ayrılmış olmalı — doğrudan Excel&apos;den kopyala/yapıştır yeterlidir). Bir hücrede birden fazla
              lokasyon &quot;/&quot; ile ayrılmışsa (ör. &quot;Erenler / Naba&quot;), her biri için aynı fiyatla ayrı kayıt
              oluşturulur. Sonraki ekranda her satırı; eşleşen sistem lokasyonunu, ürünü ve fiyatı kontrol edip onaylarsınız — hiçbir
              şey önizleme olmadan kaydedilmez.
            </div>
            <textarea
              rows={14}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: 12.5 }}
              placeholder={'MISIR\tAKGÜLLER\t306\nMISIR\tÇUKUROVA TOPRAK TARIM\t239\n...'}
              value={metin}
              onChange={(e) => setMetin(e.target.value)}
            />
          </>
        ) : (
          <>
            <div className="grid-2" style={{ marginBottom: 12 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Teslim (Varış) Noktası — tüm satırlar için ortak</label>
                <select value={teslimId} onChange={(e) => setTeslimId(e.target.value)}>
                  <LokOptions db={db} />
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Para Birimi — tüm satırlar için ortak</label>
                <select value={paraBirimi} onChange={(e) => setParaBirimi(e.target.value)}>
                  {PARA_KODLARI.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
              <b>{satirlar.length}</b> satır ayrıştırıldı · <b style={{ color: 'var(--green)' }}>{dahilSatirlar.length}</b> içe
              aktarılacak
              {eslesmeyenSayisi > 0 && <span style={{ color: 'var(--red)' }}> · {eslesmeyenSayisi} lokasyon eşleşmedi, elle seçin</span>}
              {atlanan.length > 0 && <span style={{ color: 'var(--amber)' }}> · {atlanan.length} satır ayrıştırılamadı</span>}
            </div>
            <div style={{ maxHeight: 420, overflow: 'auto', border: '1px solid var(--line)', borderRadius: 8 }}>
              <table style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: 30 }}></th>
                    <th>Ürün</th>
                    <th>Girilen Lokasyon</th>
                    <th>Sistemdeki Lokasyon</th>
                    <th style={{ textAlign: 'right' }}>Fiyat</th>
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {satirlar.map((r) => {
                    const existing = eslesenAnlasma(r);
                    return (
                      <tr key={r.key} style={{ background: !r.lokasyonId ? 'var(--red-bg)' : r.uyari ? 'var(--amber-bg)' : undefined }}>
                        <td>
                          <input type="checkbox" checked={r.dahil} onChange={(e) => satirGuncelle(r.key, { dahil: e.target.checked })} />
                        </td>
                        <td>
                          <select value={r.urun} onChange={(e) => satirGuncelle(r.key, { urun: e.target.value })} style={{ fontSize: 12.5 }}>
                            <option value="">— seç —</option>
                            {urunOptionsAll.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>{r.lokasyonRaw}</td>
                        <td>
                          <select
                            value={r.lokasyonId}
                            onChange={(e) => satirGuncelle(r.key, { lokasyonId: e.target.value })}
                            style={{ fontSize: 12.5 }}
                          >
                            <option value="">— eşleşme yok —</option>
                            <LokOptions db={db} />
                          </select>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <input
                            type="number"
                            step="any"
                            value={r.fiyat}
                            onChange={(e) => satirGuncelle(r.key, { fiyat: Number(e.target.value) || 0 })}
                            style={{ width: 84, textAlign: 'right', fontSize: 12.5 }}
                          />
                        </td>
                        <td style={{ fontSize: 11.5 }}>
                          {existing ? (
                            <span style={{ color: 'var(--amber)' }}>
                              Güncellenecek ({money(existing.birimFiyat, existing.paraBirimi)} → {money(r.fiyat, paraBirimi)})
                            </span>
                          ) : (
                            <span style={{ color: 'var(--green)' }}>Yeni</span>
                          )}
                          {r.uyari && <div style={{ color: 'var(--red)' }}>{r.uyari}</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {atlanan.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--faint)' }}>
                <div style={{ fontWeight: 700, marginBottom: 3 }}>Ayrıştırılamayan satırlar:</div>
                {atlanan.map((l, i) => (
                  <div key={i} style={{ fontFamily: 'monospace' }}>
                    {l}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <div className="modal-foot">
        <div style={{ flex: 1 }} />
        {step === 'onizleme' && (
          <button className="btn" onClick={() => setStep('yapistir')}>
            Geri
          </button>
        )}
        <button className="btn" onClick={closeModal}>
          Vazgeç
        </button>
        {step === 'yapistir' ? (
          <button className="btn primary" onClick={ayristir} disabled={!metin.trim()}>
            Ayrıştır &amp; Önizle
          </button>
        ) : (
          <button className="btn primary" onClick={iceAktar} disabled={!dahilSatirlar.length}>
            İçe Aktar ({dahilSatirlar.length})
          </button>
        )}
      </div>
    </ModalShell>
  );
}
