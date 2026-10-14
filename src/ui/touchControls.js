import { h } from './dom.js';
import { icon } from './icons.js';

/**
 * Rilevatore di swipe basato su Pointer Events (touch, penna e mouse).
 * - L'azione scatta appena il dito supera la soglia (reattività), non al rilascio.
 * - Un gesto continuo nella stessa direzione vale UNA volta sola (niente tre corsie con un solo scatto);
 *   cambiando direzione senza alzare il dito si può invece dare un nuovo comando.
 * - `justSwiped()` permette ai pulsanti dell'interfaccia di ignorare il click generato
 *   dal rilascio di uno swipe.
 */
export function attachSwipe(el, onSwipe, { threshold } = {}) {
  let active = null;
  let lastSwipeAt = -1e9;

  const limit = () => {
    if (threshold) return threshold();
    return Math.max(22, Math.min(window.innerWidth, window.innerHeight) * 0.055);
  };

  const down = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    active = { id: e.pointerId, x: e.clientX, y: e.clientY, lastDir: null };
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* alcuni browser non permettono la cattura: lo swipe funziona comunque */
    }
  };

  const move = (e) => {
    if (!active || e.pointerId !== active.id) return;
    const dx = e.clientX - active.x;
    const dy = e.clientY - active.y;
    const t = limit();
    if (Math.abs(dx) < t && Math.abs(dy) < t) return;
    const dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
    active.x = e.clientX;
    active.y = e.clientY;
    lastSwipeAt = performance.now();
    if (dir === active.lastDir) return; // stesso gesto che prosegue: nessuna ripetizione
    active.lastDir = dir;
    onSwipe(dir);
  };

  const up = (e) => {
    if (active && e.pointerId === active.id) active = null;
  };

  const block = (e) => e.preventDefault();
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('contextmenu', block);

  return {
    justSwiped: (ms = 400) => performance.now() - lastSwipeAt < ms,
    destroy() {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('contextmenu', block);
    },
  };
}

/**
 * Pulsanti touch opzionali (sinistra/destra a sinistra, salta/scivola a destra):
 * grandi, raggiungibili con una sola mano e attivati su pointerdown per reattività.
 */
export function createTouchButtons(onAction) {
  const make = (action, iconName, label, extra = '') => {
    const btn = h('button', { type: 'button', class: `tbtn tbtn--${action} ${extra}`.trim(), 'aria-label': label, dataset: { action } }, icon(iconName));
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onAction(action);
    });
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
    btn.addEventListener('click', (e) => e.preventDefault());
    return btn;
  };
  return h(
    'div',
    { class: 'touch-buttons', hidden: true },
    h('div', { class: 'touch-buttons__side touch-buttons__side--left' }, make('left', 'left', 'Corsia a sinistra'), make('right', 'right', 'Corsia a destra')),
    h('div', { class: 'touch-buttons__side touch-buttons__side--right' }, make('slide', 'down', 'Scivola'), make('jump', 'up', 'Salta')),
  );
}
