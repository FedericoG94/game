import { Simulation } from '../../src/game/Simulation.js';

/** Bot semplice: evita i blocchi, prende i pacchi positivi, salta/scivola quando serve. */
export function botDecide(sim, { collectNegative = false } = {}) {
  const speed = Math.max(sim.state.speed, 6);
  const horizon = speed * 1.3;
  const cost = [0, 0, 0];
  for (const e of sim.entities) {
    if (e.consumed) continue;
    const z = sim.zOf(e.pos);
    if (z < 0 || z > horizon) continue;
    const w = 1 - z / horizon + 0.2;
    if (e.kind === 'obstacle' && !e.span) cost[e.lane] += 100 * w;
    else if (e.kind === 'gift') cost[e.lane] += (e.gift.type === 'positive' || collectNegative ? -3 : 6) * w;
  }
  let target = sim.motion.lane;
  let best = cost[target] - 0.5;
  for (let l = 0; l < 3; l++) {
    if (cost[l] < best) {
      best = cost[l];
      target = l;
    }
  }
  if (target < sim.motion.lane) sim.left();
  else if (target > sim.motion.lane) sim.right();

  for (const e of sim.entities) {
    if (e.consumed || !e.span) continue;
    const z = sim.zOf(e.pos);
    if (e.obstacleType === 'hurdle' && z > 0 && z < speed * 0.3) sim.jump();
    if (e.obstacleType === 'banner' && z > 0 && z < speed * 0.22) sim.slide();
  }
}

/** Esegue una corsa completa; restituisce il riepilogo e il numero di passi. */
export function playFullRun(settings, gifts, { seed = 1, dt = 1 / 60, bot = true, maxSeconds = 600, onEvent } = {}) {
  const sim = new Simulation(settings, gifts, { seed });
  sim.start();
  let steps = 0;
  let summary = null;
  const hits = [];
  while (sim.phase !== 'finished' && steps * dt < maxSeconds) {
    if (bot) botDecide(sim);
    sim.step(dt);
    for (const ev of sim.drainEvents()) {
      onEvent?.(ev);
      if (ev.type === 'hit') hits.push(ev);
      if (ev.type === 'finished') summary = ev.summary;
    }
    steps++;
  }
  return { sim, summary, steps, hits };
}
