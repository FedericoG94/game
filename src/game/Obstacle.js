import { artMeta, makeArt } from './artBank.js';
import { clamp } from './rng.js';

/** Larghezza in corsie e texture di ogni ostacolo (i pali dei traguardi stanno appena fuori dai cordoli). */
const SPECS = {
  block: { key: 'ob-cake', lanes: 1.18, width: 190, posts: 0 },
  hurdle: { key: 'ob-hurdle', lanes: 3.55, width: 340, posts: 1.65 },
  banner: { key: 'ob-banner', lanes: 4.21, width: 360, posts: 1.65 },
};

/** Vista di un ostacolo: torta gigante (da schivare), barriera di nastri (da saltare), striscione (da scivolare). */
export class ObstacleView {
  constructor(scene) {
    this.body = makeArt(scene, 'ob-cake', 0, 0, 1).setVisible(false);
    this.shadowA = makeArt(scene, 'fx-shadow', 0, 0, 1).setVisible(false);
    this.shadowB = makeArt(scene, 'fx-shadow', 0, 0, 1).setVisible(false);
    this.entity = null;
    this.popT = -1;
  }

  /** Dopo l'urto l'ostacolo si gonfia e svanisce in un attimo. */
  pop() {
    if (this.popT < 0) this.popT = 0;
  }

  bind(entity) {
    this.entity = entity;
    this.popT = -1;
    this.spec = SPECS[entity.obstacleType];
    const m = artMeta(this.spec.key);
    this.body.setTexture(this.spec.key).setOrigin(m.origin[0], m.origin[1]).setVisible(true);
    this.shadowA.setVisible(true);
    this.shadowB.setVisible(this.spec.posts > 0);
    return this;
  }

  place(proj, z, spawnZ, dt = 0) {
    const { laneW } = proj.layout;
    const { entity, spec } = this;
    const s = proj.scale(z);
    const x = spec.posts ? proj.xOffset(0, z) : proj.x(entity.lane, z);
    const y = proj.y(z);
    const m = artMeta(spec.key);
    let alpha = clamp((spawnZ - z) / 14, 0, 1) * clamp(1 + z / 3.5, 0, 1);
    let grow = 1;
    if (this.popT >= 0) {
      this.popT += dt;
      const k = clamp(this.popT / 0.32, 0, 1);
      alpha *= 1 - k;
      grow = 1 + 0.45 * k;
    }
    const scale = (((laneW * spec.lanes) / spec.width) * s * grow) / m.scale;
    const depth = 500 - z;
    this.body.setPosition(x, y).setScale(scale).setAlpha(alpha).setDepth(depth);

    const sm = artMeta('fx-shadow');
    if (spec.posts) {
      const w = (laneW * 0.55 * s) / 128 / sm.scale;
      this.shadowA.setPosition(proj.xOffset(-spec.posts, z), y).setScale(w).setAlpha(0.7 * alpha).setDepth(depth - 0.2);
      this.shadowB.setPosition(proj.xOffset(spec.posts, z), y).setScale(w).setAlpha(0.7 * alpha).setDepth(depth - 0.2);
    } else {
      const w = (laneW * 1.3 * s) / 128 / sm.scale;
      this.shadowA.setPosition(x, y).setScale(w).setAlpha(0.8 * alpha).setDepth(depth - 0.2);
    }
  }

  release() {
    this.entity = null;
    this.body.setVisible(false);
    this.shadowA.setVisible(false);
    this.shadowB.setVisible(false);
  }

  destroy() {
    this.body.destroy();
    this.shadowA.destroy();
    this.shadowB.destroy();
  }
}

export class ObstaclePool {
  constructor(scene) {
    this.scene = scene;
    this.free = [];
    this.active = new Map();
  }

  acquire(entity) {
    const view = this.free.pop() ?? new ObstacleView(this.scene);
    this.active.set(entity.id, view.bind(entity));
    return view;
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
