import React from 'react';

/* Orijinal uygulamadaki tüm satır (stroke) ikonları — birebir path verileri. */
export type IconName =
  | 'panel'
  | 'talepler'
  | 'onaylar'
  | 'firmalar'
  | 'mappin'
  | 'map'
  | 'chart'
  | 'ship'
  | 'truck'
  | 'download'
  | 'upload'
  | 'sun'
  | 'menu'
  | 'search'
  | 'plus'
  | 'send'
  | 'print'
  | 'back'
  | 'refresh'
  | 'phone'
  | 'history'
  | 'file'
  | 'users'
  | 'user'
  | 'mail'
  | 'warning'
  | 'check'
  | 'save'
  | 'building'
  | 'logout'
  | 'lock';

const PATHS: Record<IconName, React.ReactNode> = {
  panel: (
    <>
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </>
  ),
  talepler: (
    <>
      <path d="M16 3h5v5" />
      <path d="M21 3l-7 7" />
      <path d="M3 8v11a1 1 0 0 0 1 1h11" />
      <path d="M3 8l5-5h5" />
    </>
  ),
  onaylar: (
    <>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </>
  ),
  firmalar: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 8h.01M9 12h.01M9 16h.01M13 8h4M13 12h4M13 16h4" />
    </>
  ),
  building: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 8h.01M9 12h.01M9 16h.01M13 8h4M13 12h4M13 16h4" />
    </>
  ),
  mappin: (
    <>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  map: <path d="M9 20l-5.5 2.5V5L9 2.5m0 17.5l6 2.5m-6-2.5V2.5m6 20L20.5 20V2.5L15 5m0 17.5V5m0 0L9 2.5" />,
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 3 3 5-6" />
    </>
  ),
  ship: (
    <>
      <path d="M2 20a6 6 0 0 0 10 0 6 6 0 0 0 10 0" />
      <path d="M4 18l-2-6h20l-2 6" />
      <path d="M12 12V4M8 6h8" />
      <path d="M12 4l4 8M12 4L8 12" />
    </>
  ),
  truck: (
    <>
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </>
  ),
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </>
  ),
  upload: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5" />
      <path d="M12 3v12" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  menu: <path d="M3 12h18M3 6h18M3 18h18" />,
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  send: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />,
  print: <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />,
  back: (
    <>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h11a6 6 0 0 1 0 12h-3" />
    </>
  ),
  refresh: (
    <>
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </>
  ),
  phone: (
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
  ),
  history: (
    <>
      <path d="M3 3v5h5" />
      <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </>
  ),
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    </>
  ),
  user: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  mail: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 5L2 7" />
    </>
  ),
  warning: (
    <>
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.3 2 18a1 1 0 0 0 .9 1.5h18.2A1 1 0 0 0 22 18L13.7 3.3a1 1 0 0 0-1.7 0z" />
    </>
  ),
  check: <path d="M20 6L9 17l-5-5" />,
  save: (
    <>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M17 21v-8H7v8M7 3v5h8" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
};

export interface IconProps {
  name: IconName;
  size?: number;
  sw?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Icon({ name, size = 18, sw = 2, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      className={className}
      style={style}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
