/**
 * Strumenti per disegnare in SVG lo stile "giocattolo 3D": gradienti luce→ombra,
 * contorno scuro dello stesso colore, riflessi lucidi. Nessuna dipendenza da Phaser,
 * così lo stesso codice serve al gioco, alla galleria di sviluppo e agli script.
 */

/** Risoluzione di cottura delle texture rispetto alle dimensioni di progetto. */
export const TEX_SCALE = 2;

const clamp255 = (n) => Math.max(0, Math.min(255, Math.round(n)));

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((v) => clamp255(v).toString(16).padStart(2, '0')).join('')}`;
}

export function mix(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(A.map((v, i) => v + (B[i] - v) * t));
}

/** amt > 0 schiarisce verso il bianco, amt < 0 scurisce verso un viola profondo (ombre più ricche del nero). */
export function shade(hex, amt) {
  return amt >= 0 ? mix(hex, '#ffffff', amt) : mix(hex, '#2a1245', -amt);
}

export const outlineOf = (color, depth = 0.55) => shade(color, -depth);

/**
 * Piccolo costruttore di documenti SVG con gradienti riutilizzabili.
 * `prefix` evita collisioni di id quando più frammenti vengono combinati.
 */
export class Svg {
  constructor(w, h, prefix = 'a') {
    this.w = w;
    this.h = h;
    this.prefix = prefix;
    this.defs = [];
    this.body = [];
    this.count = 0;
  }

  id() {
    return `${this.prefix}${this.count++}`;
  }

  /** Gradiente lineare; `stops` = [[offset, colore, opacità?], ...] */
  linear(stops, { x1 = 0, y1 = 0, x2 = 0, y2 = 1 } = {}) {
    const id = this.id();
    const s = stops
      .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}"${a < 1 ? ` stop-opacity="${a}"` : ''}/>`)
      .join('');
    this.defs.push(`<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${s}</linearGradient>`);
    return `url(#${id})`;
  }

  /** `user: true` usa coordinate assolute dell'SVG invece della proporzione dell'oggetto. */
  radial(stops, { cx = 0.35, cy = 0.3, r = 0.8, fx = cx, fy = cy, user = false } = {}) {
    const id = this.id();
    const s = stops
      .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}"${a < 1 ? ` stop-opacity="${a}"` : ''}/>`)
      .join('');
    const units = user ? ' gradientUnits="userSpaceOnUse"' : '';
    this.defs.push(`<radialGradient id="${id}"${units} cx="${cx}" cy="${cy}" r="${r}" fx="${fx}" fy="${fy}">${s}</radialGradient>`);
    return `url(#${id})`;
  }

  /** Definisce un clipPath e ne restituisce il riferimento. */
  clip(shapeMarkup) {
    const id = this.id();
    this.defs.push(`<clipPath id="${id}">${shapeMarkup}</clipPath>`);
    return `url(#${id})`;
  }

  /** Riempimento "giocattolo" per superfici piatte: luce in alto a sinistra, ombra in basso a destra. */
  toy(color, { light = 0.32, dark = 0.3 } = {}) {
    return this.linear(
      [
        [0, shade(color, light)],
        [0.5, color],
        [1, shade(color, -dark)],
      ],
      { x1: 0, y1: 0, x2: 0.8, y2: 1 },
    );
  }

  /** Riempimento "sfera": luce morbida da un punto, bordo più scuro. */
  sphere(color, { cx = 0.35, cy = 0.3, light = 0.4, dark = 0.3 } = {}) {
    return this.radial(
      [
        [0, shade(color, light)],
        [0.55, color],
        [1, shade(color, -dark)],
      ],
      { cx, cy, r: 0.85 },
    );
  }

  /** Riempimento cilindrico orizzontale (luce al centro-sinistra). */
  cylinder(color, { light = 0.3, dark = 0.32 } = {}) {
    return this.linear(
      [
        [0, shade(color, -dark * 0.5)],
        [0.3, shade(color, light)],
        [0.6, color],
        [1, shade(color, -dark)],
      ],
      { x1: 0, y1: 0, x2: 1, y2: 0 },
    );
  }

  /** Aggiunge un filtro di sfocatura e ne restituisce il riferimento. */
  blur(std) {
    const id = this.id();
    this.defs.push(
      `<filter id="${id}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${std}"/></filter>`,
    );
    return `url(#${id})`;
  }

  add(markup) {
    this.body.push(markup);
    return this;
  }

  /** Frammento riutilizzabile: contiene solo defs + corpo (senza <svg>). */
  fragment() {
    return { defs: this.defs.join(''), body: this.body.join('') };
  }

  toString() {
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${this.w}" height="${this.h}" viewBox="0 0 ${this.w} ${this.h}">` +
      `<defs>${this.defs.join('')}</defs>${this.body.join('')}</svg>`
    );
  }
}

/** Attributi di contorno uniformi (angoli arrotondati = aspetto da gomma/plastica). */
export function stroke(color, width = 3) {
  return `stroke="${color}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"`;
}

/** Stella a `n` punte centrata in (0,0) con raggio esterno r e interno r*inner. */
export function starPath(r, n = 5, inner = 0.45, rotation = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const rad = i % 2 === 0 ? r : r * inner;
    const a = rotation + (i * Math.PI) / n;
    pts.push(`${(Math.cos(a) * rad).toFixed(2)},${(Math.sin(a) * rad).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

/** Stella a 4 punte "scintilla" con lati concavi. */
export function sparklePath(r) {
  const k = r * 0.22;
  return `M0,${-r} Q${k},${-k} ${r},0 Q${k},${k} 0,${r} Q${-k},${k} ${-r},0 Q${-k},${-k} 0,${-r}Z`;
}

/** Costruisce un data URI SVG utilizzabile come src di un'immagine. */
export function svgToDataUri(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
