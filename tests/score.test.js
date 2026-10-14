import { describe, it, expect } from 'vitest';
import { ScoreManager } from '../src/game/ScoreManager.js';

const scoring = { obstaclePenalty: -30, comboStep: 0.25, comboMax: 2, finishBonus: 500, floorAtZero: true };
const pos = (id, points = 100) => ({ id, type: 'positive', points });
const neg = (id, points = -60) => ({ id, type: 'negative', points });

describe('ScoreManager', () => {
  it('somma i regali positivi con moltiplicatore a catena', () => {
    const s = new ScoreManager(scoring);
    expect(s.applyGift(pos('a')).applied).toBe(100); // x1
    expect(s.applyGift(pos('b')).applied).toBe(125); // x1.25
    expect(s.applyGift(pos('c')).applied).toBe(150); // x1.5
    expect(s.score).toBe(375);
    expect(s.combo).toBe(3);
  });

  it('limita il moltiplicatore a comboMax', () => {
    const s = new ScoreManager(scoring);
    for (let i = 0; i < 10; i++) s.applyGift(pos('a'));
    expect(s.comboMultiplier()).toBe(2);
    expect(s.applyGift(pos('a')).applied).toBe(200);
  });

  it('una sorpresa negativa toglie punti e azzera la catena', () => {
    const s = new ScoreManager(scoring);
    s.applyGift(pos('a'));
    s.applyGift(pos('b'));
    const r = s.applyGift(neg('n', -60));
    expect(r.nominal).toBe(-60);
    expect(s.combo).toBe(0);
    expect(s.score).toBe(225 - 60);
    expect(s.applyGift(pos('c')).applied).toBe(100);
  });

  it('il punteggio non scende sotto zero e segnala il valore applicato', () => {
    const s = new ScoreManager(scoring);
    s.applyGift(pos('a', 20));
    const r = s.applyGift(neg('n', -60));
    expect(r.nominal).toBe(-60);
    expect(r.applied).toBe(-20);
    expect(s.score).toBe(0);
  });

  it('può ammettere punteggi negativi se configurato', () => {
    const s = new ScoreManager({ ...scoring, floorAtZero: false });
    s.applyGift(neg('n', -60));
    expect(s.score).toBe(-60);
  });

  it('gli ostacoli tolgono punti, azzerano la catena e sono contati', () => {
    const s = new ScoreManager(scoring);
    s.applyGift(pos('a'));
    s.applyGift(pos('b'));
    const r = s.applyObstacle();
    expect(r.nominal).toBe(-30);
    expect(s.combo).toBe(0);
    expect(s.stats.obstaclesHit).toBe(1);
  });

  it('il registro non duplica i regali ripetuti e conta le raccolte', () => {
    const s = new ScoreManager(scoring);
    s.applyGift(pos('a'));
    s.applyGift(neg('n'));
    s.applyGift(pos('a'));
    s.applyGift(pos('a'));
    const reg = s.registry();
    expect(reg.map((r) => r.gift.id)).toEqual(['a', 'n']);
    expect(reg[0].count).toBe(3);
    expect(reg[1].count).toBe(1);
    expect(s.stats).toMatchObject({ collected: 4, positive: 3, negative: 1 });
  });

  it('applica il bonus traguardo', () => {
    const s = new ScoreManager(scoring);
    s.applyFinishBonus();
    expect(s.score).toBe(500);
  });

  it('reset azzera tutto', () => {
    const s = new ScoreManager(scoring);
    s.applyGift(pos('a'));
    s.reset();
    expect(s.score).toBe(0);
    expect(s.registry()).toEqual([]);
    expect(s.stats.collected).toBe(0);
  });
});
