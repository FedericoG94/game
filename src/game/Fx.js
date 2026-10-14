import Phaser from 'phaser';
import { artMeta } from './artBank.js';

const PARTY = [0xff6fa5, 0xffd34d, 0x28c9d4, 0xa98bff, 0xffffff, 0x7be37b, 0xff9a3c];
const GOLD = [0xffc928, 0xffe27a, 0xfff3b0, 0xffffff, 0xff9ccd];
const DARK = [0x3b2147, 0x5a3a7a, 0x2c6e49, 0x6b3f6b, 0x8a8a9a];
const SMOKE = [0x6b4a8a, 0x4f6b3a, 0x8a7a9a];
const HEART = [0xff4f8b, 0xff8fc0, 0xffffff, 0xff6fa5];
const DEPTH = 2000;

/**
 * Effetti visivi: coriandoli, cuori, stelle, fumo, scintille, glitch leggero e testi fluttuanti.
 * Gli emettitori sono creati una volta e riutilizzati; il numero di particelle vive
 * è limitato e scala con `quality` (0.3..1) e con `prefers-reduced-motion`.
 */
export class Fx {
  constructor(scene, { quality = 1, reducedMotion = false, particleScale = 1 } = {}) {
    this.scene = scene;
    this.quality = quality;
    this.reduced = reducedMotion;
    this.particleScale = particleScale;
    this.texts = [];
    this.emitters = {};
    this.slices = [];
    this.build();
  }

  get unit() {
    return Math.min(this.scene.scale.width, this.scene.scale.height) / 700;
  }

  /** Quanti pezzi emettere: scala con qualità e riduzione del movimento. */
  count(n) {
    const factor = this.quality * this.particleScale * (this.reduced ? 0.4 : 1);
    return Math.max(1, Math.round(n * factor));
  }

  s(key, px) {
    return (px * this.unit) / artMeta(key).scale;
  }

