import { lerp, smoothstep, weightedPick } from './rng.js';

export const LANES = [0, 1, 2];

/** Tempi usati per garantire che ogni fila sia raggiungibile dalla precedente. */
const LANE_CHANGE_SEC = 0.2;
const REACTION_SEC = 0.45;

const OBSTACLE_BY_ROW = { hurdle: 'hurdle', banner: 'banner' };

/**
 * Una fila è "equa" se esiste sempre una scelta ragionevole:
 *  - almeno una corsia libera (oppure è un ostacolo a tutta larghezza da saltare/scivolare);
 *  - mai due ostacoli a tutta larghezza di fila;
 *  - da qualunque corsia libera della fila precedente si raggiunge una corsia libera
 *    nel tempo disponibile (cambio corsia + tempo di reazione).
 */
export function isRowFair(prev, row, gapSec) {
  if (!row.span && row.freeLanes.length === 0) return false;
  if (row.span && prev?.span) return false;
  if (row.span) return true;
  if (!prev) return true;
  const sources = prev.span ? LANES : prev.freeLanes;
  const budget = gapSec - REACTION_SEC;
  return sources.every((a) => row.freeLanes.some((b) => Math.abs(a - b) * LANE_CHANGE_SEC <= budget));
}

/**
 * Genera le file di pacchi e ostacoli man mano che il giocatore avanza.
 * Lavora in coordinate di percorso (`pos` in metri dal via): la posizione
 * davanti al giocatore è `pos - distanza`.
 */
export class SpawnManager {
  /**
   * @param {object} opts
   * @param {object} opts.spawn      config.spawn
   * @param {number} opts.trackLength lunghezza del percorso
   * @param {(p:number)=>number} opts.baseSpeed profilo di velocità
   * @param {import('./GiftPicker.js').GiftPicker} opts.picker
   * @param {() => number} opts.rng
   */
  constructor({ spawn, trackLength, baseSpeed, picker, rng }) {
    this.cfg = spawn;
    this.trackLength = trackLength;
    this.baseSpeed = baseSpeed;
    this.picker = picker;
    this.rng = rng;
    this.reset();
  }

  reset() {
    this.nextRowPos = this.cfg.firstRowAt;
    this.nextId = 1;
    this.prevRow = null;
    /** Corsia dell'ultimo regalo obbligatorio (per garantire che il successivo sia raggiungibile). */
    this.prevGiftLane = null;
    /** Secondi tra la fila precedente e quella in costruzione (infinito per la prima). */
    this.gapBeforeSec = Infinity;
    this.rowCount = 0;
    /** Piano delle file generate (anche quelle vuote): utile per test e diagnostica. */
    this.plan = [];
  }

  /** Genera le righe necessarie e restituisce le nuove entità (gift/obstacle). */
  update(distance) {
    const out = [];
    const lastPos = this.trackLength - this.cfg.clearBeforeGate;
    while (this.nextRowPos - distance <= this.cfg.spawnDistance && this.nextRowPos <= lastPos) {
      const progress = this.nextRowPos / this.trackLength;
      const speed = this.baseSpeed(progress);
      const interval = lerp(this.cfg.rowIntervalSec.start, this.cfg.rowIntervalSec.end, smoothstep(progress));
      const spacing = Math.max(interval, this.cfg.minRowGapSec) * speed;
      this.rowsLeft = this._countRowsLeft(lastPos);
      const row = this._planRow(progress, spacing / speed);
      this.prevRow = row;
      this.gapBeforeSec = spacing / speed;
      this.plan.push({ pos: row.pos, type: row.type, span: row.span, freeLanes: row.freeLanes });
      this.rowCount += 1;
      for (const cell of row.cells) out.push(this._entityFor(cell, row));
      this.nextRowPos += spacing;
    }
    return out;
  }

  /** File ancora da generare (inclusa quella corrente), simulando la stessa spaziatura. */
  _countRowsLeft(lastPos) {
    let pos = this.nextRowPos;
    let n = 0;
    while (pos <= lastPos) {
      const progress = pos / this.trackLength;
      const speed = this.baseSpeed(progress);
      const interval = lerp(this.cfg.rowIntervalSec.start, this.cfg.rowIntervalSec.end, smoothstep(progress));
      pos += Math.max(interval, this.cfg.minRowGapSec) * speed;
      n += 1;
    }
    return n;
  }

  _stageWeights(progress) {
    let stage = this.cfg.stages[0];
    for (const s of this.cfg.stages) if (s.from <= progress) stage = s;
    return Object.entries(stage.weights);
  }

