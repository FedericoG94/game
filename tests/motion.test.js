import { describe, it, expect } from 'vitest';
import { settings } from '../src/data/index.js';
import { PlayerMotion } from '../src/game/PlayerMotion.js';

const make = () => new PlayerMotion(settings);

function run(motion, seconds, dt) {
  const steps = Math.round(seconds / dt);
  let apex = 0;
  for (let i = 0; i < steps; i++) {
    motion.update(dt);
    apex = Math.max(apex, motion.height);
  }
  return apex;
}

describe('PlayerMotion', () => {
  it('non esce mai dai limiti della pista', () => {
    const m = make();
    for (let i = 0; i < 6; i++) m.left();
    expect(m.lane).toBe(0);
    for (let i = 0; i < 9; i++) m.right();
    expect(m.lane).toBe(2);
  });

  it('interpola il cambio corsia in modo rapido ma fluido', () => {
    const m = make();
    m.right();
    m.update(1 / 60);
    expect(m.laneX).toBeGreaterThan(1);
    expect(m.laneX).toBeLessThan(2);
    run(m, 0.3, 1 / 60);
    expect(m.laneX).toBeCloseTo(2, 1);
  });

  it('il cambio corsia è indipendente dal frame rate', () => {
    const results = [30, 60, 144].map((fps) => {
      const m = make();
      m.right();
      run(m, 0.1, 1 / fps);
      return m.laneX;
    });
    expect(Math.max(...results) - Math.min(...results)).toBeLessThan(0.02);
  });

  it('il salto raggiunge l’altezza e la durata configurate a ogni frame rate', () => {
    for (const fps of [30, 60, 144]) {
      const m = make();
      m.jump();
      let t = 0;
      let apex = 0;
      const dt = 1 / fps;
      while (m.airborne && t < 3) {
        m.update(dt);
        apex = Math.max(apex, m.height);
        t += dt;
      }
      expect(apex).toBeGreaterThan(settings.player.jumpHeight * 0.95);
      expect(apex).toBeLessThan(settings.player.jumpHeight * 1.05);
      expect(Math.abs(t - settings.player.jumpDurationSec)).toBeLessThan(0.06);
      expect(m.height).toBe(0);
    }
  });

  it('non permette il doppio salto in aria, ma ricorda un salto premuto poco prima di atterrare', () => {
    const m = make();
    m.jump();
    run(m, 0.2, 1 / 60);
    const vy = m.vy;
    m.jump();
    expect(m.vy).toBe(vy);
    // atterra
    while (m.airborne) m.update(1 / 60);
    // il salto bufferizzato scatta solo se premuto entro la finestra: qui è scaduto
    expect(m.airborne).toBe(false);
  });

  it('un salto premuto subito prima dell’atterraggio parte appena toccato terra', () => {
    const m = make();
    m.jump();
    while (m.height > 0.2 || m.vy > 0) m.update(1 / 120); // fino a poco prima di toccare terra, in discesa
    m.jump();
    let landed = false;
    for (let i = 0; i < 40 && !landed; i++) {
      m.update(1 / 120);
      if (!m.airborne || m.vy > 0) landed = true;
    }
    expect(m.airborne).toBe(true);
    expect(m.vy).toBeGreaterThan(0);
  });

  it('la scivolata dura il tempo configurato e fa scivolare solo a terra', () => {
    const m = make();
    m.slide();
    expect(m.ducking).toBe(true);
    run(m, settings.player.slideDurationSec + 0.05, 1 / 60);
    expect(m.ducking).toBe(false);
  });

  it('saltare interrompe la scivolata', () => {
    const m = make();
    m.slide();
    m.jump();
    expect(m.slideTime).toBe(0);
    expect(m.airborne).toBe(true);
  });

  it('scivolare in aria accelera la discesa e fa scivolare all’atterraggio', () => {
    const m = make();
    m.jump();
    run(m, 0.15, 1 / 60);
    m.slide();
    let guard = 0;
    while (m.airborne && guard++ < 200) m.update(1 / 60);
    expect(m.airborne).toBe(false);
    expect(m.ducking).toBe(true);
  });

  it('emette gli eventi di movimento', () => {
    const m = make();
    const out = [];
    m.left();
    m.jump();
    run(m, 1, 1 / 60);
    m.drainEvents(out);
    expect(out.map((e) => e.type)).toEqual(expect.arrayContaining(['lane', 'jump', 'land']));
  });
});
