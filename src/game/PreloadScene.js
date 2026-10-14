import Phaser from 'phaser';
import { app } from './app.js';
import { assetUrl } from './assetUrl.js';
import { adoptTexture, bakeCatalog, bakeOne } from './artBank.js';
import { buildArtCatalog } from '../art/index.js';
import { placeholderPortraitSvg } from '../art/placeholderPortrait.js';
import { svgToDataUri } from '../art/svgKit.js';
import { decryptBytes, encryptedPath } from '../crypto/vault.js';

const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif' };
const imageMime = (path) => MIME[String(path).split('.').pop().toLowerCase()] ?? 'image/png';

function loadImageElement(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Carica le immagini dei regali dai file locali e "cuoce" tutta l'arte procedurale in texture.
 * Se un'immagine manca o non si carica, genera al suo posto un ritratto segnaposto coerente:
 * il gioco non si blocca mai per un file mancante.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    this.failed = new Set();
    this.fill = document.getElementById('loading-fill');
    this.setProgress(0.03);
    this.load.on('progress', (v) => this.setProgress(0.03 + v * 0.55));
    this.load.on('loaderror', (file) => {
      this.failed.add(file.key);
      console.warn(`[Carlotta's Gift Run] Immagine non caricata: ${file.url}. Uso un segnaposto.`);
    });
    // le foto dei regali non passano da qui: sono cifrate e le apre `loadGiftImages()`
    // immagini che l'utente ha scelto al posto dell'arte procedurale (config.assets.overrides)
    for (const [key, path] of Object.entries(app.settings.assets.overrides)) this.load.image(`ovr:${key}`, assetUrl(path));
  }

  setProgress(v) {
    if (this.fill) this.fill.style.width = `${Math.round(Math.min(1, v) * 100)}%`;
  }

  create() {
    this.finish().catch((err) => {
      console.error(err);
      const text = document.querySelector('#loading .loading-text');
      if (text) text.textContent = 'Ops, qualcosa è andato storto nel caricamento. Ricarica la pagina.';
    });
  }

  /**
   * Carica la foto di ogni regalo: prima la versione cifrata (`assets/enc/`), che si apre con la
   * chiave ricavata dalla parola d'ordine; se non c'è, il file in chiaro (i segnaposto pubblici).
   * Se nessuna delle due funziona il regalo resta senza voce in `app.giftImages` e riceve il segnaposto.
   */
  async loadGiftImages() {
    const gifts = app.gifts.filter((g) => g.image);
    let done = 0;
    await Promise.all(
      gifts.map(async (gift) => {
        const url = (await this.openEncrypted(gift.image)) ?? assetUrl(gift.image);
        const img = await loadImageElement(url);
        if (img) {
          const key = `gift-${gift.id}`;
          if (this.textures.exists(key)) this.textures.remove(key);
          this.textures.addImage(key, img);
          app.giftImages.set(gift.id, url);
        } else {
          console.warn(`[Carlotta's Gift Run] Immagine non caricata: ${gift.image}. Uso un segnaposto.`);
          if (url.startsWith('blob:')) URL.revokeObjectURL(url);
        }
        this.setProgress(0.03 + (++done / gifts.length) * 0.55);
      }),
    );
  }

  /** Indirizzo `blob:` della foto decifrata, oppure null se manca il file cifrato o la chiave non lo apre. */
  async openEncrypted(logicalPath) {
    if (!app.vaultKey) return null;
    try {
      const res = await fetch(assetUrl(await encryptedPath(logicalPath)));
      if (!res.ok) return null;
      const bytes = await decryptBytes(app.vaultKey, await res.arrayBuffer());
      return URL.createObjectURL(new Blob([bytes], { type: imageMime(logicalPath) }));
    } catch {
      return null; // file assente (in sviluppo il server risponde con la pagina), chiave errata o file alterato
    }
  }

  async finish() {
    const { settings } = app;
    await this.loadGiftImages();
    const catalog = buildArtCatalog({
      character: settings.character,
      categories: app.categories,
      gifts: app.gifts,
      categoryHints: settings.gifts.categoryHints,
    });
    await bakeCatalog(this.textures, catalog, (done, total) => this.setProgress(0.6 + (done / total) * 0.35));
    this.setProgress(0.95);

    for (const [key, path] of Object.entries(settings.assets.overrides)) {
      const tmp = `ovr:${key}`;
      if (!catalog[key]) console.warn(`[Carlotta's Gift Run] assets.overrides: la chiave "${key}" non esiste (vedi /dev/gallery.html)`);
      else if (this.textures.exists(tmp) && !this.failed.has(tmp)) adoptTexture(this.textures, tmp, key, catalog[key]);
      else console.warn(`[Carlotta's Gift Run] Impossibile caricare ${path}: uso l'arte di partenza per "${key}".`);
    }

    for (const gift of app.gifts) {
      const key = `gift-${gift.id}`;
      if (app.giftImages.has(gift.id)) continue; // foto reale già caricata da loadGiftImages()
      const cat = app.categories[gift.category] ?? {};
      const svg = placeholderPortraitSvg({ name: gift.name, color: cat.color, symbol: cat.symbol, type: gift.type, size: 256 });
      await bakeOne(this.textures, key, { w: 256, h: 256, svg, origin: [0.5, 0.5] }, 1);
      app.giftImages.set(gift.id, svgToDataUri(svg));
    }

    this.setProgress(1);
    const loading = document.getElementById('loading');
    loading?.classList.add('is-hidden');
    window.setTimeout(() => loading?.remove(), 500);
    this.scene.start('Menu');
  }
}
