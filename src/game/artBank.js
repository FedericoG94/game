import { TEX_SCALE, svgToDataUri } from '../art/svgKit.js';

/**
 * "Banca" dell'arte: trasforma gli SVG procedurali in texture Phaser e ricorda
 * dimensioni di progetto e punto di perno di ciascuna.
 *
 * Le texture sono cotte in canvas a potenza di due (richiesto da Phaser per le
 * mipmap, che evitano lo sfarfallio degli oggetti lontani che si rimpiccioliscono)
 * e il frame viene ritagliato alla dimensione reale.
 */
const meta = new Map();

const nextPow2 = (n) => 2 ** Math.ceil(Math.log2(Math.max(2, n)));

export function artMeta(key) {
  const m = meta.get(key);
  if (!m) throw new Error(`Texture "${key}" non registrata nella banca dell'arte`);
  return m;
}

export const hasArt = (key) => meta.has(key);

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('SVG non decodificabile'));
    img.src = src;
  });
}

/** Cuoce un singolo SVG in una texture Phaser. */
export async function bakeOne(textures, key, item, scale = TEX_SCALE) {
  const w = Math.round(item.w * scale);
  const h = Math.round(item.h * scale);
  const img = await loadImage(svgToDataUri(item.svg));
  const canvas = document.createElement('canvas');
  canvas.width = nextPow2(w);
  canvas.height = nextPow2(h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  if (textures.exists(key)) textures.remove(key);
  const tex = textures.addCanvas(key, canvas);
  tex.get().setSize(w, h, 0, 0);
  meta.set(key, { w: item.w, h: item.h, origin: item.origin ?? [0.5, 0.5], scale });
  return tex;
}

/**
 * Sostituisce una texture procedurale con un'immagine caricata dal file dell'utente (già nel
 * gestore texture con la chiave `tmpKey`). La scala viene ricavata dalla larghezza reale del
 * file rispetto al disegno originale, quindi l'immagine può avere qualsiasi risoluzione.
 */
export function adoptTexture(textures, tmpKey, key, item) {
  const source = textures.get(tmpKey).getSourceImage();
  if (textures.exists(key)) textures.remove(key);
  textures.renameTexture(tmpKey, key);
  meta.set(key, { w: item.w, h: item.h, origin: item.origin ?? [0.5, 0.5], scale: source.width / item.w });
}

/** Cuoce tutto il catalogo in parallelo. `onProgress(done, total)` è opzionale. */
export async function bakeCatalog(textures, catalog, onProgress) {
  const entries = Object.entries(catalog);
  let done = 0;
  await Promise.all(
    entries.map(async ([key, item]) => {
      await bakeOne(textures, key, item);
      onProgress?.(++done, entries.length);
    }),
  );
}

/**
 * Crea un'immagine con la texture indicata e il perno corretto.
 * `pxPerUnit` = quanti pixel dello schermo vale un'unità di progetto del disegno.
 */
export function makeArt(scene, key, x = 0, y = 0, pxPerUnit = 1) {
  const m = artMeta(key);
  const img = scene.add.image(x, y, key).setOrigin(m.origin[0], m.origin[1]);
  img.setScale(pxPerUnit / m.scale);
  return img;
}

/** Scala di un'immagine d'arte per un dato px per unità di progetto. */
export function artScale(key, pxPerUnit) {
  return pxPerUnit / artMeta(key).scale;
}

/** Applica texture, perno e scala a un'immagine esistente (riuso dal pool). */
export function setArt(img, key, pxPerUnit) {
  const m = artMeta(key);
  img.setTexture(key).setOrigin(m.origin[0], m.origin[1]).setScale(pxPerUnit / m.scale);
  return img;
}
