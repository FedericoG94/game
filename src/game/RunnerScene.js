import Phaser from 'phaser';
import { app } from './app.js';
import { Simulation } from './Simulation.js';
import { computeLayout, Projection } from './projection.js';
import { Backdrop } from './Backdrop.js';
import { Player } from './Player.js';
import { GiftPool } from './Gift.js';
import { ObstaclePool } from './Obstacle.js';
import { BigGift } from './BigGift.js';
import { Fx } from './Fx.js';
import { artMeta, makeArt } from './artBank.js';
import { boxKeyFor } from '../art/index.js';
import { clamp } from './rng.js';

const MAX_DT = 0.05;
const GATE_UNITS_LANES = 4.57;
const PLAZA_RADIUS = 10;
const OBSTACLE_WORDS = { block: 'Splat!', hurdle: 'Ouch!', banner: 'Bonk!' };

const hexInt = (hex) => parseInt(hex.replace('#', ''), 16);
const fmt = (n) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);
const isTouch = () => window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window;

/**
 * La corsa vera e propria. La scena NON contiene regole di gioco: legge lo stato dalla
 * `Simulation`, lo rappresenta in prospettiva e traduce gli eventi in effetti, suoni e HUD.
 */
export class RunnerScene extends Phaser.Scene {
  constructor() {
    super('Runner');
  }

