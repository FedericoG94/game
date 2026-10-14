import { describe, it, expect } from 'vitest';
import { config } from '../src/data/config.js';
import { gifts, categories } from '../src/data/gifts.js';
import { normalizeConfig, normalizeGifts, fillTemplate } from '../src/data/validate.js';

describe('normalizeConfig', () => {
  it('accetta la configurazione di default senza avvisi', () => {
    const { warnings } = normalizeConfig(config, config);
    expect(warnings).toEqual([]);
  });

  it('corregge valori fuori range e li segnala', () => {
    const bad = structuredClone(config);
    bad.gifts.positiveChance = 3;
    bad.run.startSpeed = -4;
    bad.audio.musicVolume = 'alto';
    const { config: fixed, warnings } = normalizeConfig(bad, config);
    expect(fixed.gifts.positiveChance).toBe(1);
    expect(fixed.run.startSpeed).toBe(3);
    expect(fixed.audio.musicVolume).toBe(config.audio.musicVolume);
    expect(warnings.length).toBeGreaterThanOrEqual(3);
  });

  it('impedisce intervalli di spawn che renderebbero i percorsi impossibili', () => {
    const bad = structuredClone(config);
    bad.spawn.rowIntervalSec.end = 0.6;
    const { config: fixed } = normalizeConfig(bad, config);
    expect(fixed.spawn.rowIntervalSec.end).toBeGreaterThanOrEqual(fixed.spawn.minRowGapSec);
  });

  it('ripristina fasi di spawn mancanti e colori non validi', () => {
    const bad = structuredClone(config);
    bad.spawn.stages = [];
    bad.character.hair = 'rosso';
    const { config: fixed, warnings } = normalizeConfig(bad, config);
    expect(fixed.spawn.stages.length).toBeGreaterThan(0);
    expect(fixed.character.hair).toBe(config.character.hair);
    expect(warnings.some((w) => w.includes('character.hair'))).toBe(true);
  });

  it('accetta gli override dell’arte e scarta quelli non validi', () => {
    const cfg = structuredClone(config);
    cfg.assets.overrides = { 'c-hat': '/assets/characters/hat.png', 'c-arm': 42, 'box-persone': '  assets/x.webp  ' };
    const { config: fixed, warnings } = normalizeConfig(cfg, config);
    expect(fixed.assets.overrides).toEqual({ 'c-hat': 'assets/characters/hat.png', 'box-persone': 'assets/x.webp' });
    expect(warnings.some((w) => w.includes('c-arm'))).toBe(true);
    cfg.assets.overrides = 'sbagliato';
    expect(normalizeConfig(cfg, config).config.assets.overrides).toEqual({});
  });

  it('non fallisce con input non oggetto', () => {
    expect(() => normalizeConfig(null, config)).not.toThrow();
  });
});

describe('normalizeGifts', () => {
  it('accetta il catalogo di default senza avvisi', () => {
    const { warnings, gifts: out } = normalizeGifts(gifts, categories);
    expect(warnings).toEqual([]);
    expect(out.length).toBe(gifts.length);
  });

  it('il catalogo di default ha positivi, negativi e almeno un raro', () => {
    expect(gifts.some((g) => g.type === 'positive')).toBe(true);
    expect(gifts.some((g) => g.type === 'negative')).toBe(true);
    expect(gifts.some((g) => g.rarity === 'rare')).toBe(true);
  });

  it('corregge segni dei punti, id duplicati e campi mancanti', () => {
    const { gifts: out, warnings } = normalizeGifts(
      [
        { id: 'a', type: 'positive', points: -10, category: 'x' },
        { id: 'a', type: 'negative', points: 20, category: 'x', rarity: 'rare' },
        { type: 'positive' },
        'non-un-oggetto',
      ],
      { x: { label: 'X', color: '#ffffff', ribbon: '#000000', symbol: 'heart' } },
    );
    expect(out[0].points).toBe(10);
    expect(out[1].points).toBe(-20);
    expect(out[1].rarity).toBe('common');
    expect(new Set(out.map((g) => g.id)).size).toBe(out.length);
    expect(out[2].message.length).toBeGreaterThan(0);
    expect(warnings.length).toBeGreaterThan(3);
  });

  it('crea uno stile per le categorie non definite', () => {
    const { categories: cats } = normalizeGifts([{ id: 'z', type: 'positive', category: 'nuova' }], {});
    expect(cats.nuova.color).toMatch(/^#/);
  });

  it('garantisce sempre almeno un regalo positivo', () => {
    const { gifts: out } = normalizeGifts([{ id: 'n', type: 'negative', points: -5 }], {});
    expect(out.some((g) => g.type === 'positive')).toBe(true);
    expect(normalizeGifts(undefined, undefined).gifts.length).toBe(1);
  });
});

describe('fillTemplate', () => {
  it('sostituisce i segnaposto noti e lascia gli altri', () => {
    expect(fillTemplate('Ciao {name}, {score} {ignoto}', { name: 'Carlotta', score: 5 })).toBe('Ciao Carlotta, 5 {ignoto}');
  });
});
