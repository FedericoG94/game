import { describe, it, expect } from 'vitest';
import { settings, giftCatalog } from '../src/data/index.js';
import { Simulation } from '../src/game/Simulation.js';
import { GameState, computeTrackLength } from '../src/game/GameState.js';
import { playFullRun } from './helpers/bot.js';

describe('GameState', () => {
  it('la lunghezza del percorso corrisponde alla durata obiettivo', () => {
    const state = new GameState(settings.run);
    state.start();
    let t = 0;
    const dt = 1 / 120;
    while (state.distance < state.trackLength && t < 600) {
      state.advance(dt);
      t += dt;
    }
    expect(Math.abs(t - settings.run.targetDurationSec)).toBeLessThan(1);
    expect(state.trackLength).toBeCloseTo(computeTrackLength(settings.run));
  });

  it('la velocità cresce gradualmente fino al massimo', () => {
    const state = new GameState(settings.run);
    expect(state.baseSpeed(0)).toBeCloseTo(settings.run.startSpeed);
    expect(state.baseSpeed(1)).toBeCloseTo(settings.run.maxSpeed);
    let prev = 0;
    for (let p = 0; p <= 1; p += 0.05) {
      const v = state.baseSpeed(p);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it('i modificatori rallentano e poi scadono', () => {
    const state = new GameState(settings.run);
    state.start();
    state.addModifier('x', 0.5, 1);
    state.advance(0.1);
    expect(state.speed).toBeCloseTo(settings.run.startSpeed * 0.5);
    state.advance(1);
    state.advance(0.1);
    expect(state.speed).toBeCloseTo(state.baseSpeed());
    expect(state.modifiers).toHaveLength(0);
  });
});

describe('Simulation: corsa completa', () => {
  it('il bot completa la corsa e arriva al finale a 60 fps (durata ≈ obiettivo)', () => {
    const { sim, summary, hits } = playFullRun(settings, giftCatalog, { seed: 123, dt: 1 / 60 });
    expect(sim.phase).toBe('finished');
    expect(summary).not.toBeNull();
    expect(summary.elapsed).toBeGreaterThan(settings.run.targetDurationSec * 0.9);
    expect(summary.elapsed).toBeLessThan(settings.run.targetDurationSec * 1.25);
    expect(summary.stats.collected).toBeGreaterThan(10);
    expect(hits.length).toBeLessThan(6);
    expect(summary.score).toBeGreaterThan(0);
    expect(sim.progress).toBe(1);
  });

  it('il risultato resta coerente a frame rate molto diversi (20 e 144 fps)', () => {
    const slow = playFullRun(settings, giftCatalog, { seed: 5, dt: 1 / 20 });
    const fast = playFullRun(settings, giftCatalog, { seed: 5, dt: 1 / 144 });
    expect(slow.sim.phase).toBe('finished');
    expect(fast.sim.phase).toBe('finished');
    expect(Math.abs(slow.summary.elapsed - fast.summary.elapsed)).toBeLessThan(settings.run.targetDurationSec * 0.1);
  });

  it('il finale è raggiungibile anche senza muovere un dito (nessun game over)', () => {
    for (const seed of [1, 2, 3, 4]) {
      const { sim, summary } = playFullRun(settings, giftCatalog, { seed, bot: false });
      expect(sim.phase).toBe('finished');
      expect(summary.score).toBeGreaterThanOrEqual(0);
      expect(summary.elapsed).toBeLessThan(settings.run.targetDurationSec * 2);
    }
  });

  it('il finale è raggiungibile anche se TUTTI i regali fossero negativi', () => {
    const hostile = structuredClone(settings);
    hostile.gifts.positiveChance = 0;
    hostile.gifts.maxNegativeStreak = 99;
    const { sim, summary } = playFullRun(hostile, giftCatalog, { seed: 8, bot: false });
    expect(sim.phase).toBe('finished');
    expect(summary.stats.negative).toBeGreaterThan(0);
  });

  it('il registro contiene solo ciò che è stato davvero raccolto, senza duplicati', () => {
    const picked = [];
    const { summary } = playFullRun(settings, giftCatalog, {
      seed: 77,
      onEvent: (ev) => ev.type === 'pickup' && picked.push(ev.gift.id),
    });
    const ids = summary.registry.map((r) => r.gift.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ids)).toEqual(new Set(picked));
    const total = summary.registry.reduce((n, r) => n + r.count, 0);
    expect(total).toBe(picked.length);
    expect(total).toBe(summary.stats.collected);
  });

  it('il punteggio finale è la somma esatta degli eventi (con il pavimento a zero)', () => {
    let score = 0;
    const { summary } = playFullRun(settings, giftCatalog, {
      seed: 31,
      onEvent: (ev) => {
        if (ev.type === 'pickup' || ev.type === 'hit') score = Math.max(0, score + ev.result.nominal);
        if (ev.type === 'gate') score += ev.bonus.nominal;
      },
    });
    expect(summary.score).toBe(score);
  });

  it('la corsa è deterministica a parità di seme', () => {
    const a = playFullRun(settings, giftCatalog, { seed: 9 }).summary;
    const b = playFullRun(settings, giftCatalog, { seed: 9 }).summary;
    expect(a.score).toBe(b.score);
    expect(a.stats).toEqual(b.stats);
  });

  it('dopo un urto la protagonista è invulnerabile per un po’ (nessuna raffica di urti)', () => {
    const { hits } = playFullRun(settings, giftCatalog, { seed: 4, bot: false });
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i].entity.pos).not.toBe(hits[i - 1].entity.pos);
    }
  });

  it('con dt = 0 (pausa) lo stato non cambia', () => {
    const sim = new Simulation(settings, giftCatalog, { seed: 1 });
    sim.start();
    for (let i = 0; i < 120; i++) sim.step(1 / 60);
    const before = JSON.stringify({ d: sim.distance, e: sim.entities.length, s: sim.score.score });
    for (let i = 0; i < 300; i++) sim.step(0);
    expect(JSON.stringify({ d: sim.distance, e: sim.entities.length, s: sim.score.score })).toBe(before);
  });

  it('non avanza se la corsa non è iniziata, e dopo reset si può rigiocare', () => {
    const sim = new Simulation(settings, giftCatalog, { seed: 1 });
    sim.step(1);
    expect(sim.distance).toBe(0);
    sim.start();
    for (let i = 0; i < 600; i++) sim.step(1 / 60);
    expect(sim.distance).toBeGreaterThan(50);
    sim.reset(2);
    expect(sim.distance).toBe(0);
    expect(sim.phase).toBe('ready');
    expect(sim.entities).toHaveLength(0);
    expect(sim.score.score).toBe(0);
  });

  it('la fine corsa si ferma davanti al grande regalo', () => {
    const { sim } = playFullRun(settings, giftCatalog, { seed: 6 });
    const z = sim.zOf(sim.bigGift.pos);
    expect(z).toBeGreaterThan(settings.run.finale.stopDistance - 0.5);
    expect(z).toBeLessThan(settings.run.finale.stopDistance + 1.5);
    expect(sim.state.speed).toBe(0);
  });
});