  create() {
    const { settings } = app;
    this.sim = new Simulation(settings, app.gifts, { seed: (Math.random() * 2 ** 32) >>> 0 });
    this.mode = 'countdown'; // countdown | play | resume | ending
    this.modeT = 0;
    this.goT = 0;
    this.t = 0;
    this.preRoll = 0;
    this.slowMoT = 0;
    this.cardT = 0;
    this.hintT = 0;
    this.hintsDone = { lane: false, hurdle: false, banner: false };
    this.plazaGrow = 0;
    this.pausedFrom = 'countdown';
    this.perfFrames = 0;
    this.perfAcc = 0;
    this.seen = new Set();
    this.tmpIds = [];
    this.lastPlace = new Map();

    this.layout = computeLayout(this.scale.width, this.scale.height, settings.lanes);
    this.proj = new Projection(this.layout);
    this.backdrop = new Backdrop(this, this.proj, { clouds: 5, props: true, quality: app.quality });
    this.player = new Player(this, { accessory: settings.character.accessory });
    this.player.reducedMotion = app.reducedMotion;
    this.player.depth = 500;
    this.giftViews = new GiftPool(this);
    this.obstacleViews = new ObstaclePool(this);
    this.big = new BigGift(this);
    this.gate = makeArt(this, 'ob-gate', 0, 0, 1).setVisible(false);
    this.fx = new Fx(this, { quality: app.quality, reducedMotion: app.reducedMotion, particleScale: settings.quality.particles });

    if (!this.scene.isActive('GiftReveal')) this.scene.launch('GiftReveal');

    app.hud.reset();
    app.hud.show();
    app.ui.hideCard();
    app.ui.setHint(null);
    app.setPlaying(true);
    app.audio.resume();
    app.audio.playMusic('run');
    app.audio.setIntensity(0);

    const on = (action, fn) => app.input.on(action, fn);
    this.unsubscribe = [
      on('left', () => this.act('left')),
      on('right', () => this.act('right')),
      on('jump', () => this.act('jump')),
      on('slide', () => this.act('slide')),
      on('pause', () => this.requestPause()),
      on('mute', () => app.setAudio(!app.audio.enabled)),
    ];
    this.onVisibility = () => {
      if (document.hidden) this.requestPause();
    };
    document.addEventListener('visibilitychange', this.onVisibility);
    this.scale.on('resize', this.onResize, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResumed, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    app.audio.sfx('countdown');
  }

  // ----------------------------------------------------------------- input
  act(action) {
    if (this.mode !== 'play') return;
    this.sim[action]();
  }

  requestPause() {
    if (this.mode === 'ending' || this.scene.isActive('Pause') || this.scene.isPaused()) return;
    this.pausedFrom = this.mode;
    app.setPlaying(false);
    app.audio.sfx('pause');
    app.audio.suspend();
    this.scene.launch('Pause');
    this.scene.pause('GiftReveal');
    this.scene.pause();
  }

  onResumed() {
    this.scene.resume('GiftReveal');
    app.setPlaying(true);
    app.audio.resume();
    app.audio.sfx('resume');
    if (this.mode === 'play') {
      this.mode = 'resume';
      this.modeT = 0;
    }
  }

  onResize() {
    this.layout = computeLayout(this.scale.width, this.scale.height, app.settings.lanes);
    this.backdrop.resize(this.layout);
    this.fx.resize();
  }

  // ---------------------------------------------------------------- update
  update(_time, delta) {
    const raw = Math.min(delta, MAX_DT * 1000) / 1000;
    this.t += raw;
    this.updateMode(raw);
    this.render(raw);
  }

  updateMode(raw) {
    const { settings } = app;
    if (this.mode === 'countdown') {
      this.modeT += raw;
      const total = settings.run.countdownSec;
      this.preRoll += raw * settings.run.startSpeed * 0.6;
      const label = this.modeT < total * 0.55 ? 'PRONTI?' : 'VIA!';
      if (this.modeT >= total * 0.55 && !this.goStarted) {
        this.goStarted = true;
        app.audio.sfx('go');
      }
      app.ui.setCountdown(label, label === 'VIA!' ? 'countdown--go' : '');
      if (this.modeT >= total) {
        this.mode = 'play';
        this.sim.start();
        this.goT = 0.6;
        this.hintT = 4.5;
        app.ui.setHint(isTouch() ? 'Scorri a destra o a sinistra per cambiare corsia' : 'Usa ← → (o A D) per cambiare corsia', isTouch() ? 'touch' : null);
      }
      return;
    }
    if (this.mode === 'resume') {
      this.modeT += raw;
      const total = settings.run.resumeCountdownSec;
      const n = 3 - Math.min(2, Math.floor((this.modeT / total) * 3));
      app.ui.setCountdown(String(n));
      if (this.modeT >= total) {
        this.mode = 'play';
        app.ui.setCountdown(null);
      }
      return;
    }
    if (this.mode !== 'play') return;

    if (this.goT > 0) {
      this.goT -= raw;
      if (this.goT <= 0) app.ui.setCountdown(null);
    }

    let dt = raw;
    if (this.slowMoT > 0) {
      this.slowMoT -= raw;
      dt *= settings.reveal.slowMoScale;
    }
    // In produzione scale = 1: un solo passo. Con ?debug&speed=N si usano più sotto-passi stabili.
    const total = dt * app.debug.timeScale;
    const steps = Math.max(1, Math.ceil(total / MAX_DT));
    for (let i = 0; i < steps && this.mode === 'play'; i++) {
      this.sim.step(total / steps);
      for (const ev of this.sim.drainEvents()) this.handleEvent(ev);
    }
    if (this.mode === 'ending') return;

    if (this.cardT > 0) {
      this.cardT -= raw;
      if (this.cardT <= 0) app.ui.hideCard();
    }
    this.updateHints(raw);
    app.audio.setIntensity(this.sim.progress);
    this.watchPerformance(raw);
  }

  watchPerformance(raw) {
    if (this.sim.state.elapsed < 3) return;
    this.perfAcc += raw;
    if (++this.perfFrames < 100) return;
    const avg = this.perfAcc / this.perfFrames;
    this.perfFrames = 0;
    this.perfAcc = 0;
    if (avg > 0.028 && app.quality > 0.5) {
      app.quality = Math.max(0.5, app.quality - 0.25);
      this.fx.quality = app.quality;
      this.backdrop.quality = app.quality;
    }
  }

  updateHints(raw) {
    const { sim } = this;
    if (this.hintT > 0) {
      this.hintT -= raw;
      if (this.hintT <= 0) app.ui.setHint(null);
    }
    if (sim.phase !== 'running') return;
    for (const e of sim.entities) {
      if (e.kind !== 'obstacle' || !e.span || this.hintsDone[e.obstacleType]) continue;
      const z = sim.zOf(e.pos);
      if (z < 30 && z > 7) {
        this.hintsDone[e.obstacleType] = true;
        const touch = isTouch();
        if (e.obstacleType === 'hurdle') app.ui.setHint(touch ? 'Scorri verso l’alto per SALTARE!' : 'SALTA! ↑ / W / Spazio', 'up');
        else app.ui.setHint(touch ? 'Scorri verso il basso per SCIVOLARE!' : 'SCIVOLA! ↓ / S', 'down');
        this.hintT = 2.6;
      }
    }
  }

  // ---------------------------------------------------------------- eventi
  handleEvent(ev) {
    switch (ev.type) {
      case 'lane':
        app.audio.sfx('lane');
        if (!this.hintsDone.lane) {
          this.hintsDone.lane = true;
          if (this.hintT > 0 && this.sim.state.elapsed < 8) {
            this.hintT = 0;
            app.ui.setHint(null);
          }
        }
        break;
      case 'jump':
        app.audio.sfx('jump');
        break;
      case 'slide':
        app.audio.sfx('slide');
        break;
      case 'land':
        app.audio.sfx('land');
        break;
      case 'pickup':
        this.onPickup(ev);
        break;
      case 'hit':
        this.onHit(ev);
        break;
      case 'gate':
        this.onGate(ev);
        break;
      case 'finished':
        this.onFinished(ev);
        break;
      default:
        break;
    }
  }

  playerScreenPos() {
    return { x: this.proj.x(this.sim.motion.laneX, 0), y: this.layout.groundY - this.layout.heroH * 0.55 };
  }

  syncHud() {
    const { score } = this.sim;
    app.hud.setScore(score.score);
    app.hud.setStats(score.stats);
    app.hud.setCombo(score.combo, score.comboMultiplier());
  }

  onPickup({ gift, result, entity }) {
    const { settings } = app;
    const positive = gift.type === 'positive';
    const view = this.giftViews.get(entity.id);
    const place = this.lastPlace.get(entity.id) ?? { x: this.playerScreenPos().x, y: this.layout.groundY - this.layout.laneW * 0.4, footY: this.layout.groundY, boxScale: 0.5 };
    const category = app.categories[gift.category];

    const card = app.ui.showCard({ gift, result });
    this.cardT = settings.reveal.cardSec;
    const reveal = this.scene.get('GiftReveal');
    reveal?.play({
      gift,
      x: place.x,
      y: place.y,
      footY: place.footY,
      boxScale: place.boxScale,
      boxKey: view?.boxKey ?? boxKeyFor(gift, settings.gifts.categoryHints),
      color: hexInt(category?.color ?? '#ff8fc0'),
      card: this.cardTarget(card.el),
    });
    this.giftViews.release(entity.id);
    this.lastPlace.delete(entity.id);

    this.player.react(positive ? 'happy' : 'disgust');
    const pos = this.playerScreenPos();
    this.fx.floatText(pos.x, pos.y - this.layout.heroH * 0.7, fmt(result.nominal), {
      color: positive ? (gift.rarity === 'rare' ? '#ffd34d' : '#ffffff') : '#d9b8ff',
      size: positive ? 38 : 34,
    });
    if (result.multiplier > 1) this.fx.floatText(pos.x, pos.y - this.layout.heroH * 1.05, `×${result.multiplier.toFixed(2).replace(/\.?0+$/, '')}`, { color: '#ffd34d', size: 24, rise: 60 });
    app.audio.sfx(gift.sound);
    this.syncHud();
    if (!app.reducedMotion) this.slowMoT = settings.reveal.slowMoSec;
    if (!positive) this.shake(220, 0.005);
  }

  /** Posizione e misura della foto nella scheda HTML, in pixel del canvas (per far volare la foto verso di essa). */
  cardTarget(cardEl) {
    try {
      const photo = cardEl.querySelector('.reveal__photo');
      const k = this.scale.width / (this.game.canvas.getBoundingClientRect().width || this.scale.width);
      const rect = cardEl.getBoundingClientRect();
      const cardLeft = rect.left + (rect.width - cardEl.offsetWidth) / 2;
      const cardTop = rect.top + (rect.height - cardEl.offsetHeight) / 2;
      return {
        x: (cardLeft + photo.offsetLeft + photo.offsetWidth / 2) * k,
        y: (cardTop + photo.offsetTop + photo.offsetHeight / 2) * k,
        size: photo.offsetWidth * k,
      };
    } catch {
      return undefined;
    }
  }

  onHit({ entity, result }) {
    const view = this.obstacleViews.active.get(entity.id);
    view?.pop();
    this.player.react('shock');
    const pos = this.playerScreenPos();
    this.fx.floatText(pos.x, pos.y - this.layout.heroH * 0.75, OBSTACLE_WORDS[entity.obstacleType] ?? 'Ahi!', { color: '#ffb0b0', size: 42 });
    this.fx.floatText(pos.x, pos.y - this.layout.heroH * 1.15, fmt(result.nominal), { color: '#ffffff', size: 28, rise: 60 });
    this.fx.play('smoke', pos.x, pos.y + this.layout.heroH * 0.2);
    app.audio.sfx('hit');
    this.shake(240, 0.008);
    this.syncHud();
    app.ui.hideCard();
  }

  onGate(ev) {
    const { w, h } = this.layout;
    app.audio.sfx('finish');
    this.fx.confettiBurst(w * 0.3, h * 0.42, 50);
    this.fx.confettiBurst(w * 0.7, h * 0.42, 50);
    this.fx.floatText(w / 2, h * 0.3, 'TRAGUARDO!', { color: '#ffd34d', size: 56, rise: 40 });
    this.fx.floatText(w / 2, h * 0.38, fmt(ev.bonus.nominal), { color: '#ffffff', size: 36, rise: 40 });
    this.player.react('happy');
    this.syncHud();
    app.ui.hideCard();
    app.ui.setHint(null);
    this.big.state.appear = 0.001;
    this.big.setVisible(true);
    this.tweens.add({ targets: this.big.state, appear: 1, duration: 1100, ease: 'Back.Out' });
    this.tweens.add({ targets: this, plazaGrow: 1, duration: 1400, ease: 'Cubic.Out' });
    this.fx.sparkles(w / 2, h * 0.45, 20);
  }

  onFinished({ summary }) {
    this.mode = 'ending';
    app.setPlaying(false);
    app.hud.hide();
    app.ui.hideCard();
    app.ui.setHint(null);
    const { sim } = this;
    const end = {
      traveled: sim.distance,
      scroll: sim.distance + this.preRoll,
      laneX: sim.motion.laneX,
      gatePos: sim.gate.pos,
      bigGiftPos: sim.bigGift.pos,
      stopDistance: app.settings.run.finale.stopDistance,
    };
    this.scene.stop('GiftReveal');
    this.scene.start('Final', { summary, end });
  }

  shake(ms, intensity) {
    if (!app.settings.accessibility.screenShake || app.reducedMotion) return;
    this.cameras.main.shake(ms, intensity);
  }

  // ------------------------------------------------------------- rendering
  render(raw) {
    const { sim, proj, layout, backdrop, player } = this;
    const { motion } = sim;
    const traveled = sim.distance;
    const after = sim.phase === 'braking' || sim.phase === 'finished';
    proj.setCamera(motion.laneX);

    const params = {
      traveled,
      scroll: traveled + this.preRoll,
      progress: sim.progress,
      finishPos: sim.gate.pos,
    };
    if (after) {
      params.plazaPos = sim.bigGift.pos;
      params.plazaRadius = PLAZA_RADIUS * this.plazaGrow;
      params.roadEndZ = sim.bigGift.pos - traveled - PLAZA_RADIUS * 0.78 * this.plazaGrow + (1 - this.plazaGrow) * 60;
    }
    backdrop.update(raw, params);

    this.renderEntities(raw);
    this.renderGate(traveled);
    if (after) this.big.place(proj, sim.bigGift.pos - traveled, this.t);

    // protagonista
    player.invulnerable = sim.invulnerable;
    player.setMode(after && sim.state.speed < 3 ? 'stand' : 'run');
    player.update(this.mode === 'resume' ? 0 : raw, motion, Math.max(sim.state.speed, app.settings.run.startSpeed * 0.6));
    const rigScale = layout.heroH / 250;
    player.place(proj.x(motion.laneX, 0), layout.groundY, rigScale, motion.height * layout.ppm);

    app.hud.setProgress(sim.progress);
    app.hud.update(raw);
  }

  renderEntities(raw) {
    const { sim, proj } = this;
    const spawnZ = app.settings.spawn.spawnDistance;
    const hints = app.settings.gifts.categoryHints;
    const seen = this.seen;
    seen.clear();
    for (const e of sim.entities) {
      const z = sim.zOf(e.pos);
      if (z > spawnZ + 6) continue;
      if (e.kind === 'gift') {
        if (e.consumed) continue;
        const view = this.giftViews.get(e.id) ?? this.giftViews.acquire(e, hints);
        this.lastPlace.set(e.id, view.place(proj, z, this.t, spawnZ));
      } else {
        const view = this.obstacleViews.active.get(e.id) ?? this.obstacleViews.acquire(e);
        view.place(proj, z, spawnZ, raw);
      }
      seen.add(e.id);
    }
    this.releaseUnseen(this.giftViews, (id) => this.lastPlace.delete(id));
    this.releaseUnseen(this.obstacleViews);
  }

  releaseUnseen(pool, extra) {
    const ids = this.tmpIds;
    ids.length = 0;
    for (const id of pool.active.keys()) if (!this.seen.has(id)) ids.push(id);
    for (const id of ids) {
      pool.release(id);
      extra?.(id);
    }
  }

  renderGate(traveled) {
    const z = this.sim.gate.pos - traveled;
    if (z > 88 || z < -9) {
      this.gate.setVisible(false);
      return;
    }
    const { proj, layout } = this;
    const m = artMeta('ob-gate');
    const s = proj.scale(z);
    this.gate
      .setVisible(true)
      .setPosition(proj.xOffset(0, z), proj.y(z))
      .setScale((((layout.laneW * GATE_UNITS_LANES) / 420) * s) / m.scale)
      .setAlpha(clamp((88 - z) / 24, 0, 1) * clamp(1 + z / 5, 0, 1))
      .setDepth(500 - z);
  }

  // --------------------------------------------------------------- chiusura
  cleanup() {
    for (const off of this.unsubscribe ?? []) off();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.scale.off('resize', this.onResize, this);
    this.events.off(Phaser.Scenes.Events.RESUME, this.onResumed, this);
    this.tweens.killAll();
    app.setPlaying(false);
    app.ui?.setCountdown(null);
    app.ui?.setHint(null);
    app.ui?.hideCard();
    this.backdrop?.destroy();
    this.player?.destroy();
    this.giftViews?.destroy();
    this.obstacleViews?.destroy();
    this.big?.destroy();
    this.fx?.destroy();
    this.gate?.destroy();
  }
}
