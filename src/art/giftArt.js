import { Svg, outlineOf, shade, stroke, starPath, sparklePath } from './svgKit.js';

export const BOX_SIZE = 200;
/** Il "piede" del pacco (punto che tocca terra) in coordinate di texture. */
export const BOX_FOOT_Y = 188;

const INK = '#2a1245';

/** Simbolo disegnato attorno a (0,0), entro ±13 px. */
export function symbolMarkup(symbol, color) {
  const dark = shade(color, -0.5);
  const o = `stroke="${INK}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"`;
  switch (symbol) {
    case 'heart':
      return `<path d="M0,10 C-17,-2 -10,-14 0,-6 C10,-14 17,-2 0,10Z" fill="#ff4f8b" ${o}/><ellipse cx="-5" cy="-6" rx="3" ry="1.8" fill="#fff" opacity=".7" transform="rotate(-30 -5 -6)"/>`;
    case 'ball': {
      const spokes = [0, 1, 2, 3, 4]
        .map((i) => {
          const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          return `<line x1="${(Math.cos(a) * 5).toFixed(1)}" y1="${(Math.sin(a) * 5).toFixed(1)}" x2="${(Math.cos(a) * 11).toFixed(1)}" y2="${(Math.sin(a) * 11).toFixed(1)}" stroke="${INK}" stroke-width="1.6"/>`;
        })
        .join('');
      return `<circle r="12" fill="#fff" ${o}/>${spokes}<path d="${starPath(5.2, 5, 1)}" fill="${INK}"/>`;
    }
    case 'flag': {
      let sq = '';
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 4; c++) sq += `<rect x="${-8 + c * 5.5}" y="${-9 + r * 5.5}" width="5.5" height="5.5" fill="${(r + c) % 2 ? '#fff' : INK}"/>`;
      return `<line x1="-9" y1="-11" x2="-9" y2="12" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>${sq}<rect x="-8" y="-9" width="22" height="16.5" fill="none" ${o}/>`;
    }
    case 'volley':
      return `<circle r="12" fill="#ffe36b" ${o}/><path d="M-11,-3 Q0,6 11,-3 M-6,-10.5 Q-2,0 -9,9 M6,-10.5 Q2,0 9,9" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/><path d="M-10,3 Q-4,-2 0,-12" fill="none" stroke="#4a8cff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>`;
    case 'star':
      return `<path d="${starPath(13, 5, 0.46)}" fill="#ffd34d" ${o}/><path d="${starPath(5, 5, 0.46)}" fill="#fff" opacity=".6"/>`;
    case 'smile':
      return `<circle r="12" fill="#ffe66d" ${o}/><circle cx="-4.2" cy="-3" r="1.9" fill="${INK}"/><circle cx="4.2" cy="-3" r="1.9" fill="${INK}"/><path d="M-6,3 Q0,10 6,3" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`;
    case 'mail':
      return `<rect x="-12" y="-8" width="24" height="16" rx="3" fill="#fff" ${o}/><path d="M-11,-7 L0,2 L11,-7" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><path d="M0,3 C-4,-1 -6,-4 -3,-5 C-1,-5.5 0,-4 0,-3.5 C0,-4 1,-5.5 3,-5 C6,-4 4,-1 0,3Z" fill="#ff5f95" transform="translate(0 3) scale(.7)"/>`;
    case 'camera':
      return `<rect x="-12" y="-6" width="24" height="16" rx="4" fill="#fff" ${o}/><rect x="-5" y="-10" width="10" height="5" rx="2" fill="#fff" ${o}/><circle cy="2" r="5.6" fill="#5aa9ff" ${o}/><circle cx="-1.6" cy="0.4" r="1.8" fill="#fff" opacity=".85"/>`;
    case 'question':
      return `<path d="M-5,-4 C-5,-11 6,-11 6,-4 C6,0 0,0.5 0,5" fill="none" stroke="${dark}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/><circle cy="10" r="2.6" fill="${dark}"/>`;
    case 'sparkle':
    default:
      return `<path d="${sparklePath(14)}" fill="#fff" stroke="#e0a000" stroke-width="2" stroke-linejoin="round"/><circle cx="7" cy="-8" r="2" fill="#ffe27a"/>`;
  }
}

