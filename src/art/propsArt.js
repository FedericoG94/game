import { Svg, outlineOf, shade, stroke, starPath, sparklePath } from './svgKit.js';
import { giftBoxFragment } from './giftArt.js';

const INK = '#3b2147';
const PINK = '#ff6fa5';
const TURQ = '#28c9d4';
const YELLOW = '#ffd23f';
const LILAC = '#a98bff';

/** Palloncino con nodo e riflesso, centrato in (cx, cy). */
function balloon(s, cx, cy, color, rx = 20, ry = 25) {
  const ol = outlineOf(color, 0.5);
  return (
    `<path d="M${cx - 4},${cy + ry - 2} L${cx},${cy + ry + 7} L${cx + 4},${cy + ry - 2}Z" fill="${shade(color, -0.2)}" ${stroke(ol, 2)}/>` +
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${s.sphere(color, { light: 0.5, dark: 0.3 })}" ${stroke(ol, 3)}/>` +
    `<ellipse cx="${cx - rx * 0.38}" cy="${cy - ry * 0.4}" rx="${rx * 0.2}" ry="${ry * 0.3}" fill="#fff" opacity=".6" transform="rotate(-25 ${cx - rx * 0.38} ${cy - ry * 0.4})"/>`
  );
}

/** Colonna a strisce di caramella con ombreggiatura cilindrica. */
function candyPost(s, x, y, w, h, c1, c2, band = 14) {
  const id = `${x}-${y}`;
  const clip = s.clip(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2.4}"/>`);
  let stripes = '';
  for (let yy = y, i = 0; yy < y + h; yy += band, i++) stripes += `<rect x="${x}" y="${yy}" width="${w}" height="${band}" fill="${i % 2 ? c2 : c1}"/>`;
  const shadeFill = s.linear([[0, '#2a1245', 0.3], [0.3, '#fff', 0.28], [0.55, '#fff', 0], [1, '#2a1245', 0.4]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  return (
    `<g clip-path="${clip}" data-id="${id}">${stripes}<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${shadeFill}"/></g>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2.4}" fill="none" ${stroke(outlineOf(c1, 0.55), 3)}/>`
  );
}

// ------------------------------------------------------------------ OSTACOLI
export function hurdleSvg() {
  const s = new Svg(340, 124, 'u');
  const W = 340;
  const barClip = s.clip(`<rect x="22" y="50" width="296" height="26" rx="13"/>`);
  let stripes = '';
  for (let x = 22, i = 0; x < 318; x += 26, i++) stripes += `<rect x="${x}" y="50" width="26" height="26" fill="${i % 2 ? '#fff' : PINK}"/>`;
  const barShade = s.linear([[0, '#fff', 0.45], [0.45, '#fff', 0], [1, '#2a1245', 0.38]]);
  s.add(candyPost(s, 12, 14, 24, 102, PINK, '#ffffff'));
  s.add(candyPost(s, W - 36, 14, 24, 102, PINK, '#ffffff'));
  s.add(`<circle cx="24" cy="14" r="13" fill="${s.sphere('#ffc928', { light: 0.5 })}" ${stroke('#9a6a0a', 3)}/><circle cx="${W - 24}" cy="14" r="13" fill="${s.sphere('#ffc928', { light: 0.5 })}" ${stroke('#9a6a0a', 3)}/>`);
  s.add(`<g clip-path="${barClip}">${stripes}<rect x="22" y="50" width="296" height="26" fill="${barShade}"/></g>`);
  s.add(`<rect x="22" y="50" width="296" height="26" rx="13" fill="none" ${stroke(outlineOf(PINK, 0.55), 3.5)}/>`);
  s.add(`<g transform="translate(170 63)"><path d="${starPath(17, 5, 0.48)}" fill="${s.sphere('#ffc928', { light: 0.5 })}" ${stroke('#9a6a0a', 2.8)}/></g>`);
  return { w: 340, h: 124, svg: s.toString(), origin: [0.5, 116 / 124] };
}

export function bannerSvg() {
  const s = new Svg(360, 252, 'n');
  const poleL = candyPost(s, 30, 44, 18, 202, TURQ, '#ffffff', 16);
  const poleR = candyPost(s, 312, 44, 18, 202, TURQ, '#ffffff', 16);
  s.add(poleL + poleR);
  // palloncini in cima ai pali
  s.add(balloon(s, 20, 52, PINK, 17, 21) + balloon(s, 39, 28, YELLOW, 18, 22) + balloon(s, 58, 54, LILAC, 16, 20));
  s.add(balloon(s, 302, 54, LILAC, 16, 20) + balloon(s, 321, 28, YELLOW, 18, 22) + balloon(s, 340, 52, PINK, 17, 21));
  // striscione
  const band = s.linear([[0, PINK], [0.33, YELLOW], [0.66, TURQ], [1, LILAC]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  const bandShade = s.linear([[0, '#fff', 0.4], [0.5, '#fff', 0], [1, '#2a1245', 0.3]]);
  const path = 'M39,96 Q180,116 321,96 L321,130 Q180,150 39,130Z';
  s.add(`<path d="${path}" fill="${band}" ${stroke(INK, 3.5)}/><path d="${path}" fill="${bandShade}"/>`);
  for (const x of [84, 132, 180, 228, 276]) {
    const t = (x - 39) / 282;
    const y = 96 + 20 * t * (1 - t) * 2 + 17 + 4;
    s.add(`<g transform="translate(${x} ${y.toFixed(1)})"><path d="${starPath(10, 5, 0.46)}" fill="#fff" ${stroke(INK, 2)}/></g>`);
  }
  // bandierine appese
  const flagColors = [PINK, YELLOW, TURQ, LILAC];
  for (let i = 0, x = 54; x < 300; x += 34, i++) {
    const yb = (xx) => 130 + 40 * ((xx - 39) / 282) * (1 - (xx - 39) / 282);
    const col = flagColors[i % 4];
    s.add(
      `<path d="M${x},${yb(x).toFixed(1)} L${x + 26},${yb(x + 26).toFixed(1)} L${x + 13},${(yb(x + 13) + 24).toFixed(1)}Z" fill="${s.toy(col)}" ${stroke(outlineOf(col, 0.55), 2.6)}/>`,
    );
  }
  return { w: 360, h: 252, svg: s.toString(), origin: [0.5, 246 / 252] };
}

function cakeTier(s, cx, yb, w, h, body, frost, drip = 16) {
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const yt = yb - h;
  const ry = 11;
  const ol = outlineOf(body, 0.55);
  let out = `<path d="M${x0},${yt} L${x0},${yb} A${w / 2},${ry} 0 0 0 ${x1},${yb} L${x1},${yt}Z" fill="${s.cylinder(body, { light: 0.3, dark: 0.3 })}" ${stroke(ol, 3.5)}/>`;
  // glassa con gocce
  const seg = w / 6;
  let d = `M${x0},${yt}`;
  for (let i = 0; i < 6; i++) {
    const depth = drip + (i % 2 ? 12 : 0) + (i === 2 ? 6 : 0);
    d += ` L${x0 + i * seg},${yt + 4} Q${x0 + i * seg + seg / 2},${yt + depth * 1.9} ${x0 + (i + 1) * seg},${yt + 4}`;
  }
  d += ` L${x1},${yt}Z`;
  out += `<path d="${d}" fill="${s.cylinder(frost, { light: 0.2, dark: 0.2 })}" ${stroke(outlineOf(frost, 0.5), 3)}/>`;
  out += `<ellipse cx="${cx}" cy="${yt}" rx="${w / 2}" ry="${ry}" fill="${s.linear([[0, shade(frost, 0.4)], [1, frost]])}" ${stroke(outlineOf(frost, 0.5), 3.2)}/>`;
  const sprinkle = ['#ff6fa5', '#28c9d4', '#ffd23f', '#a98bff'];
  for (let i = 0; i < 7; i++) {
    const sx = x0 + 12 + ((i * 53) % (w - 24));
    const sy = yt + drip + 16 + ((i * 29) % Math.max(10, h - drip - 28));
    out += `<rect x="${sx}" y="${sy}" width="9" height="3.6" rx="1.8" fill="${sprinkle[i % 4]}" transform="rotate(${(i * 47) % 160} ${sx + 4} ${sy + 2})"/>`;
  }
  return out;
}

export function cakeSvg() {
  const s = new Svg(190, 244, 'k');
  s.add(`<ellipse cx="95" cy="228" rx="90" ry="13" fill="${s.linear([[0, '#f4f0ff'], [1, '#b9aee0']])}" ${stroke('#5b4a8a', 3.2)}/>`);
  s.add(cakeTier(s, 95, 226, 164, 72, '#8a4a2b', '#fff3d6', 14));
  s.add(cakeTier(s, 95, 154, 126, 60, PINK, '#ffffff', 14));
  s.add(cakeTier(s, 95, 94, 90, 48, '#fff1c9', '#ff8fc0', 12));
  // candeline e ciliegia
  for (const x of [74, 116]) {
    s.add(`<rect x="${x - 4.5}" y="22" width="9" height="30" rx="3" fill="${s.cylinder(LILAC)}" ${stroke(outlineOf(LILAC, 0.55), 2.4)}/>`);
    s.add(`<path d="M${x},6 C${x + 8},14 ${x + 6},22 ${x},22 C${x - 6},22 ${x - 8},14 ${x},6Z" fill="#ffb02e" ${stroke('#c2570a', 2)}/><path d="M${x},12 C${x + 3},16 ${x + 2},20 ${x},20 C${x - 2},20 ${x - 3},16 ${x},12Z" fill="#fff3a8"/>`);
  }
  s.add(`<circle cx="95" cy="44" r="12" fill="${s.sphere('#ff3d5a', { light: 0.5 })}" ${stroke('#8a1530', 3)}/><ellipse cx="91" cy="40" rx="3.2" ry="2.2" fill="#fff" opacity=".7"/><path d="M95,33 Q98,20 106,16" fill="none" stroke="#3f8a2e" stroke-width="3" stroke-linecap="round"/>`);
  return { w: 190, h: 244, svg: s.toString(), origin: [0.5, 228 / 244] };
}

/** Traguardo: arco con bandiera a scacchi, pali a spirale e palloncini. */
export function gateSvg() {
  const s = new Svg(420, 290, 'q');
  const W = 420;
  s.add(candyPost(s, 26, 100, 46, 186, '#ffc928', '#ff6fa5', 18));
  s.add(candyPost(s, W - 72, 100, 46, 186, '#ffc928', '#ff6fa5', 18));
  s.add(balloon(s, 30, 70, PINK, 22, 27) + balloon(s, 62, 44, YELLOW, 22, 27) + balloon(s, 20, 118, TURQ, 20, 25));
  s.add(balloon(s, W - 30, 70, LILAC, 22, 27) + balloon(s, W - 62, 44, TURQ, 22, 27) + balloon(s, W - 20, 118, PINK, 20, 25));
  const beam = s.clip(`<rect x="34" y="60" width="${W - 68}" height="62" rx="14"/>`);
  let sq = '';
  const cell = 31;
  for (let r = 0; r < 2; r++) for (let c = 0; c < 10; c++) sq += `<rect x="${34 + c * cell}" y="${60 + r * cell}" width="${cell}" height="${cell}" fill="${(r + c) % 2 ? '#fff' : INK}"/>`;
  s.add(`<g clip-path="${beam}">${sq}<rect x="34" y="60" width="${W - 68}" height="62" fill="${s.linear([[0, '#fff', 0.3], [0.5, '#fff', 0], [1, '#2a1245', 0.35]])}"/></g>`);
  s.add(`<rect x="34" y="60" width="${W - 68}" height="62" rx="14" fill="none" ${stroke('#9a6a0a', 6)}/><rect x="34" y="60" width="${W - 68}" height="62" rx="14" fill="none" stroke="#ffd34d" stroke-width="2.6"/>`);
  const pen = [PINK, YELLOW, TURQ, LILAC];
  for (let i = 0, x = 50; x < W - 70; x += 34, i++) {
    s.add(`<path d="M${x},122 L${x + 28},122 L${x + 14},148Z" fill="${s.toy(pen[i % 4])}" ${stroke(outlineOf(pen[i % 4], 0.55), 2.6)}/>`);
  }
  s.add(`<g transform="translate(${W / 2} 91)"><circle r="31" fill="${s.sphere('#ffc928', { light: 0.5 })}" ${stroke('#9a6a0a', 4)}/><path d="${starPath(20, 5, 0.46)}" fill="#fff" ${stroke('#c2570a', 2.6)}/></g>`);
  return { w: 420, h: 290, svg: s.toString(), origin: [0.5, 284 / 290] };
}

// --------------------------------------------------------------- SCENOGRAFIA
export function balloonsSvg() {
  const s = new Svg(110, 240, 'y');
  const tie = [[36, 70, PINK, 24, 30], [74, 54, TURQ, 24, 30], [60, 112, YELLOW, 22, 28]];
  for (const [x, y, , ,] of tie) s.add(`<path d="M${x},${y + 32} Q${(x + 55) / 2 + 6},170 55,226" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>`);
  for (const [x, y, c, rx, ry] of tie) s.add(balloon(s, x, y, c, rx, ry));
  s.add(`<circle cx="55" cy="230" r="9" fill="${s.sphere('#ffc928', { light: 0.5 })}" ${stroke('#9a6a0a', 2.6)}/>`);
  return { w: 110, h: 240, svg: s.toString(), origin: [0.5, 232 / 240] };
}

export function lollipopSvg(c1 = PINK, c2 = '#ffffff') {
  const s = new Svg(110, 230, 'r');
  s.add(`<rect x="50" y="96" width="10" height="130" rx="5" fill="${s.cylinder('#ffffff')}" ${stroke('#8a7ab5', 3)}/>`);
  s.add(`<circle cx="55" cy="58" r="50" fill="${s.sphere(c1, { cx: 0.38, cy: 0.3 })}" ${stroke(outlineOf(c1, 0.55), 4)}/>`);
  let d = '';
  for (let a = 0; a < Math.PI * 7; a += 0.2) {
    const r = 3 + a * 2.0;
    d += `${d ? 'L' : 'M'}${(55 + Math.cos(a) * r).toFixed(1)},${(58 + Math.sin(a) * r).toFixed(1)}`;
  }
  s.add(`<path d="${d}" fill="none" stroke="${c2}" stroke-width="8" stroke-linecap="round" opacity=".95"/>`);
  s.add(`<path d="M22,34 Q34,14 56,12" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".5"/>`);
  s.add(`<path d="M55,100 L38,92 L40,110Z M55,100 L72,92 L70,110Z" fill="${s.toy(TURQ)}" ${stroke(outlineOf(TURQ, 0.55), 2.4)}/><circle cx="55" cy="101" r="6" fill="${s.sphere(TURQ)}" ${stroke(outlineOf(TURQ, 0.55), 2.4)}/>`);
  return { w: 110, h: 230, svg: s.toString(), origin: [0.5, 224 / 230] };
}

export function candleSvg() {
  const s = new Svg(80, 250, 'd');
  const body = s.clip(`<rect x="20" y="78" width="40" height="164" rx="10"/>`);
  let st = '';
  for (let i = -4; i < 14; i++) {
    st += `<path d="M20,${78 + i * 26} L60,${78 + i * 26 - 24} L60,${78 + i * 26 - 8} L20,${78 + i * 26 + 16}Z" fill="${i % 2 ? '#fff' : LILAC}"/>`;
  }
  s.add(`<g clip-path="${body}"><rect x="20" y="78" width="40" height="164" fill="#fff"/>${st}<rect x="20" y="78" width="40" height="164" fill="${s.linear([[0, '#2a1245', 0.25], [0.3, '#fff', 0.35], [0.6, '#fff', 0], [1, '#2a1245', 0.4]], { x1: 0, y1: 0, x2: 1, y2: 0 })}"/></g>`);
  s.add(`<rect x="20" y="78" width="40" height="164" rx="10" fill="none" ${stroke('#6a5aa0', 3.4)}/>`);
  s.add(`<path d="M20,84 Q24,100 28,86 Q34,108 40,86 Q46,100 52,86 Q56,98 60,84" fill="#fff" ${stroke('#8a7ab5', 2.2)}/>`);
  s.add(`<line x1="40" y1="76" x2="40" y2="62" stroke="#3b2147" stroke-width="3" stroke-linecap="round"/>`);
  const glow = s.blur(7);
  s.add(`<ellipse cx="40" cy="40" rx="22" ry="30" fill="#ffd34d" opacity=".5" filter="${glow}"/>`);
  s.add(`<path d="M40,8 C54,26 52,52 40,60 C28,52 26,26 40,8Z" fill="${s.linear([[0, '#ffe56e'], [1, '#ff9a2e']])}" ${stroke('#c2570a', 2.4)}/><path d="M40,30 C46,40 45,52 40,56 C35,52 34,40 40,30Z" fill="#fff6c2"/>`);
  return { w: 80, h: 250, svg: s.toString(), origin: [0.5, 242 / 250] };
}

export function presentsSvg() {
  const s = new Svg(150, 190, 'x');
  const frag = (opts, x, y, scale, prefix) => {
    const f = giftBoxFragment({ ...opts, prefix });
    s.defs.push(f.defs);
    s.add(`<g transform="translate(${x} ${y}) scale(${scale})">${f.body}</g>`);
  };
  frag({ color: '#35c46b', ribbon: '#ffffff' }, 14, 56, 0.68, 'xa');
  frag({ color: '#ff6fa5', ribbon: '#ffd34d' }, 54, 20, 0.5, 'xb');
  frag({ color: '#a98bff', ribbon: '#ff9ac8' }, 0, 105, 0.4, 'xc');
  return { w: 150, h: 190, svg: s.toString(), origin: [0.5, 184 / 190] };
}

export function cupcakeSvg() {
  const s = new Svg(120, 150, 'c');
  const wrap = s.clip(`<path d="M14,70 L106,70 L94,140 Q92,146 86,146 L34,146 Q28,146 26,140Z"/>`);
  let pleats = '';
  for (let x = 14; x < 106; x += 14) pleats += `<rect x="${x}" y="64" width="7" height="90" fill="${LILAC}"/><rect x="${x + 7}" y="64" width="7" height="90" fill="${shade(LILAC, 0.45)}"/>`;
  s.add(`<g clip-path="${wrap}">${pleats}<rect x="10" y="64" width="100" height="90" fill="${s.linear([[0, '#2a1245', 0.22], [0.35, '#fff', 0.3], [0.7, '#fff', 0], [1, '#2a1245', 0.35]], { x1: 0, y1: 0, x2: 1, y2: 0 })}"/></g>`);
  s.add(`<path d="M14,70 L106,70 L94,140 Q92,146 86,146 L34,146 Q28,146 26,140Z" fill="none" ${stroke('#5b4a8a', 3.4)}/>`);
  s.add(`<ellipse cx="60" cy="68" rx="52" ry="14" fill="${s.toy(PINK)}" ${stroke(outlineOf(PINK, 0.55), 3.4)}/>`);
  s.add(`<ellipse cx="60" cy="52" rx="40" ry="14" fill="${s.toy('#ff8fc0')}" ${stroke(outlineOf(PINK, 0.55), 3.4)}/>`);
  s.add(`<ellipse cx="60" cy="38" rx="28" ry="12" fill="${s.toy('#ffa9d2')}" ${stroke(outlineOf(PINK, 0.55), 3.4)}/>`);
  s.add(`<path d="M60,12 C74,18 70,32 60,34 C50,32 46,18 60,12Z" fill="${s.toy('#ffc4e1')}" ${stroke(outlineOf(PINK, 0.55), 3)}/>`);
  s.add(`<circle cx="60" cy="10" r="9.5" fill="${s.sphere('#ff3d5a', { light: 0.5 })}" ${stroke('#8a1530', 2.8)}/><ellipse cx="57" cy="7" rx="2.8" ry="2" fill="#fff" opacity=".7"/>`);
  const sp = ['#ffd23f', '#28c9d4', '#ffffff', '#a98bff'];
  for (let i = 0; i < 9; i++) s.add(`<rect x="${26 + ((i * 37) % 70)}" y="${44 + ((i * 17) % 28)}" width="8" height="3.4" rx="1.7" fill="${sp[i % 4]}" transform="rotate(${(i * 53) % 150} ${30 + ((i * 37) % 70)} ${46 + ((i * 17) % 28)})"/>`);
  return { w: 120, h: 150, svg: s.toString(), origin: [0.5, 146 / 150] };
}

export function cloudSvg() {
  const s = new Svg(260, 120, 'o');
  const fill = s.linear([[0, '#ffffff'], [0.6, '#f6f9ff'], [1, '#cfdcff']]);
  s.add(
    `<g fill="${fill}"><circle cx="70" cy="76" r="36"/><circle cx="116" cy="54" r="44"/><circle cx="170" cy="62" r="38"/><circle cx="212" cy="82" r="30"/><circle cx="130" cy="82" r="38"/><rect x="40" y="76" width="196" height="38" rx="19"/></g>`,
  );
  return { w: 260, h: 120, svg: s.toString(), origin: [0.5, 0.5] };
}

// -------------------------------------------------------------------- EFFETTI
export function fxParts() {
  const out = {};
  {
    const s = new Svg(128, 48, 'w');
    s.add(`<ellipse cx="64" cy="24" rx="62" ry="22" fill="${s.radial([[0, '#2a1245', 0.6], [0.6, '#2a1245', 0.3], [1, '#2a1245', 0]], { cx: 0.5, cy: 0.5, r: 0.5 })}"/>`);
    out['fx-shadow'] = { w: 128, h: 48, svg: s.toString(), origin: [0.5, 0.5] };
  }
  {
    const s = new Svg(256, 256, 'w');
    s.add(`<circle cx="128" cy="128" r="128" fill="${s.radial([[0, '#fff', 1], [0.35, '#fff', 0.55], [1, '#fff', 0]], { cx: 0.5, cy: 0.5, r: 0.5 })}"/>`);
    out['fx-glow'] = { w: 256, h: 256, svg: s.toString(), origin: [0.5, 0.5] };
  }
  {
    const s = new Svg(512, 512, 'w');
    const g = s.radial([[0, '#fff', 0.85], [0.7, '#fff', 0.22], [1, '#fff', 0]], { cx: 256, cy: 256, r: 256, user: true });
    let wedges = '';
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a0 = (i * 2 * Math.PI) / n;
      const a1 = a0 + Math.PI / n;
      wedges += `<path d="M256,256 L${(256 + Math.cos(a0) * 270).toFixed(1)},${(256 + Math.sin(a0) * 270).toFixed(1)} L${(256 + Math.cos(a1) * 270).toFixed(1)},${(256 + Math.sin(a1) * 270).toFixed(1)}Z" fill="${g}"/>`;
    }
    s.add(wedges);
    out['fx-rays'] = { w: 512, h: 512, svg: s.toString(), origin: [0.5, 0.5] };
  }
  {
    const s = new Svg(18, 11, 'w');
    s.add(`<rect x="1" y="1" width="16" height="9" rx="2.5" fill="#fff"/><rect x="1" y="1" width="16" height="4" rx="2" fill="#fff"/><path d="M3,8 L15,8" stroke="#000" stroke-opacity=".12" stroke-width="2"/>`);
    out['fx-confetti'] = { w: 18, h: 11, svg: s.toString(), origin: [0.5, 0.5] };
  }
  {
    const s = new Svg(16, 16, 'w');
    s.add(`<circle cx="8" cy="8" r="7" fill="#fff"/>`);
    out['fx-dot'] = { w: 16, h: 16, svg: s.toString(), origin: [0.5, 0.5] };
  }
  {
    const s = new Svg(52, 52, 'w');
    s.add(`<g transform="translate(26 27)"><path d="${starPath(23, 5, 0.46)}" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></g>`);
    out['fx-star'] = { w: 52, h: 52, svg: s.toString(), origin: [0.5, 0.5] };
  }
  {
    const s = new Svg(52, 52, 'w');
    s.add(`<path d="M26,46 C2,28 10,6 26,16 C42,6 50,28 26,46Z" fill="#fff" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>`);
    out['fx-heart'] = { w: 52, h: 52, svg: s.toString(), origin: [0.5, 0.5] };
  }
  {
    const s = new Svg(40, 40, 'w');
    s.add(`<g transform="translate(20 20)"><path d="${sparklePath(18)}" fill="#fff"/></g>`);
    out['fx-spark'] = { w: 40, h: 40, svg: s.toString(), origin: [0.5, 0.5] };
  }
  {
    const s = new Svg(96, 96, 'w');
    s.add(`<circle cx="48" cy="48" r="48" fill="${s.radial([[0, '#fff', 0.75], [0.6, '#fff', 0.35], [1, '#fff', 0]], { cx: 0.5, cy: 0.5, r: 0.5 })}"/>`);
    out['fx-smoke'] = { w: 96, h: 96, svg: s.toString(), origin: [0.5, 0.5] };
  }
  {
    const s = new Svg(64, 64, 'w');
    s.add(`<circle cx="32" cy="32" r="31" fill="${s.radial([[0, '#fff', 0.18], [0.78, '#fff', 0.3], [0.92, '#fff', 0.6], [1, '#fff', 0]], { cx: 0.5, cy: 0.5, r: 0.5 })}"/>`);
    out['fx-bokeh'] = { w: 64, h: 64, svg: s.toString(), origin: [0.5, 0.5] };
  }
  return out;
}
