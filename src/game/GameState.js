import { clamp, smoothstep } from './rng.js';

/** Velocità di base (m/s) in funzione dell'avanzamento 0..1. */
export function makeSpeedProfile(run) {
  return (progress) => {
    const t = clamp(progress / run.maxSpeedAtProgress, 0, 1);
    return run.startSpeed + (run.maxSpeed - run.startSpeed) * smoothstep(t);
  };
}

/**
 * Lunghezza del percorso tale che, senza rallentamenti, la corsa duri esattamente
 * `targetDurationSec`:  T = L * ∫ dp / v(p)   =>   L = T / ∫ dp / v(p)
 */
export function computeTrackLength(run) {
  const speed = makeSpeedProfile(run);
  const steps = 2000;
  let integral = 0;
  for (let i = 0; i < steps; i++) integral += 1 / speed((i + 0.5) / steps) / steps;
  return run.targetDurationSec / integral;
}

/**
 * Stato della corsa: fase, tempo, distanza e velocità, compresi i modificatori
 * temporanei (rallentamenti). Non conosce Phaser né il rendering.
 */
export class GameState {
  constructor(runConfig) {
    this.run = runConfig;
    this.speedProfile = makeSpeedProfile(runConfig);
    this.trackLength = computeTrackLength(runConfig);
    this.reset();
  }

  reset() {
    /** 'ready' | 'running' | 'braking' | 'finished' */
    this.phase = 'ready';
    this.elapsed = 0;
    this.distance = 0;
    this.speed = this.run.startSpeed;
    this.modifiers = [];
  }

  get progress() {
    return clamp(this.distance / this.trackLength, 0, 1);
  }

  baseSpeed(progress = this.progress) {
    return this.speedProfile(progress);
  }

  get speedMultiplier() {
    let m = 1;
    for (const mod of this.modifiers) m *= mod.factor;
    return m;
  }

  /** Aggiunge (o rinnova) un modificatore di velocità temporaneo. */
  addModifier(id, factor, durationSec) {
    if (durationSec <= 0) return;
    const existing = this.modifiers.find((m) => m.id === id);
    if (existing) {
      existing.factor = factor;
      existing.remaining = durationSec;
    } else {
      this.modifiers.push({ id, factor, remaining: durationSec });
    }
  }

  start() {
    this.phase = 'running';
  }

  /** Avanza di `dt` secondi di corsa normale. */
  advance(dt) {
    this.elapsed += dt;
    for (const mod of this.modifiers) mod.remaining -= dt;
    this.modifiers = this.modifiers.filter((m) => m.remaining > 0);
    this.speed = this.baseSpeed() * this.speedMultiplier;
    this.distance += this.speed * dt;
  }

  /** Avanza durante la frenata finale con una velocità imposta. */
  advanceWithSpeed(dt, speed) {
    this.elapsed += dt;
    this.speed = speed;
    this.distance += speed * dt;
  }
}
