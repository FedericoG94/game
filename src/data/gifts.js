/**
 * CATALOGO DEI REGALI DI CARLOTTA'S GIFT RUN
 * ------------------------------------------------------------------
 * ⚠ Tutti i contenuti qui sotto sono SEGNAPOSTO provvisori: nessuna persona
 *   reale è citata. Per personalizzare il gioco:
 *   1. copia la foto in `private/gifts/positive|negative|special/` (cartella NON pubblicata;
 *      consigliato WebP quadrato ~512×512, sotto i 150 KB);
 *   2. cambia `image` (resta nel formato `assets/gifts/positive/nome.png`), `name`,
 *      `message` e `points` del regalo;
 *   3. lancia `npm run encrypt:gifts`: cifra le foto in `public/assets/enc/` con la parola
 *      d'ordine di accesso. Committa solo quei file `.bin`, mai gli originali;
 *   4. per aggiungere un regalo, copia un blocco e dagli un `id` univoco.
 *
 * Campi di ogni regalo:
 *   id        identificatore univoco (kebab-case)
 *   name      titolo mostrato nella scheda
 *   category  chiave di `categories` qui sotto (decide colore e simbolo del pacco)
 *   type      'positive' | 'negative'
 *   image     percorso relativo a `public/` (se manca il file compare un segnaposto)
 *   message   frase breve mostrata nella scheda
 *   points    punti assegnati (positivi) o sottratti (negativi)
 *   rarity    'common' | 'rare'  (i rari sono sempre positivi)
 *   weight    peso relativo nella generazione casuale (più alto = più frequente)
 *   effect    'confetti' | 'hearts' | 'stars' | 'golden' | 'smoke' | 'glitch' | 'dark-confetti'
 *   sound     'positive' | 'rare' | 'negative' | 'troll'
 *
 * Le probabilità globali (75% positivi, ecc.) sono in `config.js` → `gifts`.
 */

/**
 * Categorie: etichetta + aspetto del pacco sul percorso.
 * `symbol` ∈ heart | ball | flag | volley | star | smile | mail | camera | question | sparkle
 */
export const categories = {
  persone: { label: 'Persone del cuore', color: '#ff6fa5', ribbon: '#ffd34d', symbol: 'heart' },
  calcio: { label: 'Calcio', color: '#35c46b', ribbon: '#ffffff', symbol: 'ball' },
  formula1: { label: 'Formula 1', color: '#ee3b4b', ribbon: '#ffffff', symbol: 'flag' },
  pallavolo: { label: 'Pallavolo', color: '#ff9a3c', ribbon: '#fff3b0', symbol: 'volley' },
  celebrita: { label: 'Celebrità', color: '#28c9d4', ribbon: '#ff6fa5', symbol: 'star' },
  meme: { label: 'Meme', color: '#ffd23f', ribbon: '#8a5cff', symbol: 'smile' },
  messaggi: { label: 'Messaggi', color: '#a98bff', ribbon: '#ff9ac8', symbol: 'mail' },
  ricordi: { label: 'Ricordi', color: '#ffb38a', ribbon: '#5aa9ff', symbol: 'camera' },
  speciale: { label: 'Sorprese rare', color: '#ffc928', ribbon: '#ff3d8b', symbol: 'sparkle' },
  // categorie delle sorprese "meno gradite": colori volutamente un po' spenti
  colleghi: { label: 'Colleghi', color: '#7d6fb0', ribbon: '#d9ff5a', symbol: 'question' },
  antipatie: { label: 'Celebrità indigeste', color: '#b05a8c', ribbon: '#5af0c8', symbol: 'question' },
  'meme-trash': { label: 'Meme imbarazzanti', color: '#9aa347', ribbon: '#ff6a3c', symbol: 'smile' },
  assurdo: { label: 'Sorprese assurde', color: '#4f7f8f', ribbon: '#ff8fe0', symbol: 'question' },
  ironia: { label: 'Messaggi ironici', color: '#6a6f9a', ribbon: '#ffd34d', symbol: 'mail' },
};

