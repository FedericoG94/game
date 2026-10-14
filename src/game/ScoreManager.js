/**
 * Punteggio, combo e statistiche. Il registro delle sorprese è alimentato
 * esclusivamente dagli eventi reali di raccolta.
 */
export class ScoreManager {
  constructor(scoringConfig) {
    this.cfg = scoringConfig;
    this.reset();
  }

  reset() {
    this.score = 0;
    this.combo = 0;
    this.stats = { collected: 0, positive: 0, negative: 0, obstaclesHit: 0, bestCombo: 0 };
    /** giftId -> { gift, count, order, totalPoints } */
    this.log = new Map();
  }

  /** Moltiplicatore della catena di regali positivi consecutivi. */
  comboMultiplier(combo = this.combo) {
    if (combo <= 1) return 1;
    return Math.min(this.cfg.comboMax, 1 + (combo - 1) * this.cfg.comboStep);
  }

  _apply(nominal) {
    const before = this.score;
    this.score += nominal;
    if (this.cfg.floorAtZero && this.score < 0) this.score = 0;
    return { nominal, applied: this.score - before, score: this.score };
  }

  applyGift(gift) {
    const positive = gift.type === 'positive';
    let multiplier = 1;
    let nominal;
    if (positive) {
      this.combo += 1;
      this.stats.bestCombo = Math.max(this.stats.bestCombo, this.combo);
      multiplier = this.comboMultiplier();
      nominal = Math.round(gift.points * multiplier);
      this.stats.positive += 1;
    } else {
      this.combo = 0;
      nominal = gift.points;
      this.stats.negative += 1;
    }
    this.stats.collected += 1;

    const entry = this.log.get(gift.id);
    if (entry) {
      entry.count += 1;
      entry.totalPoints += nominal;
    } else {
      this.log.set(gift.id, { gift, count: 1, order: this.log.size, totalPoints: nominal });
    }
    return { ...this._apply(nominal), multiplier, combo: this.combo, positive };
  }

  applyObstacle() {
    this.combo = 0;
    this.stats.obstaclesHit += 1;
    return { ...this._apply(this.cfg.obstaclePenalty), multiplier: 1, combo: 0 };
  }

  applyFinishBonus() {
    return this._apply(this.cfg.finishBonus);
  }

  /** Sorprese scoperte, in ordine di prima apparizione, senza duplicati. */
  registry() {
    return [...this.log.values()].sort((a, b) => a.order - b.order);
  }
}
