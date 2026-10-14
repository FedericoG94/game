/**
 * Percorso di un file in `public/` valido sia in sviluppo sia quando il sito è servito
 * da un sottopercorso (es. https://utente.github.io/nome-repo/): usa la `base` di Vite.
 */
export function assetUrl(path) {
  const base = import.meta.env.BASE_URL || './';
  return `${base.endsWith('/') ? base : `${base}/`}${String(path).replace(/^\/+/, '')}`;
}
