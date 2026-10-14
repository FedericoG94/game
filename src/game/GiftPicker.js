import { lerp, weightedPick } from './rng.js';

const RECENT_PENALTY = 0.15;

/**
 * Sceglie quale regalo contiene un pacco quando viene generato.
 * Rispetta le probabilità di config, impedisce serie troppo punitive di
 * sorprese negative e evita di ripetere subito gli stessi regali.
 */
export class GiftPicker {
  constructor(gifts, giftsConfig, rng) {
    this.cfg = giftsConfig;
    this.rng = rng;
    this.all = gifts;
    this.positives = gifts.filter((g) => g.type === 'positive' && g.rarity !== 'rare');
    this.rares = gifts.filter((g) => g.type === 'positive' && g.rarity === 'rare');
    this.negatives = gifts.filter((g) => g.type === 'negative');
    this.reset();
  }

  reset() {
    this.negativeStreak = 0;
    this.recent = [];
    /** Regali che devono comparire almeno una volta nella corsa (in ordine casuale). */
    this.queue = this.cfg.guaranteeAll === false ? [] : this._shuffled(this.all);
  }

  _shuffled(list) {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** Quanti regali devono ancora comparire. */
  get pending() {
    return this.queue.length;
  }

  /** True se la coda ha un regalo adatto alla prossima fila (rispettando serie negative e corsia unica). */
  canServe(forcePositive, urgent = false) {
    const mustBePositive = forcePositive || (!urgent && this.negativeStreak >= this.cfg.maxNegativeStreak);
    return this.queue.some((g) => !mustBePositive || g.type === 'positive');
  }

  /**
   * Prossimo regalo "obbligatorio": il primo della coda compatibile con le regole
   * (niente serie negative troppo lunghe salvo urgenza di spazio, o solo positivi se richiesto). Null se la coda è vuota.
   */
  pickRequired({ forcePositive = false, urgent = false } = {}) {
    const mustBePositive = forcePositive || (!urgent && this.negativeStreak >= this.cfg.maxNegativeStreak);
    let idx = this.queue.findIndex((g) => !mustBePositive || g.type === 'positive');
    if (idx < 0) return null;
    const [gift] = this.queue.splice(idx, 1);
    this.negativeStreak = gift.type === 'negative' ? this.negativeStreak + 1 : 0;
    this.recent.push(gift.id);
    if (this.recent.length > this.cfg.repeatMemory) this.recent.shift();
    return gift;
  }

  rareChance(progress) {
    return lerp(this.cfg.rareChance.start, this.cfg.rareChance.end, Math.min(1, Math.max(0, progress)));
  }

  /**
   * @param {{progress?: number, forcePositive?: boolean}} opts
   */
  pick({ progress = 0, forcePositive = false } = {}) {
    const mustBePositive =
      forcePositive || this.negatives.length === 0 || this.negativeStreak >= this.cfg.maxNegativeStreak;
    const positive = mustBePositive || this.rng() < this.cfg.positiveChance;

    let pool;
    if (positive) {
      const wantRare = this.rares.length > 0 && this.rng() < this.rareChance(progress);
      pool = wantRare ? this.rares : this.positives.length ? this.positives : this.rares;
    } else {
      pool = this.negatives;
    }

    const memory = this.recent;
    const gift = weightedPick(
      this.rng,
      pool.map((g) => [g, g.weight * (memory.includes(g.id) ? RECENT_PENALTY : 1)]),
    );

    this.negativeStreak = gift.type === 'negative' ? this.negativeStreak + 1 : 0;
    this.recent.push(gift.id);
    if (this.recent.length > this.cfg.repeatMemory) this.recent.shift();
    return gift;
  }
}
