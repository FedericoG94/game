import { describe, it, expect } from 'vitest';
import { settings, giftCatalog } from '../src/data/index.js';
import { GameState } from '../src/game/GameState.js';
import { GiftPicker } from '../src/game/GiftPicker.js';
import { SpawnManager, isRowFair } from '../src/game/SpawnManager.js';
import { createRng } from '../src/game/rng.js';

function generateTrack(seed, spawnOverride = {}) {
  const state = new GameState(settings.run);
  const rng = createRng(seed);
  const picker = new GiftPicker(giftCatalog, settings.gifts, rng);
  const spawn = new SpawnManager({
    spawn: { ...settings.spawn, ...spawnOverride },
    trackLength: state.trackLength,
    baseSpeed: (p) => state.baseSpeed(p),
    picker,
    rng,
  });
  // Genera tutto il percorso in un colpo: distanza = lunghezza => nessun limite di visibilità
  const entities = spawn.update(state.trackLength);
  const rows = new Map();
  for (const e of entities) {
    if (!rows.has(e.pos)) rows.set(e.pos, []);
    rows.get(e.pos).push(e);
  }
  return {
    entities,
    plan: spawn.plan,
    rows: [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([pos, list]) => ({ pos, list })),
    state,
  };
}

describe('SpawnManager', () => {
  it('genera file ordinate lungo tutto il percorso e lascia libero il tratto finale', () => {
    const { rows, state } = generateTrack(1);
    expect(rows.length).toBeGreaterThan(40);
    expect(rows[0].pos).toBeGreaterThanOrEqual(settings.spawn.firstRowAt);
    expect(rows.at(-1).pos).toBeLessThanOrEqual(state.trackLength - settings.spawn.clearBeforeGate);
  });

  it('ogni fila lascia sempre una scelta ragionevole (50 percorsi casuali)', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const { rows, plan } = generateTrack(seed);
      // due ostacoli a tutta larghezza non devono mai essere in file consecutive (nemmeno con una fila vuota tra due: quella è lecita)
      for (let i = 1; i < plan.length; i++) {
        expect(plan[i].span && plan[i - 1].span, `seed ${seed}: due ostacoli a tutta larghezza consecutivi`).toBeFalsy();
      }
      for (const row of rows) {
        const obstacles = row.list.filter((e) => e.kind === 'obstacle');
        const span = obstacles.find((e) => e.span);
        const blockedLanes = new Set(obstacles.filter((e) => !e.span).map((e) => e.lane));
        if (span) {
          expect(obstacles.length, `seed ${seed}: una fila a tutta larghezza è sola`).toBe(1);
        } else {
          expect(blockedLanes.size, `seed ${seed}: tutte le corsie bloccate`).toBeLessThan(3);
        }
        // niente due oggetti nella stessa corsia della stessa fila
        const lanes = row.list.filter((e) => !e.span).map((e) => e.lane);
        expect(new Set(lanes).size).toBe(lanes.length);
      }
    }
  });

  it('la distanza tra le file non scende mai sotto il tempo minimo configurato', () => {
    const { rows, state } = generateTrack(9);
    for (let i = 1; i < rows.length; i++) {
      const progress = rows[i].pos / state.trackLength;
      const gapSec = (rows[i].pos - rows[i - 1].pos) / state.baseSpeed(progress);
      expect(gapSec).toBeGreaterThanOrEqual(settings.spawn.minRowGapSec - 0.05);
    }
  });

  it('non obbliga mai a prendere una sorpresa negativa quando resta una sola via libera', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const { rows } = generateTrack(seed);
      for (const row of rows) {
        const blocks = row.list.filter((e) => e.kind === 'obstacle' && !e.span).length;
        if (blocks === 2) {
          for (const g of row.list.filter((e) => e.kind === 'gift')) expect(g.gift.type).toBe('positive');
        }
      }
    }
  });

  it('la difficoltà aumenta: più ostacoli e file più ravvicinate nella seconda metà', () => {
    let early = 0;
    let late = 0;
    let earlyRows = 0;
    let lateRows = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const { rows, state } = generateTrack(seed);
      for (const row of rows) {
        const hasObstacle = row.list.some((e) => e.kind === 'obstacle');
        if (row.pos / state.trackLength < 0.3) {
          early += hasObstacle ? 1 : 0;
          earlyRows++;
        } else if (row.pos / state.trackLength > 0.65) {
          late += hasObstacle ? 1 : 0;
          lateRows++;
        }
      }
    }
    expect(late / lateRows).toBeGreaterThan(early / earlyRows);
  });

  it('crea gli oggetti solo entro la distanza di visibilità', () => {
    const state = new GameState(settings.run);
    const rng = createRng(2);
    const spawn = new SpawnManager({
      spawn: settings.spawn,
      trackLength: state.trackLength,
      baseSpeed: (p) => state.baseSpeed(p),
      picker: new GiftPicker(giftCatalog, settings.gifts, rng),
      rng,
    });
    for (const e of spawn.update(0)) expect(e.pos).toBeLessThanOrEqual(settings.spawn.spawnDistance + 0.001);
  });
});

describe('isRowFair', () => {
  const free = (lanes, span = null) => ({ span, freeLanes: span ? [] : lanes });

  it('rifiuta file senza corsie libere e doppi ostacoli a tutta larghezza', () => {
    expect(isRowFair(null, free([]), 1)).toBe(false);
    expect(isRowFair(free([], 'hurdle'), free([], 'banner'), 2)).toBe(false);
    expect(isRowFair(null, free([], 'hurdle'), 2)).toBe(true);
  });

  it('con poco tempo non richiede due cambi di corsia', () => {
    expect(isRowFair(free([0]), free([2]), 1.0)).toBe(true);
    expect(isRowFair(free([0]), free([2]), 0.7)).toBe(false);
    expect(isRowFair(free([0]), free([1]), 0.7)).toBe(true);
  });
});
