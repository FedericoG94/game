import { carlottaParts } from './carlottaArt.js';
import { giftBoxSvg, giftOpeningSvg, BIG_GIFT_STYLE, BOX_SIZE, BOX_FOOT_Y } from './giftArt.js';
import {
  hurdleSvg,
  bannerSvg,
  cakeSvg,
  gateSvg,
  balloonsSvg,
  lollipopSvg,
  candleSvg,
  presentsSvg,
  cupcakeSvg,
  cloudSvg,
  fxParts,
} from './propsArt.js';

/** Chiave di texture del pacco di un regalo (dipende dalla categoria o da un aspetto "misterioso"). */
export function boxKeyFor(gift, categoryHints = true) {
  if (!categoryHints) {
    let h = 0;
    for (const ch of gift.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return `box-mystery-${h % MYSTERY_STYLES.length}`;
  }
  return `box-${gift.category}${gift.rarity === 'rare' ? '-rare' : ''}`;
}

const MYSTERY_STYLES = [
  { color: '#ff6fa5', ribbon: '#ffd34d' },
  { color: '#28c9d4', ribbon: '#ff6fa5' },
  { color: '#a98bff', ribbon: '#ffd34d' },
  { color: '#ffb347', ribbon: '#ffffff' },
];

/**
 * Catalogo completo dell'arte procedurale: chiave → { w, h, svg, origin }.
 * Pura funzione di stringhe: funziona anche fuori dal browser (test, script).
 */
export function buildArtCatalog({ character, categories, gifts, categoryHints = true }) {
  const art = {};
  Object.assign(art, carlottaParts(character));
  Object.assign(art, fxParts());

  const boxOrigin = [0.5, BOX_FOOT_Y / BOX_SIZE];
  const box = (key, opts, include) => {
    art[key] = { w: BOX_SIZE, h: BOX_SIZE, svg: giftBoxSvg(opts, include), origin: boxOrigin };
  };

  if (categoryHints) {
    const needed = new Set(gifts.map((g) => boxKeyFor(g, true)));
    for (const [id, cat] of Object.entries(categories)) {
      for (const rare of [false, true]) {
        const key = `box-${id}${rare ? '-rare' : ''}`;
        if (needed.has(key)) box(key, { color: cat.color, ribbon: cat.ribbon, symbol: cat.symbol, rare });
      }
    }
  } else {
    MYSTERY_STYLES.forEach((st, i) => box(`box-mystery-${i}`, { ...st, symbol: 'question' }));
  }

  // Grande regalo finale: pezzi separati e sovrapponibili
  box('big-body', BIG_GIFT_STYLE, ['body']);
  box('big-ribbon', BIG_GIFT_STYLE, ['ribbonBody']);
  box('big-lid', BIG_GIFT_STYLE, ['lid']);
  box('big-bow', BIG_GIFT_STYLE, ['bow']);
  box('big-shine', BIG_GIFT_STYLE, ['shine']);
  art['big-open'] = { w: BOX_SIZE, h: BOX_SIZE, svg: giftOpeningSvg(BIG_GIFT_STYLE), origin: boxOrigin };

  art['ob-hurdle'] = hurdleSvg();
  art['ob-banner'] = bannerSvg();
  art['ob-cake'] = cakeSvg();
  art['ob-gate'] = gateSvg();
  art['sc-balloons'] = balloonsSvg();
  art['sc-lollipop-a'] = lollipopSvg('#ff6fa5', '#ffffff');
  art['sc-lollipop-b'] = lollipopSvg('#28c9d4', '#ffffff');
  art['sc-candle'] = candleSvg();
  art['sc-presents'] = presentsSvg();
  art['sc-cupcake'] = cupcakeSvg();
  art['sc-cloud'] = cloudSvg();
  return art;
}

export const SCENERY_KEYS = ['sc-balloons', 'sc-lollipop-a', 'sc-candle', 'sc-presents', 'sc-cupcake', 'sc-lollipop-b'];
