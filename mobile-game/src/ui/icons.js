// Cartoon SVG icons in the chunky "casual game UI pack" style.
const INK = '#1b2440';

export const coin = (s = 40) => `
<svg width="${s}" height="${s}" viewBox="0 0 40 40" class="ico">
  <defs><radialGradient id="cg" cx="40%" cy="35%"><stop offset="0" stop-color="#ffe27a"/><stop offset="1" stop-color="#ff9d1a"/></radialGradient></defs>
  <circle cx="20" cy="21" r="17" fill="${INK}"/>
  <circle cx="20" cy="19.5" r="16" fill="#e07a10"/>
  <circle cx="20" cy="18.5" r="15" fill="url(#cg)"/>
  <circle cx="20" cy="18.5" r="10.5" fill="none" stroke="#e8830f" stroke-width="2.2"/>
  <path d="M20 11.5 l6 3.5 v7 l-6 3.5 l-6 -3.5 v-7z" fill="#ffd34d" stroke="#e8830f" stroke-width="1.6"/>
  <ellipse cx="13" cy="11" rx="3.4" ry="1.8" fill="#fff" opacity=".7" transform="rotate(-35 13 11)"/>
</svg>`;

export const gem = (s = 40) => `
<svg width="${s}" height="${s}" viewBox="0 0 40 40" class="ico">
  <path d="M20 3 L35 11.5 V28.5 L20 37 L5 28.5 V11.5Z" fill="${INK}"/>
  <path d="M20 5 L33 12.5 V27.5 L20 35 L7 27.5 V12.5Z" fill="#d13cc9"/>
  <path d="M20 5 L33 12.5 L20 20 L7 12.5Z" fill="#ff8ef0"/>
  <path d="M7 12.5 L20 20 V35 L7 27.5Z" fill="#e85ce0"/>
  <path d="M20 10 L27 14 V24 L20 28 L13 24 V14Z" fill="#ff6fe8" opacity=".9"/>
  <path d="M11 11 l4 -2" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>
</svg>`;

export const gear = (s = 34) => `
<svg width="${s}" height="${s}" viewBox="0 0 40 40" class="ico">
  <path fill="#fff" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"
    d="M17 3h6l1 4.5 3.2 1.4 4-2.4 4.2 4.2-2.4 4 1.4 3.2L39 17v6l-4.5 1-1.4 3.2 2.4 4-4.2 4.2-4-2.4-3.2 1.4L23 39h-6l-1-4.5-3.2-1.4-4 2.4-4.2-4.2 2.4-4L5.6 24 1 23v-6l4.5-1 1.4-3.2-2.4-4 4.2-4.2 4 2.4L16 7.5z"/>
  <circle cx="20" cy="20" r="6.5" fill="#2f8cf0" stroke="${INK}" stroke-width="2.6"/>
</svg>`;

export const plus = (s = 26) => `
<svg width="${s}" height="${s}" viewBox="0 0 26 26" class="ico">
  <path d="M9 2h8v7h7v8h-7v7H9v-7H2V9h7z" fill="#fff" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
</svg>`;

export const star = (s = 40, label = '') => `
<svg width="${s}" height="${s}" viewBox="0 0 40 40" class="ico">
  <path d="M20 2.5l5.3 11 12 1.5-8.8 8.3 2.2 11.9L20 29.4 9.3 35.2l2.2-11.9L2.7 15l12-1.5z" fill="#f7b500" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M20 6l4 8.5 9 1.2" fill="none" stroke="#ffe680" stroke-width="2" stroke-linecap="round"/>
  ${label ? `<text x="20" y="25" text-anchor="middle" font-family="Lilita One" font-size="10" fill="#fff" stroke="${INK}" stroke-width="2.2" paint-order="stroke">${label}</text>` : ''}
</svg>`;

export const avatar = (s = 70) => `
<svg width="${s}" height="${s}" viewBox="0 0 70 70" class="ico">
  <circle cx="35" cy="24" r="12" fill="#3d8bff"/>
  <path d="M12 62c0-14 10-22 23-22s23 8 23 22z" fill="#3d8bff"/>
  <rect x="24" y="11" width="22" height="7" rx="3" fill="#2f6fe0"/>
</svg>`;

export const gift = (s = 64) => `
<svg width="${s}" height="${s}" viewBox="0 0 64 64" class="ico">
  <path d="M22 14c-6-8 4-12 10 0c6-12 16-8 10 0" fill="none" stroke="#3a2fd0" stroke-width="5" stroke-linecap="round"/>
  <path d="M22 14c-6-8 4-12 10 0c6-12 16-8 10 0" fill="none" stroke="#6f7dff" stroke-width="2.5" stroke-linecap="round"/>
  <rect x="9" y="22" width="46" height="36" rx="3" fill="#ff9d1a" stroke="${INK}" stroke-width="3"/>
  <rect x="6" y="15" width="52" height="11" rx="3" fill="#ffc23a" stroke="${INK}" stroke-width="3"/>
  <rect x="27" y="15" width="10" height="43" fill="#4fd13a" stroke="${INK}" stroke-width="3"/>
  <rect x="15" y="26" width="5" height="30" fill="#ffd34d" opacity=".6"/>
</svg>`;

export const shop = (s = 58) => `
<svg width="${s}" height="${s}" viewBox="0 0 64 64" class="ico">
  <rect x="9" y="28" width="46" height="28" rx="3" fill="#2f8cf0" stroke="${INK}" stroke-width="3"/>
  <rect x="16" y="34" width="14" height="22" fill="#9fd6ff" stroke="${INK}" stroke-width="2.5"/>
  <rect x="35" y="34" width="13" height="10" fill="#9fd6ff" stroke="${INK}" stroke-width="2.5"/>
  <path d="M6 16 L12 6 H52 L58 16 V24 a6.5 6.5 0 0 1-13 0 a6.5 6.5 0 0 1-13 0 a6.5 6.5 0 0 1-13 0 a6.5 6.5 0 0 1-13 0z" fill="#ff4d4d" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M19 16 L22 6 M32 16 V6 M45 16 L42 6" stroke="#fff" stroke-width="5"/>
  <path d="M6 16 H58" stroke="${INK}" stroke-width="2.5"/>
</svg>`;

