'use client';
import React from 'react';
import { Icon } from '@/components/Icon';

export function NavlunPanel() {
  return (
    <div className="empty">
      <Icon name="chart" size={46} sw={1.5} />
      <h3>Navlun Paneli</h3>
      <p>
        Bu panel, Navlun Takibi verileri (Deniz Navlun, Taşıma Talepleri, Navlun Firmaları) üzerinden yapılacak fiyat
        analizi için hazırlandı. İçeriği birlikte belirleyeceğiz.
      </p>
    </div>
  );
}