/** Fiocco centrato in (100, 58). */
function bowMarkup(s, ribbon) {
  const rl = outlineOf(ribbon, 0.5);
  const loopFill = s.linear([[0, shade(ribbon, 0.4)], [0.55, ribbon], [1, shade(ribbon, -0.28)]], { x1: 0, y1: 0, x2: 1, y2: 1 });
  const loopFillR = s.linear([[0, shade(ribbon, 0.4)], [0.55, ribbon], [1, shade(ribbon, -0.28)]], { x1: 1, y1: 0, x2: 0, y2: 1 });
  const tail = s.linear([[0, ribbon], [1, shade(ribbon, -0.3)]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  const hollow = shade(ribbon, -0.35);
  const knot = s.sphere(ribbon, { light: 0.5 });
  return (
    `<path d="M94,66 L76,90 L88,94 L102,70Z" fill="${tail}" ${stroke(rl, 2.6)}/>` +
    `<path d="M106,66 L124,90 L112,94 L98,70Z" fill="${tail}" ${stroke(rl, 2.6)}/>` +
    `<path d="M98,58 C86,22 42,18 42,42 C42,60 76,68 98,58Z" fill="${loopFill}" ${stroke(rl, 3)}/>` +
    `<path d="M92,55 C84,36 58,31 57,42 C57,52 78,58 92,55Z" fill="${hollow}" opacity=".55"/>` +
    `<path d="M102,58 C114,22 158,18 158,42 C158,60 124,68 102,58Z" fill="${loopFillR}" ${stroke(rl, 3)}/>` +
    `<path d="M108,55 C116,36 142,31 143,42 C143,52 122,58 108,55Z" fill="${hollow}" opacity=".55"/>` +
    `<path d="M52,34 Q62,26 76,31" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/>` +
    `<path d="M148,34 Q138,26 124,31" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".35"/>` +
    `<ellipse cx="100" cy="58" rx="12" ry="11" fill="${knot}" ${stroke(rl, 3)}/>` +
    `<ellipse cx="96" cy="54" rx="4.5" ry="3" fill="#fff" opacity=".6"/>`
  );
}

/**
 * Costruisce i pezzi di un pacco in un sistema di coordinate 200×200 comune:
 * i pezzi si sovrappongono perfettamente se disegnati nello stesso punto.
 */
export function buildBox({ color, ribbon, symbol = null, rare = false, decor = false, prefix = 'b' }) {
  const s = new Svg(BOX_SIZE, BOX_SIZE, prefix);
  const ol = outlineOf(color);
  const rl = outlineOf(ribbon, 0.5);
  const parts = {};

  // Corpo
  const bodyFill = s.toy(color);
  const sideShade = s.linear([[0, '#2a1245', 0], [0.55, '#2a1245', 0.04], [1, '#2a1245', 0.32]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  let body =
    `<rect x="36" y="108" width="128" height="80" rx="9" fill="${bodyFill}" ${stroke(ol, 3.5)}/>` +
    `<rect x="36" y="108" width="128" height="80" rx="9" fill="${sideShade}"/>` +
    `<path d="M36,176 L164,176 L164,179 Q164,188 155,188 L45,188 Q36,188 36,179Z" fill="${INK}" opacity=".14"/>` +
    `<rect x="37" y="109" width="126" height="11" fill="${INK}" opacity=".25"/>`;
  if (decor) {
    const dotFill = shade(color, 0.5);
    body += [[52, 130], [76, 168], [140, 126], [148, 164], [124, 176]]
      .map(([x, y]) => `<path transform="translate(${x} ${y})" d="${sparklePath(6)}" fill="${dotFill}" opacity=".8"/>`)
      .join('');
  }
  parts.body = body;

  // Nastro verticale sul corpo
  const ribbonCyl = s.cylinder(ribbon);
  parts.ribbonBody = `<rect x="88" y="108" width="24" height="80" fill="${ribbonCyl}" ${stroke(rl, 2.6)}/>`;

  // Coperchio (fronte + faccia superiore) con il suo nastro
  const lidColor = shade(color, 0.08);
  const lidFront = s.toy(lidColor, { light: 0.25, dark: 0.22 });
  const lidTop = s.linear([[0, shade(color, 0.5)], [1, shade(color, 0.2)]], { x1: 0, y1: 0, x2: 0.3, y2: 1 });
  const ribbonTop = s.linear([[0, shade(ribbon, 0.3)], [1, ribbon]]);
  parts.lid =
    `<rect x="26" y="86" width="148" height="32" rx="9" fill="${lidFront}" ${stroke(ol, 3.5)}/>` +
    `<rect x="88" y="86" width="24" height="32" fill="${ribbonCyl}" ${stroke(rl, 2.6)}/>` +
    `<path d="M28,90 L172,90 L155,58 Q153,54 147,54 L53,54 Q47,54 45,58Z" fill="${lidTop}" ${stroke(ol, 3.5)}/>` +
    `<path d="M40.7,66 L159.3,66 L165.1,77 L34.9,77Z" fill="${ribbonTop}" ${stroke(rl, 2.4)}/>` +
    `<path d="M88,90 L112,90 L109.5,56 L90.5,56Z" fill="${ribbonCyl}" ${stroke(rl, 2.6)}/>` +
    `<path d="M26,106 Q100,112 174,106" fill="none" stroke="#fff" stroke-width="2.4" opacity=".22" stroke-linecap="round"/>`;

  parts.bow = bowMarkup(s, ribbon);

  // Medaglione con simbolo di categoria
  if (symbol) {
    const badge = s.radial([[0, '#ffffff'], [1, shade(color, 0.75)]], { cx: 0.38, cy: 0.3, r: 0.85 });
    parts.badge =
      `<g transform="translate(64 151)"><circle r="18" fill="${badge}" ${stroke(ol, 3)}/>` +
      `<g transform="scale(.92)">${symbolMarkup(symbol, color)}</g></g>`;
  } else {
    parts.badge = '';
  }

  // Riflessi
  let shine =
    `<path d="M42,116 L57,116 L47,186 L42,186Z" fill="#fff" opacity=".2"/>` +
    `<ellipse cx="74" cy="64" rx="24" ry="5" transform="rotate(-8 74 64)" fill="#fff" opacity=".4"/>`;
  if (rare) {
    shine += [[22, 44, 11], [178, 52, 9], [176, 128, 8], [26, 120, 7]]
      .map(([x, y, r]) => `<path transform="translate(${x} ${y})" d="${sparklePath(r)}" fill="#fff" stroke="#f0b400" stroke-width="1.6" stroke-linejoin="round"/>`)
      .join('');
  }
  parts.shine = shine;

  return { s, parts };
}

const ORDER = ['body', 'ribbonBody', 'lid', 'bow', 'badge', 'shine'];

/** SVG completo (o parziale) di un pacco. */
export function giftBoxSvg(opts, include = ORDER) {
  const { s, parts } = buildBox(opts);
  for (const key of ORDER) if (include.includes(key)) s.add(parts[key]);
  return s.toString();
}

/** Frammento (defs + corpo) di un pacco completo, da incastrare in un altro SVG. */
export function giftBoxFragment(opts) {
  const { s, parts } = buildBox(opts);
  for (const key of ORDER) s.add(parts[key]);
  return s.fragment();
}

/** Pezzi del grande regalo finale (oro e rosa), tutti nello stesso riquadro 200×200. */
export const BIG_GIFT_STYLE = { color: '#ffc42e', ribbon: '#ff3d8b', symbol: null, rare: true, decor: true, prefix: 'g' };

export const BIG_GIFT_PARTS = {
  body: ['body'],
  ribbonBody: ['ribbonBody'],
  lid: ['lid'],
  bow: ['bow'],
  shine: ['shine'],
};

/** Apertura luminosa in cima al corpo del grande regalo (visibile solo quando il coperchio è sollevato). */
export function giftOpeningSvg({ color }) {
  const s = new Svg(BOX_SIZE, BOX_SIZE, 'o');
  const ol = outlineOf(color, 0.6);
  const inner = s.radial([[0, '#ffffff'], [0.35, '#fff3b0'], [0.75, shade(color, 0.1)], [1, shade(color, -0.45)]], { cx: 0.5, cy: 0.5, r: 0.5 });
  s.add(`<ellipse cx="100" cy="109" rx="63" ry="14" fill="${shade(color, -0.2)}" ${stroke(ol, 3.5)}/>`);
  s.add(`<ellipse cx="100" cy="109" rx="55" ry="10" fill="${inner}"/>`);
  return s.toString();
}
