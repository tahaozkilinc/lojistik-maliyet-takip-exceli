'use client';
import React, { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { ModalShell, ModalHead } from '@/components/Modal';
import { Icon } from '@/components/Icon';
import { uid } from '@/lib/format';

const HEADER_WORDS = ['ad', 'isim', 'lokasyon', 'lokasyon adı', 'i̇sim'];

interface ParsedRow {
  ad: string;
  tip: string;
  il: string;
  ilce: string;
  telefon: string;
  adres: string;
}

function parseRows(raw: string): { rows: ParsedRow[]; skipped: number } {
  const lines = raw.split(/\r?\n/);
  const rows: ParsedRow[] = [];
  let skipped = 0;
  let dataIndex = 0;
  lines.forEach((line) => {
    if (!line.trim()) return;
    const cells = (line.includes('\t') ? line.split('\t') : line.split(',')).map((c) => c.trim());
    if (dataIndex === 0 && HEADER_WORDS.includes((cells[0] || '').toLowerCase())) {
      dataIndex++;
      return;
    }
    dataIndex++;
    const ad = cells[0] || '';
    if (!ad) {
      skipped++;
      return;
    }
    rows.push({
      ad,
      tip: cells[1] || 'Depo',
      il: cells[2] || '',
      ilce: cells[3] || '',
      telefon: cells[4] || '',
      adres: cells[5] || '',
    });
  });
  return { rows, skipped };
}

export function LokasyonTopluModal() {
  const { mutate, closeModal, toast } = useStore();
  const [raw, setRaw] = useState('');
  const { rows, skipped } = useMemo(() => parseRows(raw), [raw]);

  function ekle() {
    if (!rows.length) {
      toast('Eklenecek satır bulunamadı', 'err');
      return;
    }
    mutate((d) => {
      rows.forEach((r) => {
        d.lokasyonlar.push({
          id: uid('l'),
          ad: r.ad,
          tip: r.tip,
          il: r.il,
          sehir: r.il,
          ilce: r.ilce,
          telefon: r.telefon,
          adres: r.adres,
          createdAt: new Date().toISOString(),
        });
      });
    });
    closeModal();
    toast(rows.length + ' lokasyon eklendi', 'ok');
  }

  return (
    <ModalShell onClose={closeModal} size="wide">
      <ModalHead title="Toplu Lokasyon Ekle" onClose={closeModal} />
      <div className="modal-body">
        <div className="hint" style={{ marginBottom: 10 }}>
          Excel&apos;den bir hücre aralığını kopyalayıp aşağıya yapıştırın. Sütun sırası: <b>Ad, Tip, İl, İlçe, Telefon, Adres</b>. Yalnızca{' '}
          <b>Ad</b> zorunludur, diğer sütunlar boş bırakılabilir. Başlık satırı varsa otomatik atlanır.
        </div>
        <div className="field">
          <label>Yapıştırılan Liste</label>
          <textarea
            rows={10}
            placeholder={
              'Akgüller Deposu\tDepo\tAdana\tSeyhan\t+90 532 000 00 00\tOrganize San. Bölgesi\nMersin Liman Antrepo\tLiman\tMersin'
            }
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            style={{ fontFamily: 'monospace', fontSize: 12.5 }}
          />
        </div>
        {raw.trim() && (
          <div className="hint" style={{ marginBottom: 10 }}>
            {rows.length} lokasyon eklenecek
            {skipped ? `, ${skipped} satır adı boş olduğu için atlandı` : ''}.
          </div>
        )}
        {rows.length > 0 && (
          <div style={{ maxHeight: 240, overflow: 'auto', border: '1px solid var(--line-2)', borderRadius: 8 }}>
            <table style={{ width: '100%', fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th>Ad</th>
                  <th>Tip</th>
                  <th>İl</th>
                  <th>İlçe</th>
                  <th>Telefon</th>
                  <th>Adres</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.ad}</td>
                    <td>{r.tip}</td>
                    <td>{r.il}</td>
                    <td>{r.ilce}</td>
                    <td>{r.telefon}</td>
                    <td>{r.adres}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={closeModal}>
          Vazgeç
        </button>
        <button className="btn primary" onClick={ekle} disabled={!rows.length}>
          <Icon name="upload" size={14} />
          {rows.length ? `${rows.length} Lokasyon Ekle` : 'Lokasyon Ekle'}
        </button>
      </div>
    </ModalShell>
  );
}
