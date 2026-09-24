/** Pictogrammes SVG partagés (porte de la casbah, étoile, losange…). */

export function Porte({ size = 24, stroke = 1.7 }: { size?: number; stroke?: number }) {
  const h = Math.round((size * 36) / 30);
  return (
    <svg width={size} height={h} viewBox="0 0 30 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="13.2" y="0.6" width="3.6" height="3.6" rx="0.6" fill="#C9A45C" />
      <path d="M5.5 36 V6.5 H24.5 V36" stroke="#C9A45C" strokeWidth={stroke} />
      <path d="M9.5 36 V10.5 H20.5 V36" stroke="#C9A45C" strokeWidth={stroke * 0.6} />
    </svg>
  );
}

export function PorteCoche() {
  return (
    <svg width="62" height="74" viewBox="0 0 30 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="13.2" y="0.6" width="3.6" height="3.6" rx="0.6" fill="#C9A45C" />
      <path d="M5.5 36 V6.5 H24.5 V36" stroke="#C9A45C" strokeWidth="1.3" />
      <path d="M10 21 L14 25 L21 15" stroke="#E7CB85" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Losange({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M6 0.8 L11.2 6 L6 11.2 L0.8 6 Z" fill="#C9A45C" />
    </svg>
  );
}

export function Etoile4() {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill="#C9A45C" />
    </svg>
  );
}

export function Etoile5({ partial }: { partial?: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {partial && (
        <defs>
          <linearGradient id="star48" x1="0" x2="1" y1="0" y2="0">
            <stop offset="80%" stopColor="#C9A45C" />
            <stop offset="80%" stopColor="rgba(201,164,92,.25)" />
          </linearGradient>
        </defs>
      )}
      <path
        d="M9 1.5 L11.2 6.2 L16.5 6.9 L12.7 10.4 L13.7 15.5 L9 13 L4.3 15.5 L5.3 10.4 L1.5 6.9 L6.8 6.2 Z"
        fill={partial ? "url(#star48)" : "#C9A45C"}
      />
    </svg>
  );
}

export function Cadenas() {
  return (
    <svg width="18" height="20" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="2.5" y="8.5" width="13" height="9" stroke="#C9A45C" strokeWidth="1.2" />
      <path d="M5.5 8.5 V6 C5.5 3.8 7 2.2 9 2.2 C11 2.2 12.5 3.8 12.5 6 V8.5" stroke="#C9A45C" strokeWidth="1.2" />
      <circle cx="9" cy="13" r="1.3" fill="#C9A45C" />
    </svg>
  );
}

export function Fleche() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M1 6 H14 M10 1.5 L14.5 6 L10 10.5" stroke="#C9A45C" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Agrandir() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M8.5 1.5 H12.5 V5.5 M12.5 1.5 L8 6 M5.5 12.5 H1.5 V8.5 M1.5 12.5 L6 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
