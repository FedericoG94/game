import { describe, it, expect } from 'vitest';
import { settings } from '../src/data/index.js';
import { computeLayout, Projection, FOCAL } from '../src/game/projection.js';

describe('proiezione prospettica', () => {
  const sizes = [
    [390, 844],
    [844, 390],
    [1920, 1080],
    [768, 1024],
  ];

  it('la protagonista (z=0) sta a terra con scala 1 e gli oggetti lontani vanno verso l’orizzonte', () => {
    for (const [w, h] of sizes) {
      const layout = computeLayout(w, h, settings.lanes);
      const p = new Projection(layout);
      expect(p.scale(0)).toBe(1);
      expect(p.y(0)).toBeCloseTo(layout.groundY);
      expect(p.y(1e6)).toBeCloseTo(layout.horizonY, 0);
      expect(p.y(60)).toBeGreaterThan(layout.horizonY);
      expect(p.y(60)).toBeLessThan(p.y(10));
    }
  });

  it('scala e y sono monotone con la distanza', () => {
    const p = new Projection(computeLayout(390, 844, settings.lanes));
    let prevScale = Infinity;
    let prevY = Infinity;
    for (let z = -3; z <= 70; z += 1) {
      const s = p.scale(z);
      const y = p.y(z);
      expect(s).toBeLessThan(prevScale);
      expect(y).toBeLessThan(prevY);
      prevScale = s;
      prevY = y;
    }
  });

  it('le tre corsie convergono al punto di fuga', () => {
    const layout = computeLayout(390, 844, settings.lanes);
    const p = new Projection(layout);
    const near = p.x(2, 0) - p.x(0, 0);
    const far = p.x(2, 60) - p.x(0, 60);
    expect(near).toBeCloseTo(2 * layout.laneW);
    expect(far).toBeLessThan(near * 0.2);
    expect(p.x(1, 1000)).toBeCloseTo(layout.cx, 0);
  });

  it('il pista a tre corsie entra nello schermo su telefono verticale', () => {
    const layout = computeLayout(360, 740, settings.lanes);
    expect(layout.laneW * 3).toBeLessThanOrEqual(360);
  });

  it('la camera segue parzialmente la protagonista', () => {
    const p = new Projection(computeLayout(390, 844, settings.lanes));
    p.setCamera(2);
    const x = p.x(2, 0);
    expect(x).toBeGreaterThan(p.layout.cx);
    expect(x).toBeLessThan(p.layout.cx + p.layout.laneW);
    expect(FOCAL).toBeGreaterThan(0);
  });
});
