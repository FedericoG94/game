import { settings, giftCatalog, categoryCatalog } from '../data/index.js';
import { loadPrefs, savePrefs } from './storage.js';
import { AudioManager } from './audio.js';
import { InputController } from './InputController.js';

const prefs = loadPrefs(settings.meta.storageKey);
if (typeof prefs.audio !== 'boolean') prefs.audio = settings.audio.enabled;
if (typeof prefs.touchButtons !== 'boolean') prefs.touchButtons = settings.accessibility.touchButtons;

// Solo diagnostica in sviluppo (`npm run dev`): ?debug&speed=4 accelera la simulazione, utile per
// verificare la corsa completa. Nella versione pubblicata il moltiplicatore è sempre 1.
const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
const debug = {
  enabled: params.has('debug'),
  timeScale: import.meta.env.DEV && params.has('debug') ? Math.min(12, Math.max(1, Number(params.get('speed')) || 1)) : 1,
};

const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
const computeReduced = () => (settings.accessibility.reducedMotion === 'auto' ? Boolean(mq?.matches) : Boolean(settings.accessibility.reducedMotion));

/**
 * Servizi condivisi tra scene e interfaccia: dati validati, preferenze, audio, input
 * e riferimenti agli elementi HTML. È l'unico stato globale del gioco.
 */
export const app = {
  settings,
  gifts: giftCatalog,
  categories: categoryCatalog,
  prefs,
  audio: new AudioManager({ ...settings.audio, enabled: prefs.audio }),
  input: new InputController(),
  /** giftId -> sorgente dell'immagine (file locale o segnaposto generato) */
  giftImages: new Map(),
  /** chiave AES per aprire le foto cifrate, derivata dalla parola d'ordine (impostata da boot.js) */
  vaultKey: null,
  reducedMotion: computeReduced(),
  quality: 1,
  debug,
  /** riempiti da main.js */
  ui: null,
  hud: null,
  swipe: null,
  touchZone: null,
  touchButtons: null,
  game: null,

  setAudio(on) {
    this.prefs.audio = on;
    this.audio.setEnabled(on);
    savePrefs(settings.meta.storageKey, this.prefs);
  },

  setTouchButtons(on) {
    this.prefs.touchButtons = on;
    savePrefs(settings.meta.storageKey, this.prefs);
    this.refreshTouchButtons();
  },

  /** `playing` abilita swipe, tastiera di gioco e (se attivi) i pulsanti touch. */
  setPlaying(playing) {
    this.playing = playing;
    this.input.setEnabled(playing);
    if (this.touchZone) this.touchZone.style.pointerEvents = playing ? 'auto' : 'none';
    this.refreshTouchButtons();
  },

  refreshTouchButtons() {
    if (this.touchButtons) this.touchButtons.hidden = !(this.playing && this.prefs.touchButtons);
  },

  /** Salva il record se battuto; restituisce true per un nuovo record. */
  saveBest(score) {
    if (score > (this.prefs.best || 0)) {
      this.prefs.best = score;
      savePrefs(settings.meta.storageKey, this.prefs);
      return true;
    }
    return false;
  },
};

mq?.addEventListener?.('change', () => {
  app.reducedMotion = computeReduced();
});
