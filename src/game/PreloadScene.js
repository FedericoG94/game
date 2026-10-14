import Phaser from 'phaser';
import { app } from './app.js';
import { assetUrl } from './assetUrl.js';
import { adoptTexture, bakeCatalog, bakeOne } from './artBank.js';
import { buildArtCatalog } from '../art/index.js';
import { placeholderPortraitSvg } from '../art/placeholderPortrait.js';
import { svgToDataUri } from '../art/svgKit.js';

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
    for (const g of app.gifts) {
      if (g.image) this.load.image(`gift-${g.id}`, assetUrl(g.image));
    }
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

  async finish() {
    const { settings } = app;
    const catalog = buildArtCatalog({
      character: settings.character,
      categories: app.categories,
      gifts: app.gifts,
      categoryHints: settings.gifts.categoryHints,
    });
    await bakeCatalog(this.textures, catalog, (done, total) => this.setProgress(0.6 + (done / total) * 0.35));

    for (const [key, path] of Object.entries(settings.assets.overrides)) {
      const tmp = `ovr:${key}`;
      if (!catalog[key]) console.warn(`[Carlotta's Gift Run] assets.overrides: la chiave "${key}" non esiste (vedi /dev/gallery.html)`);
      else if (this.textures.exists(tmp) && !this.failed.has(tmp)) adoptTexture(this.textures, tmp, key, catalog[key]);
      else console.warn(`[Carlotta's Gift Run] Impossibile caricare ${path}: uso l'arte di partenza per "${key}".`);
    }

    for (const gift of app.gifts) {
      const key = `gift-${gift.id}`;
      const loaded = Boolean(gift.image) && this.textures.exists(key) && !this.failed.has(key);
      if (loaded) {
        app.giftImages.set(gift.id, assetUrl(gift.image));
        continue;
      }
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
