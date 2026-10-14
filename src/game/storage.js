/** Preferenze e record salvati nel browser. Ogni accesso è protetto: in modalità privata può fallire. */
const DEFAULTS = { audio: null, touchButtons: null, best: 0 };

export function loadPrefs(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePrefs(key, prefs) {
  try {
    window.localStorage.setItem(key, JSON.stringify(prefs));
  } catch {
    /* non disponibile: il gioco funziona lo stesso */
  }
}
