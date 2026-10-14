/**
 * Controlli runtime di configurazione e regali.
 * Nessuna funzione lancia errori: i valori non validi vengono corretti con un
 * default sensato e descritti in `warnings`, così un refuso nei file di dati
 * non può mai bloccare il gioco.
 */

export const GIFT_TYPES = ['positive', 'negative'];
export const GIFT_RARITIES = ['common', 'rare'];
export const GIFT_EFFECTS = ['confetti', 'hearts', 'stars', 'golden', 'smoke', 'glitch', 'dark-confetti'];
export const GIFT_SOUNDS = ['positive', 'rare', 'negative', 'troll'];
export const BOX_SYMBOLS = ['heart', 'ball', 'flag', 'volley', 'star', 'smile', 'mail', 'camera', 'question', 'sparkle'];

const HEX = /^#[0-9a-fA-F]{6}$/;

export const FALLBACK_CATEGORY = { label: 'Sorpresa', color: '#ff8fc0', ribbon: '#ffd34d', symbol: 'sparkle' };

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => (o[k] = isObj(o[k]) ? o[k] : {}), obj);
  target[last] = value;
}

/** Intervalli ammessi per i numeri di configurazione: [percorso, min, max]. */
const NUMBER_RULES = [
  ['run.targetDurationSec', 10, 600],
  ['run.startSpeed', 3, 30],
  ['run.maxSpeed', 3, 40],
  ['run.maxSpeedAtProgress', 0.2, 1],
  ['run.countdownSec', 0, 6],
  ['run.resumeCountdownSec', 0, 6],
  ['run.finale.spectacleFromProgress', 0.5, 0.99],
  ['run.finale.gateToGiftMeters', 15, 120],
  ['run.finale.stopDistance', 4, 20],
  ['run.finale.brakeStrength', 0.5, 6],
  ['lanes.widthMeters', 0.6, 3],
  ['lanes.changeSharpness', 8, 60],
  ['player.jumpDurationSec', 0.3, 1.5],
  ['player.jumpHeight', 0.9, 3],
  ['player.slideDurationSec', 0.25, 1.5],
  ['player.inputBufferSec', 0, 0.5],
  ['spawn.spawnDistance', 30, 120],
  ['spawn.firstRowAt', 10, 120],
  ['spawn.clearBeforeGate', 5, 100],
  ['spawn.rowIntervalSec.start', 0.6, 5],
  ['spawn.rowIntervalSec.end', 0.6, 5],
  ['spawn.minRowGapSec', 0.5, 3],
  ['gifts.positiveChance', 0, 1],
  ['gifts.rareChance.start', 0, 1],
  ['gifts.rareChance.end', 0, 1],
  ['gifts.maxNegativeStreak', 0, 10],
  ['gifts.repeatMemory', 0, 10],
  ['scoring.comboStep', 0, 2],
  ['scoring.comboMax', 1, 10],
  ['scoring.finishBonus', 0, 100000],
  ['penalties.negativeGift.speedFactor', 0.1, 1],
  ['penalties.negativeGift.durationSec', 0, 10],
  ['penalties.obstacle.speedFactor', 0.1, 1],
  ['penalties.obstacle.durationSec', 0, 10],
  ['penalties.obstacle.invulnerableSec', 0, 10],
  ['reveal.slowMoScale', 0.05, 1],
  ['reveal.slowMoSec', 0, 3],
  ['reveal.cardSec', 0.8, 10],
  ['audio.musicVolume', 0, 1],
  ['audio.sfxVolume', 0, 1],
  ['quality.particles', 0.1, 1],
  ['quality.maxPixelRatio', 1, 3],
];

function deepClone(v) {
  if (Array.isArray(v)) return v.map(deepClone);
  if (isObj(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepClone(x)]));
  return v;
}

/** Sostituisce {name}, {score}, ... nel testo; i segnaposto sconosciuti restano com'erano. */
export function fillTemplate(text, values) {
  return String(text ?? '').replace(/\{(\w+)\}/g, (m, key) => (key in values ? String(values[key]) : m));
}

/**
 * Restituisce una copia corretta della configurazione e l'elenco dei problemi trovati.
 * @param {object} raw configurazione grezza
 * @param {object} defaults configurazione di riferimento (valori usati per i campi mancanti)
 */
