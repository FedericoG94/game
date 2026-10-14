import Phaser from 'phaser';
import { app } from './app.js';
import { computeLayout, Projection } from './projection.js';
import { Backdrop } from './Backdrop.js';
import { Player } from './Player.js';
import { GiftPool } from './Gift.js';

const DECOR_COUNT = 8;
const DECOR_SPACING = 9;
const HERO_BOOST = 1.9;


/**
 * Schermata iniziale: strada animata con pacchi decorativi che scorrono, Mini Carlotta
 * che saluta e il menu HTML (titolo, pulsante, istruzioni, audio) sovrapposto.
 */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const { settings } = app;
    this.t = 0;
    this.traveled = 0;
    this.layout = computeLayout(this.scale.width, this.scale.height, settings.lanes);
    this.proj = new Projection(this.layout);
    this.backdrop = new Backdrop(this, this.proj, { clouds: 5, props: true, quality: app.quality });
    this.player = new Player(this, { accessory: settings.character.accessory });
    this.player.reducedMotion = app.reducedMotion;
    this.player.setMode('idle');
    this.player.depth = 500;
    this.giftViews = new GiftPool(this);

    const pool = app.gifts.filter((g) => g.type === 'positive');
    this.decor = Array.from({ length: DECOR_COUNT }, (_, i) => ({
      id: i + 1,
      kind: 'gift',
      lane: i % 2 === 0 ? 0 : 2,
      pos: 8 + i * DECOR_SPACING,
      gift: pool[i % pool.length],
    }));

    app.hud.hide();
    app.setPlaying(false);
    app.ui.setCountdown(null);
    app.ui.setHint(null);
    app.ui.hideCard();
    this.menu = app.ui.showMenu({ onStart: () => this.start() });
    app.audio.playMusic('menu');

    this.unlockOnce = () => app.audio.unlock();
    window.addEventListener('click', this.unlockOnce, { once: true });
    window.addEventListener('keydown', this.unlockOnce, { once: true });
    this.unsubscribe = app.input.on('mute', () => app.setAudio(!app.audio.enabled));
    this.scale.on('resize', this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  start() {
    app.audio.unlock();
    this.scene.start('Runner');
  }

  onResize() {
    this.layout = computeLayout(this.scale.width, this.scale.height, app.settings.lanes);
    this.backdrop.resize(this.layout);
    this.slot = null;
  }

  update(_time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    this.t += dt;
    this.traveled += dt * 3.2;
    const { proj, layout } = this;
    proj.setCamera(1);
    this.backdrop.update(dt, { traveled: this.traveled, scroll: this.traveled, progress: 0.12 });

    const spawnZ = app.settings.spawn.spawnDistance;
    const loop = DECOR_COUNT * DECOR_SPACING;
    for (const e of this.decor) {
      let z = e.pos - this.traveled;
      if (z < -4) {
        e.pos += loop;
        z += loop;
      }
      if (z > spawnZ) {
        this.giftViews.release(e.id);
        continue;
      }
      const view = this.giftViews.get(e.id) ?? this.giftViews.acquire(e, app.settings.gifts.categoryHints);
      view.place(proj, z, this.t, spawnZ);
    }

    // Carlotta nello spazio libero tra il titolo e i pulsanti (misurato dal DOM)
    const slot = this.measureSlot();
    const heroPx = Math.min(slot.height * 0.92, layout.heroH * HERO_BOOST * 1.1, slot.width * 0.9);
    this.player.update(dt, null, 8);
    this.player.place(slot.cx, slot.feetY, heroPx / 292, 0);
  }

  /** Spazio centrale libero del menu in pixel del canvas (ricalcolato solo se cambia il layout). */
  measureSlot() {
    const key = `${this.layout.w}x${this.layout.h}`;
    if (this.slotKey === key && this.slot) return this.slot;
    const { layout } = this;
    let slot = { cx: layout.cx, feetY: layout.h * 0.7, height: layout.h * 0.3, width: layout.w };
    try {
      const top = this.menu.el.querySelector('.menu__top').getBoundingClientRect();
      const bottom = this.menu.el.querySelector('.menu__bottom').getBoundingClientRect();
      const canvasRect = this.game.canvas.getBoundingClientRect();
      const k = layout.w / (canvasRect.width || layout.w);
      const topY = top.bottom * k;
      const bottomY = bottom.top * k;
      const gap = Math.max(layout.h * 0.12, bottomY - topY);
      slot = { cx: layout.cx, feetY: topY + gap * 0.96, height: gap, width: layout.w };
    } catch {
      /* il menu non è ancora nel DOM: uso i valori di riserva */
    }
    this.slot = slot;
    this.slotKey = key;
    return slot;
  }

  cleanup() {
    window.removeEventListener('click', this.unlockOnce);
    window.removeEventListener('keydown', this.unlockOnce);
    this.unsubscribe?.();
    this.scale.off('resize', this.onResize, this);
    this.menu?.close();
    this.backdrop?.destroy();
    this.player?.destroy();
    this.giftViews?.destroy();
  }
}
