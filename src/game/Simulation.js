import { createRng } from './rng.js';
import { GameState } from './GameState.js';
import { ScoreManager } from './ScoreManager.js';
import { GiftPicker } from './GiftPicker.js';
import { SpawnManager } from './SpawnManager.js';
import { PlayerMotion } from './PlayerMotion.js';
import { CollisionSystem } from './CollisionSystem.js';

/** Quanto dietro la protagonista un oggetto viene eliminato (m). */
const CULL_Z = -7;
const STOP_SPEED = 0.35;

/**
 * Cuore del gameplay, indipendente da Phaser: coordina stato, movimento, spawn,
 * collisioni e punteggio. Le scene leggono lo stato e consumano `events`.
 */
export class Simulation {
  constructor(settings, gifts, { seed } = {}) {
    this.settings = settings;
    this.gifts = gifts;
    this.state = new GameState(settings.run);
    this.score = new ScoreManager(settings.scoring);
    this.motion = new PlayerMotion(settings);
    this.collisions = new CollisionSystem();
    this.events = [];
    this.reset(seed);
  }

  reset(seed = Date.now()) {
    this.seed = seed;
    this.rng = createRng(seed);
    this.state.reset();
    this.score.reset();
    this.motion.reset();
    this.picker = new GiftPicker(this.gifts, this.settings.gifts, this.rng);
    this.spawner = new SpawnManager({
      spawn: this.settings.spawn,
      trackLength: this.state.trackLength,
      baseSpeed: (p) => this.state.baseSpeed(p),
      picker: this.picker,
      rng: this.rng,
    });
    this.entities = [];
    this.events.length = 0;
    this.invulnerableT = 0;
    const length = this.state.trackLength;
    this.gate = { pos: length };
    this.bigGift = { pos: length + this.settings.run.finale.gateToGiftMeters };
  }

  get phase() {
    return this.state.phase;
  }

  get progress() {
    return this.state.progress;
  }

  get distance() {
    return this.state.distance;
  }

  get invulnerable() {
    return this.invulnerableT > 0;
  }

  start() {
    this.state.start();
  }

  // Input ----------------------------------------------------------------
  left() {
    if (this.phase === 'running') this.motion.left();
  }
  right() {
    if (this.phase === 'running') this.motion.right();
  }
  jump() {
    if (this.phase === 'running') this.motion.jump();
  }
  slide() {
    if (this.phase === 'running') this.motion.slide();
  }

  /** Posizione relativa (m) davanti alla protagonista di un oggetto con `pos`. */
  zOf(pos) {
    return pos - this.state.distance;
  }

  // Avanzamento ----------------------------------------------------------
  step(dt) {
    if (dt <= 0) return;
    if (this.phase === 'running') this._stepRunning(dt);
    else if (this.phase === 'braking') this._stepBraking(dt);
  }

  _stepRunning(dt) {
    const prev = this.state.distance;
    this.state.advance(dt);
    this.motion.update(dt);
    this.motion.drainEvents(this.events);
    if (this.invulnerableT > 0) this.invulnerableT = Math.max(0, this.invulnerableT - dt);

    for (const e of this.spawner.update(this.state.distance)) this.entities.push(e);

    const player = {
      laneX: this.motion.laneX,
      height: this.motion.height,
      ducking: this.motion.ducking,
      invulnerable: this.invulnerable,
    };
    for (const ev of this.collisions.check(this.entities, prev, this.state.distance, player)) {
      if (ev.type === 'pickup') this._onPickup(ev.entity);
      else this._onHit(ev.entity);
    }

    this._cull();

    if (this.state.distance >= this.gate.pos) {
      this.state.phase = 'braking';
      this.state.modifiers.length = 0;
      const bonus = this.score.applyFinishBonus();
      this.events.push({ type: 'gate', bonus });
    }
  }

  _stepBraking(dt) {
    const finale = this.settings.run.finale;
    const stopPos = this.bigGift.pos - finale.stopDistance;
    const remaining = Math.max(0, stopPos - this.state.distance);
    const speed = Math.min(this.state.speed, remaining * finale.brakeStrength);
    this.state.advanceWithSpeed(dt, speed);
    this.motion.update(dt);
    this.motion.drainEvents(this.events);
    this._cull();
    if (speed < STOP_SPEED) {
      this.state.phase = 'finished';
      this.state.speed = 0;
      this.events.push({ type: 'finished', summary: this.summary() });
    }
  }

  _onPickup(entity) {
    const gift = entity.gift;
    const result = this.score.applyGift(gift);
    if (!result.positive) {
      const p = this.settings.penalties.negativeGift;
      this.state.addModifier('negativeGift', p.speedFactor, p.durationSec);
    }
    this.events.push({ type: 'pickup', entity, gift, result });
  }

  _onHit(entity) {
    const result = this.score.applyObstacle();
    const p = this.settings.penalties.obstacle;
    this.state.addModifier('obstacle', p.speedFactor, p.durationSec);
    this.invulnerableT = p.invulnerableSec;
    this.events.push({ type: 'hit', entity, result });
  }

  _cull() {
    const d = this.state.distance;
    let write = 0;
    for (const e of this.entities) if (e.pos - d > CULL_Z) this.entities[write++] = e;
    this.entities.length = write;
  }

  /** Riepilogo di fine corsa, derivato solo da eventi reali. */
  summary() {
    const { stats } = this.score;
    return {
      score: this.score.score,
      stats: { ...stats },
      elapsed: this.state.elapsed,
      registry: this.score.registry().map((r) => ({ ...r })),
    };
  }

  drainEvents() {
    const out = this.events.slice();
    this.events.length = 0;
    return out;
  }
}