export function normalizeConfig(raw, defaults = raw) {
  const warnings = [];
  const cfg = deepClone(isObj(raw) ? raw : {});

  for (const [path, min, max] of NUMBER_RULES) {
    const value = getPath(cfg, path);
    if (!isNum(value)) {
      const fallback = getPath(defaults, path);
      if (isNum(fallback)) {
        setPath(cfg, path, fallback);
        warnings.push(`config.${path}: valore mancante o non numerico, uso ${fallback}`);
      }
      continue;
    }
    if (value < min || value > max) {
      const clamped = Math.min(max, Math.max(min, value));
      setPath(cfg, path, clamped);
      warnings.push(`config.${path}: ${value} fuori range [${min}, ${max}], uso ${clamped}`);
    }
  }

  if (isNum(cfg.run?.startSpeed) && isNum(cfg.run?.maxSpeed) && cfg.run.maxSpeed < cfg.run.startSpeed) {
    warnings.push('config.run.maxSpeed è minore di startSpeed: lo allineo');
    cfg.run.maxSpeed = cfg.run.startSpeed;
  }

  if (isNum(cfg.spawn?.minRowGapSec) && isNum(cfg.spawn?.rowIntervalSec?.end) && cfg.spawn.rowIntervalSec.end < cfg.spawn.minRowGapSec) {
    warnings.push('config.spawn.rowIntervalSec.end è sotto minRowGapSec: lo alzo per garantire percorsi superabili');
    cfg.spawn.rowIntervalSec.end = cfg.spawn.minRowGapSec;
  }
  if (isNum(cfg.spawn?.minRowGapSec) && isNum(cfg.spawn?.rowIntervalSec?.start) && cfg.spawn.rowIntervalSec.start < cfg.spawn.minRowGapSec) {
    cfg.spawn.rowIntervalSec.start = cfg.spawn.minRowGapSec;
  }

  if (!Array.isArray(cfg.spawn?.stages) || cfg.spawn.stages.length === 0 || !isObj(cfg.spawn.stages[0])) {
    warnings.push('config.spawn.stages mancante: uso le fasi predefinite');
    setPath(cfg, 'spawn.stages', deepClone(getPath(defaults, 'spawn.stages')));
  } else {
    cfg.spawn.stages = cfg.spawn.stages
      .filter((s) => isObj(s) && isNum(s.from) && isObj(s.weights))
      .sort((a, b) => a.from - b.from);
    if (cfg.spawn.stages.length === 0) {
      warnings.push('config.spawn.stages non valido: uso le fasi predefinite');
      setPath(cfg, 'spawn.stages', deepClone(getPath(defaults, 'spawn.stages')));
    } else if (cfg.spawn.stages[0].from > 0) {
      cfg.spawn.stages[0].from = 0;
    }
  }

  for (const path of ['meta.playerName', 'meta.title', 'intro.title', 'intro.startLabel', 'finale.title']) {
    if (!isStr(getPath(cfg, path))) {
      setPath(cfg, path, getPath(defaults, path) ?? '');
      warnings.push(`config.${path}: testo mancante, uso il valore predefinito`);
    }
  }
  if (!Array.isArray(cfg.finale?.paragraphs)) {
    setPath(cfg, 'finale.paragraphs', deepClone(getPath(defaults, 'finale.paragraphs') ?? []));
    warnings.push('config.finale.paragraphs deve essere un elenco di testi');
  } else {
    cfg.finale.paragraphs = cfg.finale.paragraphs.filter(isStr);
  }

  const rawOverrides = cfg.assets?.overrides;
  const overrides = {};
  if (rawOverrides !== undefined && !isObj(rawOverrides)) warnings.push('config.assets.overrides deve essere un oggetto { chiave: percorso }');
  for (const [key, path] of Object.entries(isObj(rawOverrides) ? rawOverrides : {})) {
    if (isStr(path)) overrides[key] = path.trim().replace(/^\/+/, '');
    else warnings.push(`config.assets.overrides.${key}: percorso non valido, ignorato`);
  }
  setPath(cfg, 'assets.overrides', overrides);

  for (const key of ['skin', 'hair', 'outfit', 'outfitAccent', 'pants', 'shoes', 'accessoryColor']) {
    const v = cfg.character?.[key];
    if (!HEX.test(v ?? '')) {
      setPath(cfg, `character.${key}`, getPath(defaults, `character.${key}`));
      warnings.push(`config.character.${key}: colore non valido (serve #rrggbb)`);
    }
  }
  if (!['partyHat', 'none'].includes(cfg.character?.accessory)) {
    setPath(cfg, 'character.accessory', 'none');
    warnings.push("config.character.accessory deve essere 'partyHat' oppure 'none'");
  }

  return { config: cfg, warnings };
}

/**
 * Normalizza catalogo e categorie dei regali.
 * Garantisce sempre almeno un regalo positivo, così il gioco resta giocabile.
 */
