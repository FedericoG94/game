import { svgNode } from './dom.js';

const wrap = (body, vb = '0 0 24 24') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="1em" height="1em" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const ICONS = {
  pause: wrap('<path d="M8 5v14M16 5v14" stroke-width="3.4"/>'),
  play: wrap('<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>'),
  restart: wrap('<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v5h5"/>'),
  home: wrap('<path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10.5V19h11v-8.5"/>'),
  soundOn: wrap('<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
  soundOff: wrap('<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>'),
  gift: wrap('<rect x="4" y="10" width="16" height="10" rx="2" fill="currentColor" fill-opacity=".18"/><path d="M3 7h18v3.5H3zM12 7v13"/><path d="M12 7C9 7 7 6 7.5 4.5S11 4 12 7c1-3 3.5-3.5 4.5-2.5S15 7 12 7z"/>'),
  heart: wrap('<path d="M12 20C4 14 3.5 8.5 7 6.5c2-1.1 4 .1 5 1.8 1-1.700 3-2.900 5-1.800 3.500 2 3 7.500-5 13.500z" fill="currentColor" fill-opacity=".25"/>'),
  sad: wrap('<circle cx="12" cy="12" r="8.5" fill="currentColor" fill-opacity=".18"/><path d="M9 10v.5M15 10v.5" stroke-width="3.2"/><path d="M8.800 16c1-1.500 5.400-1.500 6.400 0"/>'),
  star: wrap('<path d="m12 3.500 2.600 5.400 5.900.8-4.300 4.100 1.100 5.800L12 16.800 6.700 19.600l1.100-5.800L3.500 9.700l5.900-.8z" fill="currentColor" fill-opacity=".3"/>'),
  left: wrap('<path d="m14.500 5-7 7 7 7" stroke-width="3.400"/>'),
  right: wrap('<path d="m9.500 5 7 7-7 7" stroke-width="3.400"/>'),
  up: wrap('<path d="m5 14.500 7-7 7 7" stroke-width="3.400"/><path d="M5 19.500h14" stroke-width="2.600"/>'),
  down: wrap('<path d="m5 9.500 7 7 7-7" stroke-width="3.400"/><path d="M5 4.500h14" stroke-width="2.600"/>'),
  close: wrap('<path d="m6 6 12 12M18 6 6 18" stroke-width="3"/>'),
  touch: wrap('<path d="M9 11V5.500a1.500 1.500 0 0 1 3 0V11"/><path d="M12 10.500V9a1.500 1.500 0 0 1 3 0v2.500"/><path d="M15 11V10a1.500 1.500 0 0 1 3 0v4.500a6 6 0 0 1-6 6h-.5a5 5 0 0 1-4.200-2.300L5 14.800a1.500 1.500 0 0 1 2.400-1.800L9 14.500"/>'),
};

/** Restituisce un nuovo nodo SVG dell'icona richiesta. */
export function icon(name) {
  return svgNode(ICONS[name] ?? ICONS.star);
}
