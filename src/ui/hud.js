import { h } from './dom.js';
import { icon } from './icons.js';

/**
 * HUD leggero in HTML sopra il canvas: punteggio, contatori, barra di avanzamento e pausa.
 * Il numero del punteggio "scorre" verso il valore reale a ogni aggiornamento del gioco,
 * quindi si ferma da solo quando il gioco è in pausa.
 */
export class Hud {
  constructor(root, { onPause, goalLabel = 'Traguardo' }) {
    this.shown = 0;
    this.target = 0;
    this.el = h(
      'div',
      { class: 'hud', hidden: true },
      h(
        'div',
        { class: 'hud__top' },
        h('button', { type: 'button', class: 'icon-btn hud__pause', 'aria-label': 'Pausa', onclick: () => onPause?.() }, icon('pause')),
        h('div', { class: 'hud__score', 'aria-live': 'off' }, h('span', { class: 'hud__score-label' }, 'Punti'), (this.scoreEl = h('span', { class: 'hud__score-value' }, '0'))),
        h(
          'div',
          { class: 'hud__counts' },
          (this.allChip = this.chip('gift', 'Pacchi aperti', 'all')),
          (this.posChip = this.chip('heart', 'Belle sorprese', 'pos')),
          (this.negChip = this.chip('sad', 'Sorprese discutibili', 'neg')),
        ),
      ),
      h(
        'div',
        { class: 'hud__progress', role: 'progressbar', 'aria-label': 'Avanzamento della corsa', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' },
        h('div', { class: 'hud__bar' }, (this.fill = h('i'))),
        (this.marker = h('span', { class: 'hud__marker' })),
        h('span', { class: 'hud__goal', title: goalLabel }, icon('gift')),
      ),
      (this.comboEl = h('div', { class: 'hud__combo', 'aria-hidden': 'true' })),
    );
    this.progressEl = this.el.querySelector('.hud__progress');
    root.append(this.el);
  }

  chip(iconName, title, kind) {
    const value = h('b', {}, '0');
    const el = h('span', { class: `chip chip--${kind}`, title }, icon(iconName), value, h('span', { class: 'sr-only' }, title));
    el.valueEl = value;
    return el;
  }

  show() {
    this.el.hidden = false;
  }

  hide() {
    this.el.hidden = true;
  }

  reset() {
    this.shown = 0;
    this.target = 0;
    this.scoreEl.textContent = '0';
    this.setStats({ collected: 0, positive: 0, negative: 0 });
    this.setProgress(0);
    this.setCombo(0, 1);
  }

  setScore(score) {
    if (score !== this.target) {
      this.target = score;
      this.scoreEl.classList.remove('bump');
      void this.scoreEl.offsetWidth; // riavvia l'animazione CSS
      this.scoreEl.classList.add('bump');
    }
  }

  setStats({ collected, positive, negative }) {
    this.allChip.valueEl.textContent = collected;
    this.posChip.valueEl.textContent = positive;
    this.negChip.valueEl.textContent = negative;
  }

  setProgress(p) {
    const pct = Math.max(0, Math.min(1, p)) * 100;
    this.fill.style.width = `${pct.toFixed(1)}%`;
    this.marker.style.left = `${pct.toFixed(1)}%`;
    this.progressEl.setAttribute('aria-valuenow', String(Math.round(pct)));
  }

  setCombo(combo, multiplier) {
    if (combo >= 2) {
      this.comboEl.textContent = `Catena ×${multiplier.toFixed(2).replace(/\.?0+$/, '')}`;
      this.comboEl.classList.add('on');
    } else {
      this.comboEl.classList.remove('on');
    }
  }

  /** Da chiamare a ogni frame di gioco con i secondi trascorsi. */
  update(dt) {
    if (this.shown === this.target) return;
    const diff = this.target - this.shown;
    const step = Math.sign(diff) * Math.max(1, Math.abs(diff) * Math.min(1, dt * 9));
    this.shown = Math.abs(diff) <= Math.abs(step) ? this.target : Math.round(this.shown + step);
    this.scoreEl.textContent = String(this.shown);
  }

  destroy() {
    this.el.remove();
  }
}
