const KEY_ACTIONS = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'jump',
  KeyW: 'jump',
  Space: 'jump',
  ArrowDown: 'slide',
  KeyS: 'slide',
  Escape: 'pause',
  KeyP: 'pause',
  KeyM: 'mute',
};

const GAMEPLAY_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']);

/**
 * Unifica tastiera, swipe e pulsanti touch in un'unica serie di azioni:
 * 'left' | 'right' | 'jump' | 'slide' | 'pause' | 'mute'.
 * I tasti tenuti premuti NON generano ripetizioni: serve rilasciare e ripremere.
 */
export class InputController {
  constructor() {
    this.handlers = new Map();
    this.enabled = false;
    this.onKeyDown = this.onKeyDown.bind(this);
    window.addEventListener('keydown', this.onKeyDown);
  }

  /** Registra il gestore di un'azione; restituisce la funzione per rimuoverlo. */
  on(action, fn) {
    if (!this.handlers.has(action)) this.handlers.set(action, new Set());
    this.handlers.get(action).add(fn);
    return () => this.handlers.get(action)?.delete(fn);
  }

  /** Quando false le azioni di gioco sono ignorate (menu, pausa, finale). */
  setEnabled(on) {
    this.enabled = on;
    // Durante il gioco nessun pulsante deve restare a fuoco: Spazio/Invio non devono attivarlo.
    if (on && document.activeElement && document.activeElement !== document.body) document.activeElement.blur?.();
  }

  emit(action) {
    if (action !== 'pause' && action !== 'mute' && !this.enabled) return;
    this.handlers.get(action)?.forEach((fn) => fn());
  }

  onKeyDown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const action = KEY_ACTIONS[e.code];
    if (!action) return;
    if (this.enabled && GAMEPLAY_KEYS.has(e.code)) e.preventDefault();
    // `repeat` è impostato dal browser per le ripetizioni automatiche del tasto tenuto premuto.
    if (e.repeat) return;
    // Nei menu i tasti attivano i pulsanti nativi: non intercettiamo Spazio.
    if (!this.enabled && action !== 'pause' && action !== 'mute') return;
    this.emit(action);
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    this.handlers.clear();
  }
}
