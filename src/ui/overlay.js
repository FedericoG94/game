import { h, clear } from './dom.js';
import { icon } from './icons.js';
import { fillTemplate } from '../data/validate.js';
import { placeholderPortraitDataUri } from '../art/placeholderPortrait.js';

const fmtPoints = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');
const isTouchDevice = () => window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window;

/**
 * Tutte le schermate HTML sopra il canvas. Ogni `show*` restituisce un oggetto con
 * `close()`; i dialoghi spostano il fuoco al loro interno e lo restituiscono alla chiusura.
 */
export function createOverlay(root, app) {
  const { settings } = app;
  let lastFocus = null;

  const rememberFocus = () => {
    lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  };
  const restoreFocus = () => {
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
    lastFocus = null;
  };

  /** Sorgente dell'immagine di un regalo: file locale se caricato, altrimenti segnaposto generato. */
  const giftSrc = (gift) => {
    const known = app.giftImages.get(gift.id);
    if (known) return known;
    const cat = app.categories[gift.category] ?? {};
    return placeholderPortraitDataUri({ name: gift.name, color: cat.color, symbol: cat.symbol, type: gift.type, size: 256 });
  };

  /** Pulsante che ignora il click prodotto dal rilascio di uno swipe. */
  const button = (label, { cls = 'btn', iconName, onClick, ariaLabel, pressed } = {}) => {
    const b = h('button', { type: 'button', class: cls, 'aria-label': ariaLabel, 'aria-pressed': pressed }, iconName && icon(iconName), h('span', {}, label));
    b.addEventListener('click', (e) => {
      if (app.swipe?.justSwiped()) {
        e.preventDefault();
        return;
      }
      app.audio.sfx('ui');
      onClick?.(e, b);
    });
    return b;
  };

  // -------------------------------------------------- interruttori audio / touch
  const audioToggle = () => {
    const b = h('button', { type: 'button', class: 'toggle', 'aria-pressed': String(app.audio.enabled) });
    const paint = () => {
      clear(b);
      b.append(icon(app.audio.enabled ? 'soundOn' : 'soundOff'), h('span', {}, app.audio.enabled ? 'Audio acceso' : 'Audio spento'));
      b.setAttribute('aria-pressed', String(app.audio.enabled));
    };
    b.addEventListener('click', () => {
      app.audio.unlock();
      app.setAudio(!app.audio.enabled);
      app.audio.sfx('ui');
      paint();
    });
    b.repaint = paint;
    paint();
    return b;
  };

  const touchToggle = () => {
    if (!isTouchDevice()) return null;
    const b = h('button', { type: 'button', class: 'toggle', 'aria-pressed': String(app.prefs.touchButtons) });
    const paint = () => {
      clear(b);
      b.append(icon('touch'), h('span', {}, app.prefs.touchButtons ? 'Pulsanti touch: sì' : 'Pulsanti touch: no'));
      b.setAttribute('aria-pressed', String(app.prefs.touchButtons));
    };
    b.addEventListener('click', () => {
      app.setTouchButtons(!app.prefs.touchButtons);
      app.audio.sfx('ui');
      paint();
    });
    paint();
    return b;
  };

  // ------------------------------------------------------------------ menu
  const showMenu = ({ onStart }) => {
    const { intro } = settings;
    const words = intro.title.split(' ');
    const logo = h(
      'h1',
      { class: 'logo', id: 'menu-title' },
      h('span', { class: 'sr-only' }, intro.title),
      ...words.map((w, i) => h('span', { class: `logo__word logo__word--${i % 3}`, 'aria-hidden': 'true' }, w)),
    );
    const start = button(intro.startLabel, { cls: 'btn btn--primary btn--xl', onClick: () => onStart() });
    const el = h(
      'section',
      { class: 'screen menu', 'aria-labelledby': 'menu-title' },
      h('div', { class: 'menu__top' }, logo, h('p', { class: 'menu__subtitle' }, intro.subtitle)),
      h(
        'div',
        { class: 'menu__bottom' },
        h('p', { class: 'menu__teaser' }, intro.teaser),
        start,
        h(
          'div',
          { class: 'menu__how' },
          h('p', { class: 'how how--touch' }, icon('touch'), h('span', {}, intro.instructions.touch)),
          h('p', { class: 'how how--keys' }, h('span', {}, intro.instructions.keyboard)),
        ),
        h('div', { class: 'menu__toggles' }, audioToggle(), touchToggle()),
        h('p', { class: 'menu__rotate' }, 'Per giocare meglio, tieni il telefono in verticale.'),
      ),
    );
    root.append(el);
    start.focus({ preventScroll: true });
    return { el, close: () => el.remove() };
  };

  // ----------------------------------------------------------------- pausa
  const showPause = ({ onResume, onRestart, onMenu }) => {
    rememberFocus();
    const actions = h('div', { class: 'stack' });
    const card = h('div', { class: 'card pause__card' });
    const el = h('section', { class: 'screen screen--dim pause', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pause-title' }, card);

    const renderMain = () => {
      clear(card);
      clear(actions);
      actions.append(
        button('RIPRENDI', { cls: 'btn btn--primary btn--lg', iconName: 'play', onClick: () => onResume() }),
        button('RICOMINCIA', { cls: 'btn btn--lg', iconName: 'restart', onClick: () => renderConfirm('Ricominciare la corsa da capo?', 'Sì, ricomincia', onRestart) }),
        button('TORNA AL MENU', { cls: 'btn btn--lg btn--ghost', iconName: 'home', onClick: () => renderConfirm('Tornare al menu? Perderai la corsa in corso.', 'Sì, torna al menu', onMenu) }),
      );
      if (el.isConnected) actions.querySelector('button')?.focus({ preventScroll: true });
      card.append(
        h('h2', { id: 'pause-title', class: 'card__title' }, 'In pausa'),
        actions,
        h('div', { class: 'menu__toggles' }, audioToggle(), touchToggle()),
        h('p', { class: 'card__hint' }, 'Esc per riprendere'),
      );
    };

    const renderConfirm = (question, okLabel, onOk) => {
      clear(card);
      card.append(
        h('h2', { id: 'pause-title', class: 'card__title' }, 'Sicura?'),
        h('p', { class: 'card__text' }, question),
        h(
          'div',
          { class: 'stack' },
          button(okLabel, { cls: 'btn btn--danger btn--lg', onClick: () => onOk() }),
          button('No, torna indietro', { cls: 'btn btn--primary btn--lg', onClick: renderMain }),
        ),
      );
      card.querySelector('.btn--primary')?.focus({ preventScroll: true });
    };

    renderMain();
    root.append(el);
    actions.querySelector('button')?.focus({ preventScroll: true });
    return {
      el,
      /** Torna alla vista principale se era aperta una conferma (Esc due volte non chiude per errore). */
      isConfirming: () => card.querySelector('.btn--danger') !== null,
      backToMain: renderMain,
      close: () => {
        el.remove();
        restoreFocus();
      },
    };
  };

  // --------------------------------------------- scheda "sorpresa" a ogni raccolta
  let cardEl = null;
  let cardTimer = null;
  const hideCard = () => {
    if (!cardEl) return;
    const old = cardEl;
    cardEl = null;
    old.classList.add('is-leaving');
    window.setTimeout(() => old.remove(), 260);
  };

  const showCard = ({ gift, result }) => {
    if (cardEl) {
      cardEl.remove();
      cardEl = null;
    }
    const positive = gift.type === 'positive';
    const category = app.categories[gift.category]?.label ?? '';
    const rare = gift.rarity === 'rare';
    const img = h('img', { src: giftSrc(gift), alt: '', width: 256, height: 256, decoding: 'async' });
    img.addEventListener('error', () => {
      const cat = app.categories[gift.category] ?? {};
      img.src = placeholderPortraitDataUri({ name: gift.name, color: cat.color, symbol: cat.symbol, type: gift.type, size: 256 });
    }, { once: true });
    const nominal = result?.nominal ?? gift.points;
    const el = h(
      'div',
      { class: `reveal ${positive ? 'reveal--positive' : 'reveal--negative'}${rare ? ' reveal--rare' : ''}`, role: 'status', 'aria-live': 'polite' },
      h('div', { class: 'reveal__photo' }, img, h('span', { class: 'reveal__tag' }, category)),
      h(
        'div',
        { class: 'reveal__body' },
        h('p', { class: 'reveal__kicker' }, rare ? 'Sorpresa rarissima!' : positive ? 'Sorpresa!' : 'Oh no…'),
        h('h3', { class: 'reveal__name' }, gift.name),
        h('p', { class: 'reveal__msg' }, gift.message),
      ),
      h(
        'div',
        { class: 'reveal__points' },
        h('b', {}, fmtPoints(nominal)),
        result && result.multiplier > 1 ? h('small', {}, `×${result.multiplier.toFixed(2).replace(/\.?0+$/, '')}`) : null,
      ),
    );
    root.append(el);
    cardEl = el;
    return { el, close: hideCard };
  };

  // --------------------------------------------------- conto alla rovescia / suggerimenti
  const countdownEl = h('div', { class: 'countdown', hidden: true, 'aria-live': 'assertive' });
  const hintEl = h('div', { class: 'hint', hidden: true, role: 'status' });
  root.append(countdownEl, hintEl);

  const setCountdown = (text, kind = '') => {
    if (!text) {
      countdownEl.hidden = true;
      return;
    }
    if (countdownEl.textContent === text && !countdownEl.hidden) return;
    countdownEl.hidden = false;
    countdownEl.className = `countdown ${kind}`;
    countdownEl.textContent = text;
    countdownEl.style.animation = 'none';
    void countdownEl.offsetWidth;
    countdownEl.style.animation = '';
  };

  const setHint = (text, iconName) => {
    if (!text) {
      hintEl.hidden = true;
      return;
    }
    clear(hintEl);
    if (iconName) hintEl.append(icon(iconName));
    hintEl.append(h('span', {}, text));
    hintEl.hidden = false;
  };

  // ---------------------------------------------------------- finale + registro
  const showFinal = ({ summary, best, newRecord, onAgain, onReview, onMenu }) => {
    rememberFocus();
    const f = settings.finale;
    const values = {
      name: settings.meta.playerName,
      score: summary.score,
      best,
      positive: summary.stats.positive,
      negative: summary.stats.negative,
      total: summary.stats.collected,
    };
    const again = button(f.playAgainLabel, { cls: 'btn btn--primary btn--lg', iconName: 'restart', onClick: () => onAgain() });
    const review = button(f.reviewLabel, { cls: 'btn btn--lg', iconName: 'gift', onClick: () => onReview() });
    const menu = button(f.menuLabel, { cls: 'btn btn--ghost btn--sm', iconName: 'home', onClick: () => onMenu() });
    const el = h(
      'section',
      { class: 'screen final', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'final-title' },
      h(
        'div',
        { class: 'final__card' },
        h(
          'div',
          { class: 'final__scroll' },
          h('p', { class: 'final__eyebrow' }, fillTemplate(f.eyebrow, values)),
          h('h2', { id: 'final-title', class: 'final__title' }, fillTemplate(f.title, values)),
          h('div', { class: 'final__text' }, f.paragraphs.map((p) => h('p', {}, fillTemplate(p, values)))),
          f.closing ? h('p', { class: 'final__closing' }, fillTemplate(f.closing, values)) : null,
          f.signature ? h('p', { class: 'final__sign' }, fillTemplate(f.signature, values)) : null,
          h(
            'div',
            { class: 'final__stats' },
            h('div', { class: 'stat stat--score' }, h('span', {}, f.scoreLabel), h('b', {}, String(summary.score)), newRecord ? h('em', {}, 'Nuovo record!') : null),
            h('div', { class: 'stat' }, h('span', {}, f.bestLabel), h('b', {}, String(best))),
            h('div', { class: 'stat' }, icon('heart'), h('b', {}, String(summary.stats.positive)), h('span', {}, 'belle')),
            h('div', { class: 'stat' }, icon('sad'), h('b', {}, String(summary.stats.negative)), h('span', {}, 'discutibili')),
          ),
        ),
        h('div', { class: 'final__actions' }, again, review, menu),
      ),
    );
    root.append(el);
    again.focus({ preventScroll: true });
    return {
      el,
      setHidden: (hidden) => {
        el.hidden = hidden;
        if (!hidden) again.focus({ preventScroll: true });
      },
      close: () => {
        el.remove();
        restoreFocus();
      },
    };
  };

  const showRegistry = ({ registry, onClose }) => {
    const grid = h('div', { class: 'registry__grid' });
    const total = registry.reduce((n, r) => n + r.count, 0);
    const takenIds = new Set(registry.map((r) => r.gift.id));
    const missed = app.gifts.filter((g) => !takenIds.has(g.id));

    const card = ({ gift, count }, taken) => {
      const cat = app.categories[gift.category]?.label ?? '';
      const positive = gift.type === 'positive';
      const img = h('img', { src: giftSrc(gift), alt: '', loading: 'lazy', decoding: 'async', width: 256, height: 256 });
      img.addEventListener('error', () => {
        const c = app.categories[gift.category] ?? {};
        img.src = placeholderPortraitDataUri({ name: gift.name, color: c.color, symbol: c.symbol, type: gift.type, size: 256 });
      }, { once: true });
      return h(
        'article',
        { class: `rcard ${positive ? 'rcard--positive' : 'rcard--negative'}${gift.rarity === 'rare' ? ' rcard--rare' : ''}${taken ? '' : ' rcard--missed'}` },
        h('div', { class: 'rcard__photo' }, img, count > 1 ? h('span', { class: 'rcard__count', 'aria-label': `Raccolto ${count} volte` }, `×${count}`) : null),
        h(
          'div',
          { class: 'rcard__body' },
          h('h3', {}, gift.name),
          h('p', { class: 'rcard__meta' }, h('span', { class: 'pill' }, cat), h('span', { class: `pill pill--${positive ? 'pos' : 'neg'}` }, positive ? 'Bella sorpresa' : 'Sorpresa discutibile')),
          h('p', { class: 'rcard__msg' }, gift.message),
        ),
      );
    };

    grid.append(h('h3', { class: 'registry__section' }, `Sorprese prese (${registry.length})`));
    for (const r of registry) grid.append(card(r, true));
    if (registry.length === 0) grid.append(h('p', { class: 'registry__empty' }, 'Questa volta non hai aperto nessun pacco: ecco cosa ti sei persa!'));
    if (missed.length > 0) {
      grid.append(h('h3', { class: 'registry__section' }, `Sorprese non prese (${missed.length})`));
      for (const gift of missed) grid.append(card({ gift, count: 0 }, false));
    }
    const closeBtn = button('Chiudi', { cls: 'btn btn--primary', iconName: 'close', onClick: () => onClose() });
    const el = h(
      'section',
      { class: 'screen screen--dim registry', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'registry-title' },
      h(
        'div',
        { class: 'registry__panel' },
        h('header', { class: 'registry__head' }, h('div', {}, h('h2', { id: 'registry-title' }, 'Tutte le sorprese'), h('p', {}, `${registry.length} prese · ${missed.length} non prese · ${total} pacchi aperti`)), closeBtn),
        grid,
      ),
    );
    root.append(el);
    closeBtn.focus({ preventScroll: true });
    return { el, close: () => el.remove() };
  };

  return { showMenu, showPause, showCard, hideCard, setCountdown, setHint, showFinal, showRegistry, giftSrc, button, clearTimers: () => window.clearTimeout(cardTimer) };
}
