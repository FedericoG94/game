/**
 * CONFIGURAZIONE CENTRALE DI CARLOTTA'S GIFT RUN
 * ------------------------------------------------------------------
 * Questo è il file principale da modificare per personalizzare il gioco:
 * testi, messaggio finale, durata, difficoltà, probabilità, punteggi, aspetto
 * della protagonista, audio e accessibilità.
 *
 * I regali (foto, messaggi, punti) si modificano in `src/data/gifts.js`.
 *
 * Unità di misura del gioco: le distanze sono in "metri" virtuali, i tempi in
 * secondi. Tutti i valori vengono controllati all'avvio da `validate.js`
 * (valori fuori range vengono corretti e segnalati in console).
 */
export const config = {
  // ------------------------------------------------------------------
  // IDENTITÀ
  // ------------------------------------------------------------------
  meta: {
    title: "Carlotta's Gift Run",
    playerName: 'Carlotta',
    /** Chiave usata per salvare impostazioni e record nel browser. */
    storageKey: 'carlotta-gift-run:v1',
  },

  // ------------------------------------------------------------------
  // SCHERMATA INIZIALE (non svela la sorpresa finale)
  // ------------------------------------------------------------------
  intro: {
    title: "Carlotta's Gift Run",
    subtitle: 'Una corsa, tanti pacchi e qualche sorpresa… discutibile.',
    teaser: 'Cosa si nasconde nei pacchi? Corri e scoprilo!',
    startLabel: 'INIZIA LA CORSA',
    instructions: {
      touch: 'Scorri ← → per cambiare corsia · ↑ salta · ↓ scivola',
      keyboard: '← → / A D corsia · ↑ W Spazio salta · ↓ S scivola · Esc pausa',
    },
  },

  // ------------------------------------------------------------------
  // MESSAGGIO FINALE  (⚠ TESTO PROVVISORIO: sostituiscilo con il tuo!)
  // Segnaposto disponibili: {name} {score} {best} {positive} {negative} {total}
  // ------------------------------------------------------------------
  finale: {
    eyebrow: 'Il vero regalo era questo…',
    title: 'Buon compleanno, {name}!',
    paragraphs: [
      '[Messaggio provvisorio] Qui va il tuo augurio personale per {name}: modificalo in src/data/config.js, sezione "finale".',
      'Lungo la corsa hai aperto {total} pacchi: {positive} sorprese bellissime e {negative} decisamente… discutibili. Tutto previsto.',
    ],
    closing: 'Ti voglio bene! (frase provvisoria)',
    signature: '— Il tuo nome qui',
    scoreLabel: 'Punteggio finale',
    bestLabel: 'Record',
    playAgainLabel: 'GIOCA ANCORA',
    reviewLabel: 'RIVEDI LE SORPRESE',
    menuLabel: 'Torna al menu',
  },

  // ------------------------------------------------------------------
  // PERCORSO E VELOCITÀ
  // ------------------------------------------------------------------
  run: {
    /** Durata teorica della corsa senza rallentamenti (tutto il gioco, finale incluso, resta sotto i 30 s) (la lunghezza del percorso ne deriva). */
    targetDurationSec: 18,
    startSpeed: 9,
    maxSpeed: 16.5,
    /** Frazione del percorso a cui la velocità raggiunge il massimo. */
    maxSpeedAtProgress: 0.85,
    /** Secondi di "Pronti… Via!" prima di partire e dopo la pausa. */
    countdownSec: 1.8,
    resumeCountdownSec: 1.2,
    finale: {
      /** Da questo avanzamento l'ambiente diventa "speciale" (luci, stelle). */
      spectacleFromProgress: 0.88,
      /** Distanza tra il traguardo e il grande regalo. */
      gateToGiftMeters: 38,
      /** A quale distanza davanti a Carlotta si ferma. */
      stopDistance: 8.5,
      /** Più alto = frena più decisa. */
      brakeStrength: 2.1,
    },
  },

  lanes: {
    /** Larghezza di una corsia in metri virtuali. */
    widthMeters: 1.4,
    /** Rapidità del cambio corsia (più alto = più scattante). */
    changeSharpness: 24,
  },

  player: {
    jumpDurationSec: 0.68,
    jumpHeight: 1.55,
    slideDurationSec: 0.62,
    /** Tempo in cui un salto premuto "in anticipo" viene ricordato. */
    inputBufferSec: 0.14,
  },

  // ------------------------------------------------------------------
  // GENERAZIONE DEGLI OGGETTI E DIFFICOLTÀ
  // ------------------------------------------------------------------
  spawn: {
    /** Distanza (m) a cui gli oggetti compaiono all'orizzonte. */
    spawnDistance: 62,
    firstRowAt: 18,
    /** Metri completamente liberi prima del traguardo. */
    clearBeforeGate: 16,
    /** Secondi di corsa tra due file di oggetti: da inizio a fine percorso. */
    rowIntervalSec: { start: 1.6, end: 0.98 },
    /** Mai meno di questo tra due file (garantisce che ogni schema sia superabile). */
    minRowGapSec: 0.95,
    /** Pesi degli schemi in base all'avanzamento (si usa l'ultima fase con from <= avanzamento). */
    stages: [
      { from: 0.0, weights: { gifts: 6, mixed: 2, empty: 1 } },
      { from: 0.12, weights: { gifts: 4, mixed: 4, blocks: 2, hurdle: 1, empty: 1 } },
      { from: 0.35, weights: { gifts: 3, mixed: 4, blocks: 3, hurdle: 2, banner: 2, empty: 1 } },
      { from: 0.65, weights: { gifts: 3, mixed: 4, blocks: 4, hurdle: 2, banner: 2 } },
    ],
  },

  // ------------------------------------------------------------------
  // PROBABILITÀ DEI REGALI
  // ------------------------------------------------------------------
  gifts: {
    /** Probabilità che un pacco normale sia positivo (0.75 = 75%). */
    positiveChance: 0.75,
    /** Probabilità di un regalo raro (positivo): cresce con l'avanzamento. */
    rareChance: { start: 0.04, end: 0.12 },
    /** Massimo di sorprese negative consecutive generate. */
    maxNegativeStreak: 2,
    /** Quanti regali recenti evitare di ripetere subito. */
    repeatMemory: 3,
    /** I pacchi hanno colori/simboli leggermente diversi per categoria. */
    categoryHints: true,
  },

  // ------------------------------------------------------------------
  // PUNTEGGI
  // ------------------------------------------------------------------
  scoring: {
    obstaclePenalty: -30,
    /** Bonus per ogni regalo positivo consecutivo (0.25 = +25% a catena). */
    comboStep: 0.25,
    comboMax: 2,
    finishBonus: 500,
    /** Il punteggio non scende mai sotto zero. */
    floorAtZero: true,
  },

  // ------------------------------------------------------------------
  // CONSEGUENZE DI SORPRESE NEGATIVE E OSTACOLI (la corsa non finisce mai per questo)
  // ------------------------------------------------------------------
  penalties: {
    negativeGift: { speedFactor: 0.6, durationSec: 1.4 },
    obstacle: { speedFactor: 0.5, durationSec: 0.9, invulnerableSec: 1.4 },
  },

  // ------------------------------------------------------------------
  // APERTURA DEI PACCHI
  // ------------------------------------------------------------------
  reveal: {
    /** Rallentatore durante l'apertura: velocità del gioco e durata in secondi. */
    slowMoScale: 0.3,
    slowMoSec: 0.55,
    /** Quanto resta visibile la scheda della sorpresa. */
    cardSec: 3.0,
  },

  // ------------------------------------------------------------------
  // PROTAGONISTA (generica: colori sostituibili, nessun tratto inventato)
  // ------------------------------------------------------------------
  character: {
    name: 'Mini Carlotta',
    skin: '#f6c7a1',
    hair: '#6b3f2a',
    outfit: '#ff5fa2',
    outfitAccent: '#ffd34d',
    pants: '#4a6fe3',
    shoes: '#ffffff',
    /** 'partyHat' oppure 'none'. */
    accessory: 'partyHat',
    accessoryColor: '#a77bff',
  },

  // ------------------------------------------------------------------
  // SOSTITUZIONE DELL'ARTE (personaggio, pacchi, ostacoli…)
  // L'arte di partenza è disegnata dal codice. Per usare immagini tue basta copiarle in
  // `public/assets/...` e indicarle qui: chiave della texture → percorso relativo a `public/`.
  // Se un file manca o non si carica, il gioco usa automaticamente l'arte di partenza.
  // Le chiavi disponibili si vedono in `npm run dev` aprendo /dev/gallery.html
  // (per il personaggio: c-headFront, c-headBack, c-hairFront, c-hairMass, c-ponytail, c-hat,
  //  c-torsoFront, c-torsoBack, c-arm, c-legFront, c-legBack, c-faceNeutral/Happy/Shock/Disgust…).
  // Ogni immagine deve avere le stesse PROPORZIONI e lo stesso punto di perno della parte originale.
  // Esempio:
  //   overrides: { 'c-headFront': 'assets/characters/carlotta/head-front.png' },
  // ------------------------------------------------------------------
  assets: {
    overrides: {},
  },

  // ------------------------------------------------------------------
  // AUDIO E ACCESSIBILITÀ
  // ------------------------------------------------------------------
  audio: {
    enabled: true,
    musicVolume: 0.45,
    sfxVolume: 0.9,
  },

  accessibility: {
    /** 'auto' segue prefers-reduced-motion; true/false per forzare. */
    reducedMotion: 'auto',
    screenShake: true,
    /** Mostra i pulsanti touch a schermo (modificabili anche dal menu pausa). */
    touchButtons: false,
  },

  quality: {
    /** Moltiplicatore del numero di particelle (1 = pieno, 0.5 = ridotto). */
    particles: 1,
    /** Limite di risoluzione interna del canvas (rapporto pixel). */
    maxPixelRatio: 2,
  },
};