  _planRow(progress, gapSec) {
    const weights = this._stageWeights(progress);
    let row = null;
    for (let attempt = 0; attempt < 12; attempt++) {
      const type = weightedPick(this.rng, weights);
      const candidate = this._structure(type);
      // Se restano regali obbligatori, non si sprecano file senza pacchi oltre il margine disponibile.
      const slack = this.rowsLeft - this.picker.pending;
      // Con una sola corsia libera non si obbliga a prendere una sorpresa negativa: la fila non serve la coda.
      const canServe = this.picker.canServe(candidate.freeLanes.length === 1, slack <= 0);
      const hasGift = canServe && candidate.cells.some((c) => c.kind === 'gift');
      if (this.picker.pending > 0 && !hasGift && slack <= 0) continue;
      if (this.picker.pending > 0 && hasGift && !this._reachableCell(candidate)) continue;
      if (isRowFair(this.prevRow, candidate, gapSec)) {
        row = candidate;
        break;
      }
    }
    if (!row) {
      // Ripiego sempre valido: pacchi in tutte e tre le corsie, quindi uno è sicuramente raggiungibile.
      row = this._structure('gifts');
      if (!this._reachableCell(row)) {
        row.cells = LANES.map((lane) => ({ kind: 'gift', lane }));
      }
    }
    this._assignGifts(row, progress);
    row.pos = this.nextRowPos;
    return row;
  }

  /** Primo pacco della fila raggiungibile dall'ultimo regalo obbligatorio nel tempo disponibile. */
  _reachableCell(row) {
    const budget = this.gapBeforeSec - REACTION_SEC;
    return row.cells.find(
      (c) => c.kind === 'gift' && (this.prevGiftLane === null || Math.abs(c.lane - this.prevGiftLane) * LANE_CHANGE_SEC <= budget),
    );
  }

  _shuffledLanes() {
    const lanes = [...LANES];
    for (let i = lanes.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
    }
    return lanes;
  }

  /** Disegna la struttura della fila (dove stanno ostacoli e pacchi) senza scegliere i regali. */
  _structure(type) {
    const lanes = this._shuffledLanes();
    const cells = [];
    let span = null;
    const obstacle = (lane, obstacleType) => cells.push({ kind: 'obstacle', obstacleType, lane, span: false });
    const gift = (lane) => cells.push({ kind: 'gift', lane });

    switch (type) {
      case 'empty':
        break;
      case 'gifts': {
        const count = weightedPick(this.rng, [[1, 3], [2, 2], [3, 1]]);
        for (let i = 0; i < count; i++) gift(lanes[i]);
        break;
      }
      case 'mixed': {
        obstacle(lanes[0], 'block');
        gift(lanes[1]);
        if (this.rng() < 0.5) gift(lanes[2]);
        break;
      }
      case 'blocks': {
        obstacle(lanes[0], 'block');
        obstacle(lanes[1], 'block');
        if (this.rng() < 0.8) gift(lanes[2]);
        break;
      }
      case 'hurdle':
      case 'banner':
        span = OBSTACLE_BY_ROW[type];
        cells.push({ kind: 'obstacle', obstacleType: span, lane: 1, span: true });
        break;
      default:
        break;
    }

    const blocked = new Set(cells.filter((c) => c.kind === 'obstacle' && !c.span).map((c) => c.lane));
    const freeLanes = span ? [] : LANES.filter((l) => !blocked.has(l));
    return { type, span, cells, freeLanes };
  }

  /** Sceglie i regali veri per i pacchi della fila (stato dell'estrattore aggiornato solo qui). */
  _assignGifts(row, progress) {
    // Al massimo un regalo obbligatorio per fila: si può raccogliere un solo pacco per fila.
    let requiredUsed = false;
    const reachable = this.picker.pending > 0 ? this._reachableCell(row) : null;
    for (const cell of row.cells) {
      if (cell.kind !== 'gift') continue;
      if (!requiredUsed && (cell === reachable || !reachable)) {
        const required = this.picker.pickRequired({ forcePositive: row.freeLanes.length === 1, urgent: this.rowsLeft - this.picker.pending <= 0 });
        if (required) {
          cell.gift = required;
          requiredUsed = true;
          this.prevGiftLane = cell.lane;
          continue;
        }
      }
      // Se c'è una sola via libera non obblighiamo mai a prendere una sorpresa negativa.
      cell.gift = this.picker.pick({ progress, forcePositive: row.freeLanes.length === 1 });
    }
    if (!requiredUsed && this.picker.pending > 0) this.prevGiftLane = null;
  }

  _entityFor(cell, row) {
    const base = { id: this.nextId++, pos: row.pos, lane: cell.lane, consumed: false, kind: cell.kind, row: this.rowCount };
    if (cell.kind === 'gift') return { ...base, gift: cell.gift };
    return { ...base, obstacleType: cell.obstacleType, span: cell.span };
  }
}