export const gifts = [
  // ----------------------------- POSITIVI -----------------------------
  {
    id: 'persona-preferita',
    name: 'Persona preferita',
    category: 'persone',
    type: 'positive',
    image: 'assets/gifts/positive/persona-preferita-placeholder.webp',
    message: 'Una delle tue persone preferite è arrivata di corsa! (foto provvisoria)',
    points: 100,
    rarity: 'common',
    weight: 10,
    effect: 'hearts',
    sound: 'positive',
  },
  {
    id: 'gruppo-amici',
    name: 'La banda di amici',
    category: 'persone',
    type: 'positive',
    image: 'assets/gifts/positive/banda_amici.png',
    message: 'Tutti insieme per te: che squadra!',
    points: 100,
    rarity: 'common',
    weight: 8,
    effect: 'confetti',
    sound: 'positive',
  },
  {
    id: 'calciatore',
    name: 'Il tuo calciatore',
    category: 'calcio',
    type: 'positive',
    image: 'assets/gifts/positive/calciatore-placeholder.webp',
    message: 'Gooool! Questa sorpresa vale tripla esultanza. (foto provvisoria)',
    points: 120,
    rarity: 'common',
    weight: 8,
    effect: 'confetti',
    sound: 'positive',
  },
  {
    id: 'pilota-f1',
    name: 'Kimi Antonelli',
    category: 'formula1',
    type: 'positive',
    image: 'assets/gifts/positive/kimi_antonelli.webp',
    message: 'Pole position nel tuo cuore!',
    points: 120,
    rarity: 'common',
    weight: 8,
    effect: 'stars',
    sound: 'positive',
  },
  {
    id: 'pallavolista',
    name: 'Campione di pallavolo',
    category: 'pallavolo',
    type: 'positive',
    image: 'assets/gifts/positive/pallavolista-placeholder.webp',
    message: 'Schiacciata vincente, punto assicurato! (foto provvisoria)',
    points: 120,
    rarity: 'common',
    weight: 8,
    effect: 'confetti',
    sound: 'positive',
  },
  {
    id: 'celebrita',
    name: 'Celebrità preferita',
    category: 'celebrita',
    type: 'positive',
    image: 'assets/gifts/positive/celebrita-placeholder.webp',
    message: 'Che incontro inaspettato! Autografo incluso. (foto provvisoria)',
    points: 110,
    rarity: 'common',
    weight: 7,
    effect: 'stars',
    sound: 'positive',
  },
  {
    id: 'meme-divertente',
    name: 'Meme del giorno',
    category: 'meme',
    type: 'positive',
    image: 'assets/gifts/positive/meme-divertente-placeholder.webp',
    message: 'Questo ti ha già fatta ridere almeno una volta. (immagine provvisoria)',
    points: 90,
    rarity: 'common',
    weight: 8,
    effect: 'confetti',
    sound: 'positive',
  },
  {
    id: 'messaggio-affettuoso',
    name: 'Messaggio dal cuore',
    category: 'messaggi',
    type: 'positive',
    image: 'assets/gifts/positive/messaggio-affettuoso-placeholder.webp',
    message: 'Qualcuno ti manda un abbraccio enorme. (testo provvisorio)',
    points: 100,
    rarity: 'common',
    weight: 8,
    effect: 'hearts',
    sound: 'positive',
  },
  {
    id: 'ricordo-speciale',
    name: 'Ricordo speciale',
    category: 'ricordi',
    type: 'positive',
    image: 'assets/gifts/positive/ricordo-placeholder.webp',
    message: 'Un momento da tenere per sempre nel cassetto dei ricordi. (foto provvisoria)',
    points: 110,
    rarity: 'common',
    weight: 6,
    effect: 'hearts',
    sound: 'positive',
  },
  {
    id: 'sorpresa-rara',
    name: 'Sorpresa rarissima!',
    category: 'speciale',
    type: 'positive',
    image: 'assets/gifts/special/sorpresa-rara-placeholder.webp',
    message: 'Rarissima! Oggi è davvero la tua giornata. (contenuto provvisorio)',
    points: 300,
    rarity: 'rare',
    weight: 2,
    effect: 'golden',
    sound: 'rare',
  },

  // ----------------------------- NEGATIVI -----------------------------
  {
    id: 'collega-antipatico',
    name: 'Il collega antipatico',
    category: 'colleghi',
    type: 'negative',
    image: 'assets/gifts/negative/collega-antipatico-placeholder.webp',
    message: 'Oh no… proprio lui?! Fingi di non essere in casa. (immagine provvisoria)',
    points: -60,
    rarity: 'common',
    weight: 8,
    effect: 'smoke',
    sound: 'negative',
  },
  {
    id: 'vip-indigesto',
    name: 'Celebrità indigesta',
    category: 'antipatie',
    type: 'negative',
    image: 'assets/gifts/negative/vip-indigesto-placeholder.webp',
    message: 'Cambia canale, cambia canale! (immagine provvisoria)',
    points: -80,
    rarity: 'common',
    weight: 6,
    effect: 'glitch',
    sound: 'troll',
  },
  {
    id: 'meme-sgradevole',
    name: 'Meme imbarazzante',
    category: 'meme-trash',
    type: 'negative',
    image: 'assets/gifts/negative/meme-sorpresa-placeholder.webp',
    message: 'Questo meme non si può né guardare né dimenticare. (immagine provvisoria)',
    points: -50,
    rarity: 'common',
    weight: 7,
    effect: 'dark-confetti',
    sound: 'troll',
  },
  {
    id: 'sorpresa-assurda',
    name: 'Sorpresa assurda',
    category: 'assurdo',
    type: 'negative',
    image: 'assets/gifts/negative/sorpresa-assurda-placeholder.webp',
    message: 'Nessuno sa perché sia qui. Nemmeno noi. (contenuto provvisorio)',
    points: -70,
    rarity: 'common',
    weight: 6,
    effect: 'smoke',
    sound: 'negative',
  },
  {
    id: 'messaggio-ironico',
    name: 'Messaggio ironico',
    category: 'ironia',
    type: 'negative',
    image: 'assets/gifts/negative/messaggio-ironico-placeholder.webp',
    message: '«Complimenti, hai trovato il pacco sbagliato!» (testo provvisorio)',
    points: -40,
    rarity: 'common',
    weight: 6,
    effect: 'glitch',
    sound: 'negative',
  },
];