  build() {
    const { scene } = this;
    const mk = (key, config) => scene.add.particles(0, 0, key, { emitting: false, maxAliveParticles: 140, ...config }).setDepth(DEPTH);
    this.emitters.confetti = mk('fx-confetti', {
      speed: { min: 200, max: 700 },
      angle: { min: -150, max: -30 },
      gravityY: 1100 * this.unit,
      lifespan: { min: 900, max: 1700 },
      rotate: { start: 0, end: 900 },
      scale: { start: this.s('fx-confetti', 1.9), end: this.s('fx-confetti', 1.1) },
      alpha: { start: 1, end: 0, ease: 'Quad.In' },
      tint: PARTY,
    });
    this.emitters.hearts = mk('fx-heart', {
      speed: { min: 70, max: 240 },
      angle: { min: -130, max: -50 },
      gravityY: -120 * this.unit,
      lifespan: { min: 900, max: 1500 },
      scale: { start: this.s('fx-heart', 0.7), end: this.s('fx-heart', 0.25) },
      alpha: { start: 1, end: 0 },
      tint: HEART,
    });
    this.emitters.stars = mk('fx-star', {
      speed: { min: 120, max: 460 },
      angle: { min: 0, max: 360 },
      gravityY: 200 * this.unit,
      lifespan: { min: 600, max: 1100 },
      rotate: { start: 0, end: 360 },
      scale: { start: this.s('fx-star', 0.75), end: 0 },
      alpha: { start: 1, end: 0 },
      tint: GOLD,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.emitters.smoke = mk('fx-smoke', {
      speed: { min: 30, max: 140 },
      angle: { min: -150, max: -30 },
      gravityY: -60 * this.unit,
      lifespan: { min: 800, max: 1400 },
      scale: { start: this.s('fx-smoke', 0.8), end: this.s('fx-smoke', 2.3) },
      alpha: { start: 0.7, end: 0 },
      tint: SMOKE,
    });
    this.emitters.dark = mk('fx-confetti', {
      speed: { min: 150, max: 520 },
      angle: { min: -150, max: -30 },
      gravityY: 1300 * this.unit,
      lifespan: { min: 800, max: 1400 },
      rotate: { start: 0, end: 700 },
      scale: { start: this.s('fx-confetti', 1.8), end: this.s('fx-confetti', 1.0) },
      alpha: { start: 1, end: 0, ease: 'Quad.In' },
      tint: DARK,
    });
    this.emitters.sparks = mk('fx-spark', {
      speed: { min: 20, max: 120 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 500, max: 900 },
      rotate: { start: 0, end: 180 },
      scale: { start: this.s('fx-spark', 0.9), end: 0 },
      alpha: { start: 1, end: 0 },
      tint: GOLD,
      blendMode: Phaser.BlendModes.ADD,
    });
  }

  resize() {
    const raining = Boolean(this.emitters.rain);
    for (const e of Object.values(this.emitters)) e.destroy();
    this.emitters = {};
    this.build();
    if (raining) this.rain(true);
  }

  /** Pioggia continua e leggera di coriandoli dall'alto (finale). */
  rain(on) {
    if (!on) {
      this.emitters.rain?.destroy();
      delete this.emitters.rain;
      return;
    }
    if (this.emitters.rain) return;
    const { width } = this.scene.scale;
    const u = this.unit;
    this.emitters.rain = this.scene.add
      .particles(0, -20, 'fx-confetti', {
        x: { min: 0, max: width },
        speedY: { min: 70 * u, max: 190 * u },
        speedX: { min: -40 * u, max: 40 * u },
        lifespan: 6500,
        frequency: this.reduced ? 420 : Math.round(150 / Math.max(0.4, this.quality)),
        rotate: { start: 0, end: 540 },
        scale: { start: this.s('fx-confetti', 1.5), end: this.s('fx-confetti', 1.2) },
        alpha: { start: 0.95, end: 0.2 },
        tint: PARTY,
        maxAliveParticles: 90,
      })
      .setDepth(DEPTH - 1);
  }

  /** Effetto di un regalo: 'confetti' | 'hearts' | 'stars' | 'golden' | 'smoke' | 'glitch' | 'dark-confetti'. */
  play(effect, x, y) {
    const e = this.emitters;
    switch (effect) {
      case 'hearts':
        e.hearts.explode(this.count(14), x, y);
        e.sparks.explode(this.count(6), x, y);
        break;
      case 'stars':
        e.stars.explode(this.count(16), x, y);
        e.confetti.explode(this.count(12), x, y);
        break;
      case 'golden':
        e.stars.explode(this.count(22), x, y);
        e.confetti.explode(this.count(34), x, y);
        e.sparks.explode(this.count(14), x, y);
        break;
      case 'smoke':
        e.smoke.explode(this.count(10), x, y);
        e.dark.explode(this.count(8), x, y);
        break;
      case 'glitch':
        e.smoke.explode(this.count(6), x, y);
        e.dark.explode(this.count(10), x, y);
        this.glitch(x, y);
        break;
      case 'dark-confetti':
        e.dark.explode(this.count(30), x, y);
        e.smoke.explode(this.count(4), x, y);
        break;
      case 'confetti':
      default:
        e.confetti.explode(this.count(30), x, y);
        e.stars.explode(this.count(6), x, y);
        break;
    }
  }

  confettiBurst(x, y, n = 40) {
    this.emitters.confetti.explode(this.count(n), x, y);
  }

  sparkles(x, y, n = 10) {
    this.emitters.sparks.explode(this.count(n), x, y);
  }

  /** Piccolo "glitch" digitale: poche strisce colorate che scivolano, senza lampeggi. */
  glitch(x, y) {
    if (this.reduced) return;
    const { scene } = this;
    const u = this.unit;
    for (let i = 0; i < 6; i++) {
      const g = scene.add.rectangle(x + (Math.random() - 0.5) * 120 * u, y + (Math.random() - 0.5) * 140 * u, (60 + Math.random() * 130) * u, (4 + Math.random() * 8) * u, [0x28c9d4, 0xff6fa5, 0xa98bff][i % 3], 0.5);
      g.setDepth(DEPTH + 1);
      scene.tweens.add({
        targets: g,
        x: g.x + (Math.random() - 0.5) * 80 * u,
        alpha: 0,
        duration: 420,
        delay: i * 30,
        onComplete: () => g.destroy(),
      });
    }
  }

  /** Testo che sale e svanisce (es. "+100"). */
  floatText(x, y, text, { color = '#ffffff', size = 34, stroke = '#2a1245', rise = 90 } = {}) {
    const { scene } = this;
    const u = this.unit;
    let t = this.texts.find((tx) => !tx.active || !tx.visible);
    if (!t) {
      if (this.texts.length >= 8) t = this.texts[0];
      else {
        t = scene.add.text(0, 0, '', { fontFamily: '"Fredoka Variable", "Fredoka", system-ui, sans-serif', fontStyle: '700' }).setOrigin(0.5).setDepth(DEPTH + 2);
        this.texts.push(t);
      }
    }
    scene.tweens.killTweensOf(t);
    t.setActive(true).setVisible(true);
    t.setText(text).setColor(color).setFontSize(Math.round(size * Math.max(u, 0.8) * 1.15));
    t.setStroke(stroke, Math.round(7 * Math.max(u, 0.8)));
    t.setPosition(x, y).setAlpha(1).setScale(0.4);
    scene.tweens.add({ targets: t, scale: 1, duration: 180, ease: 'Back.Out' });
    scene.tweens.add({
      targets: t,
      y: y - rise * u,
      alpha: 0,
      delay: 380,
      duration: 700,
      ease: 'Sine.In',
      onComplete: () => t.setVisible(false).setActive(false),
    });
  }

  destroy() {
    for (const e of Object.values(this.emitters)) e.destroy();
    for (const t of this.texts) t.destroy();
    this.emitters = {};
    this.texts = [];
  }
}
