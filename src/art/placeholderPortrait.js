import { Svg, shade, stroke, outlineOf, svgToDataUri } from './svgKit.js';
import { symbolMarkup } from './giftArt.js';

const INK = '#2a1245';

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

const escapeXml = (t) => String(t).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);

/**
 * Ritratto segnaposto in stile cartoon: sagoma con volto, simbolo della categoria
 * e striscia "PLACEHOLDER". Usato per generare i file di esempio e come ripiego
 * quando l'immagine vera di un regalo non si carica.
 */
export function placeholderPortraitSvg({ name = 'Sorpresa', color = '#ff8fc0', symbol = 'sparkle', type = 'positive', size = 512 } = {}) {
  const S = 512;
  const s = new Svg(S, S, 'q');
  const positive = type !== 'negative';
  const seed = hash(name);

  s.add(`<rect width="${S}" height="${S}" fill="${s.linear([[0, shade(color, 0.55)], [0.55, color], [1, shade(color, -0.35)]], { x1: 0, y1: 0, x2: 0.7, y2: 1 })}"/>`);
  for (let i = 0; i < 9; i++) {
    const x = ((seed >> (i * 2)) % 460) + 26;
    const y = ((seed >> (i * 3)) % 300) + 20;
    const r = 14 + ((seed >> i) % 26);
    s.add(`<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity=".13"/>`);
  }

  const body = shade(color, -0.4);
  const head = shade(color, -0.12);
  s.add(`<ellipse cx="256" cy="520" rx="200" ry="150" fill="${s.sphere(body, { cx: 0.4, cy: 0.2, light: 0.25, dark: 0.3 })}" ${stroke(outlineOf(color, 0.65), 5)}/>`);
  s.add(`<circle cx="256" cy="226" r="104" fill="${s.sphere(head, { cx: 0.38, cy: 0.3, light: 0.4, dark: 0.3 })}" ${stroke(outlineOf(color, 0.65), 5)}/>`);

  const eyeY = 218;
  s.add(`<ellipse cx="216" cy="${eyeY}" rx="12" ry="17" fill="${INK}"/><ellipse cx="296" cy="${eyeY}" rx="12" ry="17" fill="${INK}"/>`);
  s.add(`<circle cx="212" cy="${eyeY - 7}" r="5" fill="#fff"/><circle cx="292" cy="${eyeY - 7}" r="5" fill="#fff"/>`);
  if (positive) {
    s.add(`<path d="M214,266 Q256,304 298,266" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`);
    s.add(`<ellipse cx="190" cy="262" rx="18" ry="10" fill="#ff7aa8" opacity=".5"/><ellipse cx="322" cy="262" rx="18" ry="10" fill="#ff7aa8" opacity=".5"/>`);
  } else {
    s.add(`<path d="M204,190 L236,200 M308,190 L276,200" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`);
    s.add(`<path d="M218,286 Q256,254 294,286" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`);
  }

  // medaglione con il simbolo della categoria
  s.add(`<g transform="translate(430 84)"><circle r="54" fill="#fff" ${stroke(outlineOf(color, 0.6), 6)}/><g transform="scale(3.2)">${symbolMarkup(symbol, color)}</g></g>`);

  // striscia "PLACEHOLDER"
  const label = escapeXml(name.length > 26 ? `${name.slice(0, 25)}…` : name);
  const nameSize = Math.max(22, Math.min(36, 470 / Math.max(10, label.length) * 1.75));
  s.add(`<rect x="0" y="392" width="${S}" height="120" fill="${INK}" opacity=".88"/>`);
  s.add(`<text x="256" y="446" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="44" letter-spacing="3" fill="#ffd34d">PLACEHOLDER</text>`);
  s.add(`<text x="256" y="486" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${nameSize.toFixed(0)}" fill="#ffffff">${label}</text>`);

  // cornice
  const frame = positive ? '#ffc928' : '#8a5cff';
  s.add(`<rect x="7" y="7" width="${S - 14}" height="${S - 14}" rx="26" fill="none" stroke="${frame}" stroke-width="14"/>`);
  s.add(`<rect x="7" y="7" width="${S - 14}" height="${S - 14}" rx="26" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>`);

  const svg = s.toString();
  return size === S ? svg : svg.replace(/width="512" height="512"/, `width="${size}" height="${size}"`);
}

export const placeholderPortraitDataUri = (opts) => svgToDataUri(placeholderPortraitSvg(opts));