export const missions = (s = 58) => `
<svg width="${s}" height="${s}" viewBox="0 0 64 64" class="ico">
  <rect x="7" y="12" width="50" height="46" rx="6" fill="#e8eef8" stroke="${INK}" stroke-width="3"/>
  <path d="M7 18a6 6 0 0 1 6-6h38a6 6 0 0 1 6 6v8H7z" fill="#2f8cf0" stroke="${INK}" stroke-width="3"/>
  <rect x="17" y="5" width="6" height="13" rx="3" fill="#fff" stroke="${INK}" stroke-width="2.5"/>
  <rect x="41" y="5" width="6" height="13" rx="3" fill="#fff" stroke="${INK}" stroke-width="2.5"/>
  <rect x="15" y="33" width="34" height="5" rx="2.5" fill="#a9b6cc"/>
  <rect x="15" y="43" width="24" height="5" rx="2.5" fill="#a9b6cc"/>
</svg>`;

export const ranking = (s = 58) => `
<svg width="${s}" height="${s}" viewBox="0 0 64 64" class="ico">
  <path d="M10 8h44v38L32 58 10 46z" fill="#8a3cf0" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M14 12h36v8H14z" fill="#b07aff"/>
  <path d="M32 18l4.5 9.3 10.2 1.3-7.4 7 1.9 10.1L32 40.8l-9.2 4.9 1.9-10.1-7.4-7 10.2-1.3z" fill="#ffc23a" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
</svg>`;

export const inventory = (s = 58) => `
<svg width="${s}" height="${s}" viewBox="0 0 64 64" class="ico">
  <rect x="6" y="26" width="52" height="30" rx="3" fill="#3fae2a" stroke="${INK}" stroke-width="3"/>
  <path d="M6 26 V20 a12 10 0 0 1 12 -10 H46 a12 10 0 0 1 12 10 V26z" fill="#5fd13a" stroke="${INK}" stroke-width="3"/>
  <rect x="14" y="8" width="6" height="48" fill="#ffc23a" stroke="${INK}" stroke-width="2.5"/>
  <rect x="44" y="8" width="6" height="48" fill="#ffc23a" stroke="${INK}" stroke-width="2.5"/>
  <rect x="27" y="22" width="10" height="10" rx="2" fill="#ffd34d" stroke="${INK}" stroke-width="2.5"/>
</svg>`;

export const pause = (s = 30) => `
<svg width="${s}" height="${s}" viewBox="0 0 30 30" class="ico">
  <rect x="6" y="5" width="7" height="20" rx="2" fill="#fff" stroke="${INK}" stroke-width="2.4"/>
  <rect x="17" y="5" width="7" height="20" rx="2" fill="#fff" stroke="${INK}" stroke-width="2.4"/>
</svg>`;

export const skull = (s = 28) => `
<svg width="${s}" height="${s}" viewBox="0 0 30 30" class="ico">
  <path d="M15 3C8 3 4 8 4 13.5c0 3.5 1.8 6 4 7.3V25h3v-2h2v2h4v-2h2v2h3v-4.2c2.2-1.3 4-3.8 4-7.3C26 8 22 3 15 3z" fill="#e8eef8" stroke="${INK}" stroke-width="2.2"/>
  <circle cx="10.5" cy="14" r="3" fill="${INK}"/><circle cx="19.5" cy="14" r="3" fill="${INK}"/>
</svg>`;

export const soldier = (s = 28) => `
<svg width="${s}" height="${s}" viewBox="0 0 30 30" class="ico">
  <circle cx="15" cy="10" r="6" fill="#f0c49a" stroke="${INK}" stroke-width="2"/>
  <path d="M8 9a7 6 0 0 1 14 0z" fill="#d8342c" stroke="${INK}" stroke-width="2"/>
  <path d="M5 28c0-7 4-11 10-11s10 4 10 11z" fill="#2f6fe0" stroke="${INK}" stroke-width="2"/>
</svg>`;

export const lock = (s = 30) => `
<svg width="${s}" height="${s}" viewBox="0 0 30 30" class="ico">
  <path d="M9 13V9a6 6 0 0 1 12 0v4" fill="none" stroke="${INK}" stroke-width="3"/>
  <rect x="6" y="13" width="18" height="14" rx="3" fill="#ffc23a" stroke="${INK}" stroke-width="2.4"/>
</svg>`;

export const bolt = (s = 40) => `
<svg width="${s}" height="${s}" viewBox="0 0 40 40" class="ico">
  <path d="M23 2 L7 23 H18 L15 38 L33 15 H22 Z" fill="#ffd23a" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M21 7 L12 20" stroke="#fff6b0" stroke-width="2.4" stroke-linecap="round"/>
</svg>`;

export const bullet = (s = 40) => `
<svg width="${s}" height="${s}" viewBox="0 0 40 40" class="ico">
  <g transform="rotate(35 20 20)">
    <path d="M14 14 Q20 -2 26 14 V34 H14 Z" fill="#ffb21a" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
    <rect x="12.5" y="28" width="15" height="7" rx="1.5" fill="#d0d6e2" stroke="${INK}" stroke-width="2.4"/>
    <path d="M17 10 Q19 6 21 9" stroke="#fff3c0" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g>
</svg>`;