export function normalizeGifts(rawGifts, rawCategories = {}) {
  const warnings = [];
  const categories = {};
  for (const [id, c] of Object.entries(isObj(rawCategories) ? rawCategories : {})) {
    if (!isObj(c)) continue;
    categories[id] = {
      label: isStr(c.label) ? c.label : id,
      color: HEX.test(c.color ?? '') ? c.color : FALLBACK_CATEGORY.color,
      ribbon: HEX.test(c.ribbon ?? '') ? c.ribbon : FALLBACK_CATEGORY.ribbon,
      symbol: BOX_SYMBOLS.includes(c.symbol) ? c.symbol : FALLBACK_CATEGORY.symbol,
    };
    if (!HEX.test(c.color ?? '') || !HEX.test(c.ribbon ?? '') || !BOX_SYMBOLS.includes(c.symbol)) {
      warnings.push(`categoria "${id}": colore o simbolo non valido, uso un valore predefinito`);
    }
  }

  const list = [];
  const seen = new Set();
  (Array.isArray(rawGifts) ? rawGifts : []).forEach((g, index) => {
    if (!isObj(g)) {
      warnings.push(`regalo #${index}: non è un oggetto, ignorato`);
      return;
    }
    let id = isStr(g.id) ? g.id.trim() : `regalo-${index}`;
    if (!isStr(g.id)) warnings.push(`regalo #${index}: id mancante, uso "${id}"`);
    if (seen.has(id)) {
      const unique = `${id}-${index}`;
      warnings.push(`regalo "${id}": id duplicato, rinominato "${unique}"`);
      id = unique;
    }
    seen.add(id);

    let type = g.type;
    if (!GIFT_TYPES.includes(type)) {
      type = isNum(g.points) && g.points < 0 ? 'negative' : 'positive';
      warnings.push(`regalo "${id}": type non valido, dedotto "${type}"`);
    }

    let rarity = GIFT_RARITIES.includes(g.rarity) ? g.rarity : 'common';
    if (g.rarity !== undefined && !GIFT_RARITIES.includes(g.rarity)) warnings.push(`regalo "${id}": rarity non valida, uso "common"`);
    if (type === 'negative' && rarity === 'rare') {
      rarity = 'common';
      warnings.push(`regalo "${id}": i regali rari devono essere positivi, rarity impostata a "common"`);
    }

    let points = isNum(g.points) ? Math.round(g.points) : type === 'positive' ? 100 : -50;
    if (!isNum(g.points)) warnings.push(`regalo "${id}": points mancante, uso ${points}`);
    if (type === 'positive' && points < 0) {
      points = Math.abs(points);
      warnings.push(`regalo "${id}": positivo con punti negativi, corretto in ${points}`);
    }
    if (type === 'negative' && points > 0) {
      points = -points;
      warnings.push(`regalo "${id}": negativo con punti positivi, corretto in ${points}`);
    }

    let category = isStr(g.category) ? g.category : 'altro';
    if (!categories[category]) {
      warnings.push(`regalo "${id}": categoria "${category}" non definita, uso lo stile predefinito`);
      categories[category] = { ...FALLBACK_CATEGORY, label: category };
    }

    const weight = isNum(g.weight) && g.weight > 0 ? g.weight : 1;
    if (!(isNum(g.weight) && g.weight > 0)) warnings.push(`regalo "${id}": weight non valido, uso 1`);

    list.push({
      id,
      name: isStr(g.name) ? g.name : 'Sorpresa misteriosa',
      category,
      type,
      image: isStr(g.image) ? g.image.trim().replace(/^\/+/, '') : '',
      message: isStr(g.message) ? g.message : type === 'positive' ? 'Che bella sorpresa!' : 'Ops… che sorpresa!',
      points,
      rarity,
      weight,
      effect: GIFT_EFFECTS.includes(g.effect) ? g.effect : type === 'positive' ? 'confetti' : 'smoke',
      sound: GIFT_SOUNDS.includes(g.sound) ? g.sound : type === 'positive' ? 'positive' : 'negative',
    });
  });

  if (!list.some((g) => g.type === 'positive')) {
    warnings.push('nessun regalo positivo valido: aggiungo un regalo generico di emergenza');
    if (!categories.altro) categories.altro = { ...FALLBACK_CATEGORY, label: 'Sorpresa' };
    list.push({
      id: 'regalo-emergenza',
      name: 'Regalo a sorpresa',
      category: 'altro',
      type: 'positive',
      image: '',
      message: 'Una sorpresa per te!',
      points: 100,
      rarity: 'common',
      weight: 1,
      effect: 'confetti',
      sound: 'positive',
    });
  }

  return { gifts: list, categories, warnings };
}
