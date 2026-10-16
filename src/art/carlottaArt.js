import { Svg, outlineOf, shade, stroke, starPath } from './svgKit.js';

const INK = '#3b2147';

/**
 * Parti della protagonista in stile "giocattolo 3D". Ogni parte è una texture
 * separata (gambe, braccia, busto, testa, volti…) assemblata e animata dal rig
 * in `Player.js`. Il colore di ogni elemento viene da `config.character`.
 *
 * Ogni voce: { w, h, svg, origin: [ox, oy] }   (origin = punto di perno, 0..1)
 */
export function carlottaParts(c) {
  const parts = {};
  const hairGrad = (s) => s.linear([[0, shade(c.hair, 0.32)], [0.5, c.hair], [1, shade(c.hair, -0.32)]], { x1: 0, y1: 0, x2: 0.7, y2: 1 });
  const hairOl = outlineOf(c.hair, 0.6);
  const skinOl = outlineOf(c.skin, 0.55);

  // ---------------------------------------------------------- gambe
  const leg = (front) => {
    const s = new Svg(30, 74, 'l');
    const pantsOl = outlineOf(c.pants, 0.55);
    const shoeOl = outlineOf(c.shoes, 0.5);
    s.add(`<rect x="5" y="2" width="20" height="50" rx="10" fill="${s.cylinder(c.pants)}" ${stroke(pantsOl, 3)}/>`);
    s.add(`<rect x="6" y="42" width="18" height="9" rx="3" fill="${shade(c.pants, -0.22)}"/>`);
    if (front) {
      s.add(`<rect x="1.5" y="49" width="27" height="23" rx="11" fill="${s.toy(c.shoes, { light: 0.1, dark: 0.2 })}" ${stroke(shoeOl, 3)}/>`);
      s.add(`<path d="M6,60 Q15,51 24,60" fill="none" stroke="${shade(c.shoes, -0.3)}" stroke-width="2.4" stroke-linecap="round"/>`);
      s.add(`<path d="M4,65 L26,65 L26,66 Q26,71 21,71 L9,71 Q4,71 4,66Z" fill="${c.outfitAccent}"/>`);
    } else {
      s.add(`<rect x="3.5" y="49" width="23" height="22" rx="10" fill="${s.toy(c.shoes, { light: 0.1, dark: 0.2 })}" ${stroke(shoeOl, 3)}/>`);
      s.add(`<path d="M5,64 L25,64 L25,66 Q25,70.5 20,70.5 L10,70.5 Q5,70.5 5,66Z" fill="${c.outfitAccent}"/>`);
      s.add(`<rect x="12" y="50" width="6" height="9" rx="3" fill="${shade(c.shoes, -0.12)}"/>`);
    }
    return { w: 30, h: 74, svg: s.toString(), origin: [0.5, 5 / 74] };
  };
  parts['c-legBack'] = leg(false);
  parts['c-legFront'] = leg(true);

  // ---------------------------------------------------------- braccio
  {
    const s = new Svg(24, 64, 'm');
    // top senza maniche: braccio nudo, con i bracciali d'argento al polso
    const slOl = c.sleeveless ? skinOl : outlineOf(c.outfit, 0.55);
    s.add(`<rect x="3" y="2" width="18" height="42" rx="9" fill="${s.cylinder(c.sleeveless ? c.skin : c.outfit)}" ${stroke(slOl, 3)}/>`);
    s.add(`<rect x="3.5" y="35" width="17" height="9" rx="4" fill="${c.outfitAccent}" ${stroke(outlineOf(c.outfitAccent, 0.5), 2)}/>`);
    if (c.sleeveless) s.add(`<path d="M4.5,38.5 L19.5,38.5 M4.5,41.5 L19.5,41.5" stroke="${shade(c.outfitAccent, -0.35)}" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>`);
    s.add(`<circle cx="12" cy="50" r="9.5" fill="${s.sphere(c.skin)}" ${stroke(skinOl, 3)}/>`);
    parts['c-arm'] = { w: 24, h: 64, svg: s.toString(), origin: [0.5, 8 / 64] };
  }

  // ---------------------------------------------------------- busto
  const torso = (front) => {
    const s = new Svg(76, 70, 't');
    const ol = outlineOf(c.outfit, 0.58);
    const body = 'M12,6 Q38,0 64,6 Q72,8 71,18 L70,50 Q70,64 56,64 L20,64 Q6,64 6,50 L5,18 Q4,8 12,6Z';
    s.add(`<path d="${body}" fill="${s.toy(c.outfit, { light: 0.28, dark: 0.26 })}" ${stroke(ol, 3.5)}/>`);
    s.add(`<path d="M7,56 L69,56 L68,60 Q66,64 58,64 L18,64 Q10,64 8,60Z" fill="${c.outfitAccent}" opacity=".95"/>`);
    if (front) {
      s.add(`<path d="M26,5 Q38,17 50,5 Q38,0 26,5Z" fill="${c.skin}"/>`);
      s.add(`<path d="M17,7 Q38,28 59,7" fill="none" stroke="${shade(c.outfit, -0.3)}" stroke-width="6.5" stroke-linecap="round"/>`);
      // top a collo alto con arricciature in diagonale (neckline "halter")
      s.add(`<path d="M20,12 Q38,34 58,14" fill="none" stroke="${shade(c.outfit, 0.22)}" stroke-width="2.6" stroke-linecap="round" opacity=".55"/>`);
      s.add(`<path d="M16,28 Q38,44 62,30" fill="none" stroke="${shade(c.outfit, 0.18)}" stroke-width="2.2" stroke-linecap="round" opacity=".4"/>`);
      s.add(`<path d="M36,8 Q42,12 46,8 L44,18 Q40,22 36,18Z" fill="${shade(c.outfit, -0.25)}"/>`);
    } else {
      s.add(
        `<path d="M13,5 Q38,-3 63,5 Q74,17 60,31 Q38,40 16,31 Q2,17 13,5Z" fill="${s.toy(shade(c.outfit, 0.06), { light: 0.25, dark: 0.3 })}" ${stroke(ol, 3.2)}/>`,
      );
      s.add(`<path d="M38,6 Q36,20 38,34" fill="none" stroke="${shade(c.outfit, -0.4)}" stroke-width="2.2" stroke-linecap="round" opacity=".6"/>`);
      s.add(`<path d="M20,22 Q38,36 56,22" fill="none" stroke="${shade(c.outfit, -0.35)}" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>`);
    }
    s.add(`<path d="M12,16 Q10,32 13,48" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" opacity=".22"/>`);
    return { w: 76, h: 70, svg: s.toString(), origin: [0.5, 0.5] };
  };
  parts['c-torsoFront'] = torso(true);
  parts['c-torsoBack'] = torso(false);

  // ---------------------------------------------------------- testa (fronte)
  {
    const s = new Svg(120, 120, 'h');
    const earFill = s.sphere(c.skin);
    s.add(`<circle cx="10" cy="68" r="11" fill="${earFill}" ${stroke(skinOl, 3)}/><circle cx="110" cy="68" r="11" fill="${earFill}" ${stroke(skinOl, 3)}/>`);
    s.add(`<circle cx="11" cy="68" r="5" fill="${shade(c.skin, -0.14)}"/><circle cx="109" cy="68" r="5" fill="${shade(c.skin, -0.14)}"/>`);
    s.add(`<circle cx="60" cy="62" r="50" fill="${s.sphere(c.skin, { cx: 0.38, cy: 0.3, light: 0.3, dark: 0.2 })}" ${stroke(skinOl, 3.5)}/>`);
    s.add(`<path d="M28,96 Q60,118 92,96" fill="none" stroke="${shade(c.skin, -0.25)}" stroke-width="5" stroke-linecap="round" opacity=".35"/>`);
    if (c.earrings) {
      // orecchini dorati scultorei
      for (const x of [8, 112]) {
        s.add(`<path d="M${x},77 C${x - 9},78 ${x - 10},90 ${x - 4},97 C${x},101 ${x + 8},96 ${x + 8},88 C${x + 8},81 ${x + 5},77 ${x},77Z" fill="#f2c230" stroke="#a87400" stroke-width="2.6" stroke-linejoin="round"/>`);
        s.add(`<path d="M${x - 3},82 Q${x - 5},89 ${x - 2},94" fill="none" stroke="#fff3b0" stroke-width="2.2" stroke-linecap="round" opacity=".85"/>`);
      }
    }
    parts['c-headFront'] = { w: 120, h: 120, svg: s.toString(), origin: [0.5, 0.52] };
  }

  // ---------------------------------------------------------- capelli (fronte)
  {
    const s = new Svg(120, 120, 'f');
    // capelli lisci con la riga in mezzo: due bande che incorniciano il viso fino al mento
    const hair =
      'M8,70 C0,24 32,3 60,3 C88,3 120,24 112,70 L111,104 Q106,110 99,102 L97,58 C94,38 80,26 60,26 C40,26 26,38 23,58 L21,102 Q14,110 9,104Z';
    s.add(`<path d="${hair}" fill="${hairGrad(s)}" ${stroke(hairOl, 3.5)}/>`);
    s.add(`<path d="M60,27 Q57,15 60,6" fill="none" stroke="${shade(c.hair, -0.5)}" stroke-width="2.6" stroke-linecap="round" opacity=".8"/>`);
    s.add(`<path d="M24,30 Q44,10 70,12" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" opacity=".3"/>`);
    s.add(`<path d="M14,70 Q16,88 15,98 M106,70 Q104,88 105,98" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" opacity=".2"/>`);
    if (c.glasses) {
      // occhiali da sole scuri spinti sulla testa
      const frame = '#23232b';
      const lens = (cx) =>
        `<ellipse cx="${cx}" cy="17" rx="14" ry="9.5" fill="#3a4152" stroke="${frame}" stroke-width="3.6"/>` +
        `<path d="M${cx - 8},13 Q${cx - 2},9.5 ${cx + 5},11" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".5"/>`;
      s.add(`<path d="M18,18 Q8,24 10,36 M102,18 Q112,24 110,36" fill="none" stroke="${frame}" stroke-width="3.2" stroke-linecap="round"/>`);
      s.add(lens(40) + lens(80));
      s.add(`<path d="M54,15 Q60,11 66,15" fill="none" stroke="${frame}" stroke-width="3.2" stroke-linecap="round"/>`);
    }
    parts['c-hairFront'] = { w: 120, h: 120, svg: s.toString(), origin: [0.5, 0.52] };
  }

  // ---------------------------------------------------------- massa di capelli dietro la testa (vista frontale)
  {
    const s = new Svg(140, 140, 'g');
    // massa di capelli lisci che scende fino alle spalle
    s.add(
      `<path d="M10,72 C6,24 38,6 70,6 C102,6 134,24 130,72 L133,124 Q130,136 116,134 Q104,132 104,112 L36,112 Q36,132 24,134 Q10,136 7,124Z" fill="${hairGrad(s)}" ${stroke(hairOl, 3.5)}/>`,
    );
    s.add(`<path d="M22,96 Q20,116 24,128 M118,96 Q120,116 116,128" fill="none" stroke="${shade(c.hair, -0.45)}" stroke-width="2.6" stroke-linecap="round" opacity=".5"/>`);
    parts['c-hairMass'] = { w: 140, h: 140, svg: s.toString(), origin: [0.5, 0.5] };
  }

  // ---------------------------------------------------------- testa (retro)
  {
    const s = new Svg(120, 120, 'k');
    const ear = s.sphere(c.skin);
    s.add(`<circle cx="9" cy="74" r="9" fill="${ear}" ${stroke(skinOl, 3)}/><circle cx="111" cy="74" r="9" fill="${ear}" ${stroke(skinOl, 3)}/>`);
    s.add(`<path d="M12,80 Q8,114 30,117 L90,117 Q112,114 108,80Z" fill="${hairGrad(s)}" ${stroke(hairOl, 3.5)}/>`);
    s.add(`<circle cx="60" cy="62" r="50" fill="${s.sphere(c.hair, { cx: 0.4, cy: 0.28, light: 0.38, dark: 0.34 })}" ${stroke(hairOl, 3.5)}/>`);
    s.add(`<path d="M22,40 Q60,2 98,40" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".28"/>`);
    s.add(`<path d="M60,14 Q57,30 60,46" fill="none" stroke="${shade(c.hair, -0.45)}" stroke-width="3" stroke-linecap="round" opacity=".7"/>`);
    s.add(`<path d="M26,84 Q32,100 44,106 M94,84 Q88,100 76,106" fill="none" stroke="${shade(c.hair, -0.4)}" stroke-width="2.6" stroke-linecap="round" opacity=".5"/>`);
    parts['c-headBack'] = { w: 120, h: 120, svg: s.toString(), origin: [0.5, 0.52] };
  }

  // ---------------------------------------------------------- coda di cavallo
  {
    const s = new Svg(56, 114, 'p');
    // ciocca di capelli lisci che ondeggia durante la corsa (al posto della coda di cavallo)
    s.add(`<path d="M12,6 C4,40 8,84 24,106 Q28,110 32,106 C48,84 52,40 44,6Z" fill="${hairGrad(s)}" ${stroke(hairOl, 3.5)}/>`);
    s.add(`<path d="M20,22 Q15,60 24,94" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".28"/>`);
    s.add(`<path d="M35,22 Q39,58 31,92" fill="none" stroke="${shade(c.hair, -0.4)}" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>`);
    parts['c-ponytail'] = { w: 56, h: 114, svg: s.toString(), origin: [0.5, 13 / 114] };
  }

  // ---------------------------------------------------------- cappellino da festa
  if (c.accessory === 'partyHat') {
    const s = new Svg(80, 92, 'z');
    const ol = outlineOf(c.accessoryColor, 0.55);
    s.add(`<path d="M10,78 L40,12 L70,78 Q40,92 10,78Z" fill="${s.toy(c.accessoryColor, { light: 0.35, dark: 0.3 })}" ${stroke(ol, 3.5)}/>`);
    s.add(`<path d="M21.5,52 L58.5,52 L63.8,64 L16.2,64Z" fill="${c.outfitAccent}" opacity=".95"/>`);
    s.add(`<path d="M31.5,30 L48.5,30 L52,38 L28,38Z" fill="${c.outfitAccent}" opacity=".95"/>`);
    s.add(`<circle cx="30" cy="46" r="2.8" fill="#fff"/><circle cx="50" cy="44" r="2.8" fill="#fff"/><circle cx="40" cy="73" r="2.8" fill="#fff"/><circle cx="26" cy="72" r="2.4" fill="#fff"/><circle cx="55" cy="72" r="2.4" fill="#fff"/>`);
    s.add(`<path d="M10,78 Q40,92 70,78" fill="none" stroke="${c.outfitAccent}" stroke-width="5" stroke-linecap="round"/>`);
    s.add(`<path d="M22,62 Q30,34 38,18" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".35"/>`);
    s.add(`<circle cx="40" cy="12" r="9.5" fill="${s.sphere(c.outfitAccent, { light: 0.5 })}" ${stroke(outlineOf(c.outfitAccent, 0.55), 3)}/>`);
    parts['c-hat'] = { w: 80, h: 92, svg: s.toString(), origin: [0.5, 80 / 92] };
  }

  // ---------------------------------------------------------- volti
  const brow = outlineOf(c.hair, 0.5);
  const blush = (op = 0.45, color = '#ff7aa8') =>
    `<ellipse cx="27" cy="84" rx="9.5" ry="5.8" fill="${color}" opacity="${op}"/><ellipse cx="93" cy="84" rx="9.5" ry="5.8" fill="${color}" opacity="${op}"/>`;
  const eye = (cx, cy = 66) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="8.6" ry="11.8" fill="${INK}"/><circle cx="${cx - 2.6}" cy="${cy - 5}" r="3.8" fill="#fff"/><circle cx="${cx + 3}" cy="${cy + 5}" r="1.9" fill="#fff" opacity=".9"/>`;
  // lentiggini su guance e naso
  const freckles = c.freckles
    ? `<g fill="${shade(c.skin, -0.32)}" opacity=".6">` +
      [[33, 80], [38, 85], [44, 81], [29, 86], [87, 80], [82, 85], [76, 81], [91, 86], [55, 76], [60, 74], [65, 76], [58, 80], [62, 80]]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4"/>`)
        .join('') +
      '</g>'
    : '';
  const face = (inner) => {
    const s = new Svg(120, 120, 'v');
    s.add(freckles + inner);
    return { w: 120, h: 120, svg: s.toString(), origin: [0.5, 0.52] };
  };
  const line = (d, w = 3.4, col = INK) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

  parts['c-faceNeutral'] = face(
    blush() + eye(42) + eye(78) + line('M33,50 Q42,45 51,49', 3.6, brow) + line('M69,49 Q78,45 87,50', 3.6, brow) + line('M50,90 Q60,98 70,90'),
  );
  parts['c-faceHappy'] = face(
    blush(0.6) +
      line('M31,70 Q42,55 53,70', 4.8) +
      line('M67,70 Q78,55 89,70', 4.8) +
      line('M33,48 Q42,41 51,46', 3.6, brow) +
      line('M69,46 Q78,41 87,48', 3.6, brow) +
      `<path d="M43,85 Q60,116 77,85 Q60,91 43,85Z" fill="#7a1633" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>` +
      `<path d="M50,100 Q60,92 70,100 Q60,110 50,100Z" fill="#ff7a9a"/>`,
  );
  parts['c-faceShock'] = face(
    `<ellipse cx="42" cy="64" rx="11.5" ry="14.5" fill="#fff" stroke="${INK}" stroke-width="3.2"/><ellipse cx="78" cy="64" rx="11.5" ry="14.5" fill="#fff" stroke="${INK}" stroke-width="3.2"/>` +
      `<circle cx="43" cy="66" r="4.2" fill="${INK}"/><circle cx="77" cy="66" r="4.2" fill="${INK}"/><circle cx="41.6" cy="64.4" r="1.4" fill="#fff"/><circle cx="75.6" cy="64.4" r="1.4" fill="#fff"/>` +
      line('M29,43 Q42,32 55,41', 3.8, brow) +
      line('M65,41 Q78,32 91,43', 3.8, brow) +
      `<ellipse cx="60" cy="95" rx="8.5" ry="11.5" fill="#5a1030" stroke="${INK}" stroke-width="3.2"/><ellipse cx="60" cy="101" rx="5" ry="4" fill="#ff7a9a"/>` +
      `<path d="M101,26 Q110,42 101,52 Q92,42 101,26Z" fill="#9fdcff" stroke="#3a86c8" stroke-width="2.4" stroke-linejoin="round"/><ellipse cx="98" cy="40" rx="1.8" ry="3" fill="#fff" opacity=".8"/>`,
  );
  parts['c-faceDisgust'] = face(
    blush(0.5, '#9be15d') +
      line('M30,67 Q42,59 54,67', 4.8) +
      line('M66,67 Q78,59 90,67', 4.8) +
      line('M28,51 L53,45', 3.8, brow) +
      line('M92,51 L67,45', 3.8, brow) +
      line('M42,92 Q49,85 56,92 Q62,99 69,92 Q73,89 78,92', 3.6) +
      `<path d="M53,95 Q60,121 68,95Z" fill="#ff7a9a" stroke="${INK}" stroke-width="2.8" stroke-linejoin="round"/><path d="M60,98 L60,108" stroke="#d94f78" stroke-width="2" stroke-linecap="round"/>`,
  );

  // ---------------------------------------------------------- fumetti di reazione
  const bubble = (icon) => {
    const s = new Svg(64, 66, 'e');
    s.add(`<path d="M32,3 C48,3 61,14 61,29 C61,43 49,53 35,53 L31,63 L26,52 C13,49 3,40 3,29 C3,14 16,3 32,3Z" fill="#fff" ${stroke(INK, 3)}/>`);
    s.add(icon);
    return { w: 64, h: 66, svg: s.toString(), origin: [0.5, 1] };
  };
  parts['c-emoteHeart'] = bubble(`<path d="M32,43 C13,29 21,12 32,21 C43,12 51,29 32,43Z" fill="#ff4f8b" ${stroke('#a3205a', 2.4)}/><ellipse cx="25" cy="21" rx="3.6" ry="2" fill="#fff" opacity=".7" transform="rotate(-30 25 21)"/>`);
  parts['c-emoteStar'] = bubble(`<g transform="translate(32 28)"><path d="${starPath(17, 5, 0.46)}" fill="#ffd34d" ${stroke('#b9830a', 2.4)}/><path d="${starPath(6, 5, 0.46)}" fill="#fff" opacity=".6"/></g>`);
  parts['c-emoteShock'] = bubble(`<rect x="27.5" y="11" width="9" height="22" rx="4.5" fill="#ff4f5e" ${stroke('#a3202c', 2)}/><circle cx="32" cy="41" r="5" fill="#ff4f5e" ${stroke('#a3202c', 2)}/>`);
  parts['c-emoteEw'] = bubble(
    [20, 32, 44]
      .map((x, i) => `<path d="M${x},${42 - i * 2} Q${x - 6},${34 - i * 2} ${x},${27 - i * 2} Q${x + 6},${19 - i * 2} ${x},${11 - i * 2}" fill="none" stroke="#6fbf2a" stroke-width="4.2" stroke-linecap="round"/>`)
      .join(''),
  );

  return parts;
}
