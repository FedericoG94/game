import Phaser from 'phaser';
import { artMeta, makeArt } from './artBank.js';
import { boxKeyFor } from '../art/index.js';
import { clamp } from './rng.js';

const BOX_UNITS = 200;

/**
 * Presentazione di un pacco sul percorso: scatola con ombra a terra, leggero
 * "galleggiare" e dondolio, scintilla orbitante per i regali rari.
 * Riutilizza gli sprite tramite `GiftPool` invece di crearli e distruggerli.
 */
export class GiftView {
  constructor(scene) {
    this.shadow = makeArt(scene, 'fx-shadow', 0, 0, 1).setVisible(false);
    this.box = makeArt(scene, 'big-body', 0, 0, 1).setVisible(false);
    this.glint = makeArt(scene, 'fx-spark', 0, 0, 1).setVisible(false).setBlendMode(Phaser.BlendModes.ADD);
    this.entity = null;
    this.rare = false;
  }

  bind(entity, categoryHints) {
    this.entity = entity;
    const key = boxKeyFor(entity.gift, categoryHints);
    const m = artMeta(key);
    this.box.setTexture(key).setOrigin(m.origin[0], m.origin[1]);
    this.boxKey = key;
    this.rare = entity.gift.rarity === 'rare';
    this.shadow.setVisible(true);
    this.box.setVisible(true).setAlpha(1);
    this.glint.setVisible(this.rare).setTint(0xfff1a0);
    return this;
  }

  /** Posiziona il pacco secondo la prospettiva; `z` è la distanza davanti alla protagonista. */
  place(proj, z, time, spawnZ) {
    const { laneW } = proj.layout;
    const { entity } = this;
    const s = proj.scale(z);
    const x = proj.x(entity.lane, z);
    const y = proj.y(z);
    const seed = entity.id * 1.7;
    const bob = Math.sin(time * 3.2 + seed);
    const hover = laneW * (0.09 + bob * 0.03) * s;
    const alpha = clamp((spawnZ - z) / 14, 0, 1) * clamp(1 + z / 3, 0, 1);
    const m = artMeta(this.boxKey);
    const boxScale = ((laneW * 0.88) / BOX_UNITS) * s / m.scale;

    this.box.setPosition(x, y - hover).setScale(boxScale).setRotation(Math.sin(time * 2.1 + seed) * 0.07).setAlpha(alpha);
    const sm = artMeta('fx-shadow');
    const shadowW = ((laneW * 0.95) / 128) * s * (1 - bob * 0.06) / sm.scale;
    this.shadow.setPosition(x, y).setScale(shadowW).setAlpha(0.8 * alpha);
    const depth = 500 - z;
    this.box.setDepth(depth);
    this.shadow.setDepth(depth - 0.2);

    if (this.rare) {
      const a = time * 2.4 + seed;
      const gm = artMeta('fx-spark');
      const gs = ((laneW * 0.32) / 40) * s / gm.scale;
      this.glint
        .setPosition(x + Math.cos(a) * laneW * 0.42 * s, y - hover - laneW * 0.55 * s + Math.sin(a * 1.3) * laneW * 0.16 * s)
        .setScale(gs * (0.7 + 0.5 * Math.sin(time * 6 + seed)))
        .setRotation(a)
        .setAlpha(alpha)
        .setDepth(depth + 0.1);
    }
    return { x, y: y - hover - laneW * 0.36 * s, footY: y - hover, boxScale };
  }

  release() {
    this.entity = null;
    this.box.setVisible(false);
    this.shadow.setVisible(false);
    this.glint.setVisible(false);
  }

  destroy() {
    this.box.destroy();
    this.shadow.destroy();
    this.glint.destroy();
  }
}

export class GiftPool {
  constructor(scene) {
    this.scene = scene;
    this.free = [];
    this.active = new Map();
  }

  acquire(entity, categoryHints) {
    const view = this.free.pop() ?? new GiftView(this.scene);
    this.active.set(entity.id, view.bind(entity, categoryHints));
    return view;
  }

  get(entityId) {
    return this.active.get(entityId);
  }

  release(entityId) {
    const view = this.active.get(entityId);
    if (!view) return;
    view.release();
    this.active.delete(entityId);
    this.free.push(view);
  }

  destroy() {
    for (const v of this.active.values()) v.destroy();
    for (const v of this.free) v.destroy();
    this.active.clear();
    this.free.length = 0;
  }
}
