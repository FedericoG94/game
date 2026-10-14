# 🎁 Carlotta's Gift Run

Un piccolo videogioco arcade fatto apposta per Carlotta: una corsa a tre corsie in stile cartoon 3D, tanti pacchi regalo
(belle sorprese e sorprese… discutibili) e, al traguardo, un **grande regalo** che si apre su un messaggio di auguri personale.

- **Dura 1-3 minuti** e ha un finale vero: arrivare al traguardo è sempre possibile (nessun "game over").
- Funziona da **smartphone** (swipe) e da **computer** (tastiera), con un semplice link.
- È un **sito statico**: nessun server, nessun database, nessun servizio a pagamento.
- Stack: **Phaser 3** (motore 2D, resa 2.5D) + **Vite** + JavaScript (ES Modules). Pubblicazione su **GitHub Pages** con GitHub Actions.

> **Tutti i contenuti sono segnaposto.** Nessuna persona reale è citata: foto, nomi e messaggi di esempio sono provvisori e
> vanno sostituiti (vedi [Personalizzare il gioco](#personalizzare-il-gioco)).

---

## Indice

1. [Requisiti](#requisiti)
2. [Avvio in locale](#avvio-in-locale)
3. [Build di produzione e verifica](#build-di-produzione-e-verifica)
4. [Come si gioca](#come-si-gioca)
5. [Personalizzare il gioco](#personalizzare-il-gioco)
6. [Struttura del progetto](#struttura-del-progetto)
7. [Pubblicare su GitHub Pages](#pubblicare-su-github-pages)
8. [Come funziona (in breve)](#come-funziona-in-breve)
9. [Problemi comuni](#problemi-comuni)

---

## Requisiti

- **Node.js 20 o superiore** (consigliato 24, la versione usata nello sviluppo e nella pubblicazione automatica)
- **npm** (incluso in Node.js)
- Un browser recente: Chrome, Edge, Firefox o Safari

## Avvio in locale

```bash
npm install
npm run dev
```

Apri l'indirizzo mostrato nel terminale (di solito <http://localhost:5173/>). Per provarlo dal telefono, collegalo alla stessa rete
Wi-Fi e apri l'indirizzo "Network" mostrato da Vite.

Comandi utili:

| Comando | Cosa fa |
| --- | --- |
| `npm run dev` | Avvia il gioco in locale con aggiornamento automatico |
| `npm test` | Esegue i test automatici (logica di gioco, dati, input, arte) |
| `npm run check:assets` | Controlla che le immagini dei regali esistano e che non ci siano percorsi che si romperebbero su GitHub Pages |
| `npm run build` | Crea la versione di produzione nella cartella `dist/` |
| `npm run preview` | Serve la cartella `dist/` per provarla |
| `npm run verify` | Controllo asset + test + build, in un colpo solo |
| `npm run make:placeholders` | Ricrea i ritratti segnaposto **mancanti** (non tocca i file che hai già sostituito) |

Per vedere tutta l'arte disegnata dal codice (personaggio, pacchi, ostacoli…) con i nomi delle texture, apri
<http://localhost:5173/dev/gallery.html> mentre `npm run dev` è attivo.

## Build di produzione e verifica

```bash
npm run verify        # asset + test + build
npm run preview       # prova la build
```

La build usa percorsi **relativi** (`base: './'` in `vite.config.js`), quindi funziona sia in locale sia pubblicata in un
sottopercorso come `https://utente.github.io/nome-repo/`. Per provare esattamente un sottopercorso:

```bash
npm run build
npx vite preview --base /game/ --port 4173
# apri http://localhost:4173/game/
```

> Su Windows con Git Bash, anteponi `MSYS_NO_PATHCONV=1` al comando, altrimenti `/game/` viene trasformato in un percorso di Windows.

## Come si gioca

| | Desktop | Smartphone |
| --- | --- | --- |
| Cambia corsia | ← → oppure A D | Swipe a sinistra / destra |
| Salta | ↑, W oppure Spazio | Swipe verso l'alto |
| Scivola | ↓ oppure S | Swipe verso il basso |
| Pausa | Esc (o P) | Pulsante in alto a sinistra |
| Audio | M | Pulsante nel menu |

- Raccogli i **pacchi**: ognuno nasconde una sorpresa. Quelle belle danno punti (con una catena di bonus se ne raccogli di fila),
  quelle sgradite ne tolgono e ti rallentano un attimo. I pacchi hanno colori e simboli diversi per categoria, senza svelare il contenuto.
- Ostacoli: la **torta gigante** si schiva cambiando corsia, la **barriera di nastri** si salta, lo **striscione** si supera scivolando.
  Un urto toglie qualche punto e rallenta, ma non fa mai finire la partita.
- In fondo alla pista c'è il traguardo… e il regalo più grande.
- Al termine puoi **rivedere le sorprese** scoperte (con quante volte le hai raccolte) e rigiocare.

Nei telefoni puoi attivare dei **pulsanti touch** a schermo dal menu o dalla pausa ("Pulsanti touch").

---

## Personalizzare il gioco

Tutto si cambia in **due file di dati** e nella cartella `public/assets/`. Non serve toccare il codice.

### 1. Messaggi, durata, difficoltà → `src/data/config.js`

Ogni sezione è commentata. Le principali:

| Sezione | Cosa controlla |
| --- | --- |
| `meta.playerName` | Il nome usato nei testi (`{name}`) |
| `intro` | Titolo, sottotitolo, invito e istruzioni della schermata iniziale |
| `finale` | **Il messaggio finale di auguri** (titolo, paragrafi, frase affettuosa, firma, testi dei pulsanti) |
| `run` | Durata della corsa (`targetDurationSec`), velocità iniziale e massima |
| `gifts` | Probabilità: `positiveChance` (0.75 = 75% belle sorprese), regali rari, serie massime di negativi |
| `scoring` / `penalties` | Punti, catena di bonus, penalità e rallentamenti |
| `reveal` | Rallentatore e durata della scheda quando apri un pacco |
| `character` | Colori della protagonista (pelle, capelli, vestiti, cappellino) |
| `audio`, `accessibility`, `quality` | Audio, riduzione del movimento, pulsanti touch, qualità |

### 2. Il messaggio finale

In `src/data/config.js`, sezione `finale`. Nei testi puoi usare questi segnaposto, che il gioco sostituisce da solo:

`{name}` nome · `{score}` punteggio · `{best}` record · `{positive}` sorprese belle · `{negative}` sorprese sgradite · `{total}` pacchi aperti

```js
finale: {
  eyebrow: 'Il vero regalo era questo…',
  title: 'Buon compleanno, {name}!',
  paragraphs: [
    'Il tuo augurio personale qui…',
    'Lungo la corsa hai aperto {total} pacchi: {positive} bellissimi e {negative} decisamente… discutibili.',
  ],
  closing: 'Una frase affettuosa finale.',
  signature: '— Il tuo nome',
  // …
},
```

Il testo attuale è un **segnaposto** ben riconoscibile: sostituiscilo con il tuo.

### 3. Aggiungere o modificare regali → `src/data/gifts.js`

Ogni regalo è un blocco così:

```js
{
  id: 'nonna',                       // univoco
  name: 'La nonna',                  // titolo nella scheda
  category: 'persone',               // chiave di `categories`: decide colore e simbolo del pacco
  type: 'positive',                  // 'positive' | 'negative'
  image: 'assets/gifts/positive/nonna.webp',   // percorso dentro public/
  message: 'Un abbraccio che vale doppio!',
  points: 150,                       // negativi: numero negativo (es. -60)
  rarity: 'common',                  // 'common' | 'rare' (i rari sono sempre positivi)
  weight: 8,                         // più alto = compare più spesso
  effect: 'hearts',                  // confetti | hearts | stars | golden | smoke | glitch | dark-confetti
  sound: 'positive',                 // positive | rare | negative | troll
}
```

Passi:

1. Metti la foto in `public/assets/gifts/positive/` (o `negative/`, `special/`). **Consigliato**: WebP quadrata ~512×512, sotto i 150 KB.
2. Aggiungi (o modifica) il blocco in `gifts.js`.
3. Nuove categorie (colore e simbolo del pacco): aggiungile in `categories` nello stesso file.

I valori vengono **controllati all'avvio**: un errore (punti col segno sbagliato, id doppio, categoria inesistente…) viene corretto
e segnalato nella console del browser, senza bloccare il gioco. Se manca un'immagine compare un ritratto segnaposto.

Dopo aver sostituito le foto, `npm run check:assets` ti avvisa di eventuali file mancanti o troppo pesanti.

### 4. Sostituire il personaggio (o qualsiasi altra grafica)

La protagonista è un **personaggio generico** disegnato dal codice (nessun tratto fisico è stato inventato). Hai tre livelli:

1. **Colori e cappellino** → `config.character` (pelle, capelli, vestiti, scarpe, `accessory: 'partyHat' | 'none'`).
2. **Sostituire singole parti con le tue immagini** → `config.assets.overrides`: associa la *chiave di una texture* a un file in `public/`:

   ```js
   assets: {
     overrides: {
       'c-headFront': 'assets/characters/carlotta/head-front.png',
       'c-hat': 'assets/characters/carlotta/hat.png',
     },
   },
   ```

   - Le chiavi del personaggio: `c-headFront`, `c-headBack`, `c-hairFront`, `c-hairMass`, `c-ponytail`, `c-hat`, `c-torsoFront`, `c-torsoBack`,
     `c-arm`, `c-legFront`, `c-legBack`, `c-faceNeutral`, `c-faceHappy`, `c-faceShock`, `c-faceDisgust`, `c-emoteHeart|Star|Shock|Ew`.
     Le stesse regole valgono per pacchi (`box-…`), ostacoli (`ob-…`), scenografia (`sc-…`), grande regalo (`big-…`) ed effetti (`fx-…`).
   - Vedi tutte le parti con i loro nomi aprendo `/dev/gallery.html` in `npm run dev`.
   - L'immagine deve avere le **stesse proporzioni** e lo stesso **punto di perno** della parte originale (le parti ruotano attorno
     a spalla, anca, testa…); può avere qualunque risoluzione (consigliato il doppio delle dimensioni della galleria). PNG o WebP trasparenti.
   - Se un file manca, il gioco usa l'arte di partenza e scrive un avviso in console.
3. **Ridisegnare tutto** → modifica `src/art/carlottaArt.js` (grafica vettoriale SVG, ogni parte è commentata).

### 5. Audio

La musica e gli effetti sono **sintetizzati dal browser** (nessun file audio, nessuna licenza). Non partono prima del primo tocco/click
e si spengono dal menu, dalla pausa o con il tasto **M**. Il gioco si capisce benissimo anche senza audio.

---

## Struttura del progetto

```
carlotta-gift-run/
├── index.html                 pagina di avvio (schermata di caricamento inclusa)
├── vite.config.js             build + base relativa per GitHub Pages
├── package.json / package-lock.json
├── .github/workflows/deploy.yml   test, build e pubblicazione automatica su Pages
├── public/                    file copiati così come sono nel sito
│   ├── favicon.svg
│   └── assets/gifts/{positive,negative,special}/   ritratti dei regali (WebP segnaposto)
├── src/
│   ├── main.js                avvio: interfaccia HTML + gioco Phaser
│   ├── data/
│   │   ├── config.js          ★ impostazioni e messaggio finale
│   │   ├── gifts.js           ★ regali e categorie
│   │   ├── validate.js        controlli e correzioni dei dati
│   │   └── index.js           (punto di accesso ai dati già controllati)
│   ├── game/                  logica e scene
│   │   ├── Simulation.js      ┐ cuore del gioco, indipendente dal rendering:
│   │   ├── GameState.js       │ tempo, velocità, fasi
│   │   ├── PlayerMotion.js    │ corsia, salto, scivolata
│   │   ├── SpawnManager.js    │ generazione di pacchi e ostacoli sempre superabili
│   │   ├── GiftPicker.js      │ quale regalo contiene un pacco (probabilità, serie)
│   │   ├── CollisionSystem.js │ raccolte e urti
│   │   ├── ScoreManager.js    ┘ punteggio, catena, registro delle sorprese
│   │   ├── projection.js      prospettiva 2.5D e layout responsive
│   │   ├── BootScene / PreloadScene / MenuScene / RunnerScene
│   │   ├── GiftRevealScene / PauseScene / FinalScene
│   │   ├── Player.js, Gift.js, Obstacle.js, BigGift.js   viste animate
│   │   ├── Backdrop.js        cielo, strada, scenografia, piazza finale
│   │   ├── Fx.js              particelle ed effetti
│   │   ├── audio.js           musica ed effetti sintetizzati
│   │   └── InputController.js tastiera/swipe/pulsanti → azioni
│   ├── art/                   arte disegnata dal codice (SVG → texture)
│   ├── ui/                    HUD, schermate, controlli touch (HTML sopra il canvas)
│   └── styles/main.css       palette e stile dell'interfaccia
├── scripts/
│   ├── make-placeholders.mjs  genera i ritratti segnaposto
│   └── check-assets.mjs       controlli statici su asset e percorsi
├── tests/                     test automatici (Vitest)
└── dev/gallery.html           galleria dell'arte (solo sviluppo, non pubblicata)
```

## Pubblicare su GitHub Pages

Il repository è già pronto: basta abilitare Pages **una volta sola**.

1. Carica il progetto su GitHub (branch **`main`**):

   ```bash
   git add .
   git commit -m "Carlotta's Gift Run"
   git remote add origin https://github.com/UTENTE/NOME-REPO.git   # se non c'è già
   git push -u origin main
   ```

2. Su GitHub: **Settings → Pages → Build and deployment → Source: _GitHub Actions_**.
3. Il workflow `.github/workflows/deploy.yml` parte da solo a ogni push su `main` (o a mano da **Actions → Pubblica su GitHub Pages → Run workflow**). Esegue:
   `npm ci` → controllo asset → test → build → pubblica **solo la cartella `dist/`** (mai il codice sorgente). Se un passaggio fallisce, non pubblica.
4. Quando il workflow è verde, il sito è su `https://UTENTE.github.io/NOME-REPO/`
   (per questo repository: `https://federicog94.github.io/game/`).

Per aggiornare il gioco basta modificare i file e fare un nuovo `git push`.

> Se pubblichi in un dominio personalizzato o alla radice, non cambia nulla: i percorsi sono relativi. Se preferisci un percorso assoluto, costruisci con `VITE_BASE=/nome-repo/ npm run build`.

## Come funziona (in breve)

- **Prospettiva 2.5D**: gli oggetti hanno una distanza `z` dalla protagonista; posizione, grandezza e ombra sullo schermo derivano
  da una proiezione prospettica (`src/game/projection.js`). La camera segue leggermente Carlotta nei cambi corsia.
- **Tempo**: ogni aggiornamento usa i secondi trascorsi (con un limite per evitare salti quando si torna alla scheda), quindi il gioco
  è identico a 30, 60 o 144 fps. Le collisioni si valutano una volta, nell'istante in cui l'oggetto attraversa la linea di contatto.
- **Percorsi sempre superabili**: ogni fila di ostacoli lascia almeno una via libera raggiungibile dalla fila precedente e due ostacoli
  "a tutta larghezza" non sono mai consecutivi. I test lo verificano su centinaia di percorsi e una simulazione completa gioca fino al traguardo.
- **Finale**: la corsa frena davanti al grande regalo; una seconda scena riprende la stessa inquadratura, fa tremare il pacco, scioglie il
  fiocco, fa saltare il coperchio con una luce calda (mai abbagliante) e mostra il messaggio.
- **Accessibilità**: rispetta `prefers-reduced-motion`, nessun lampeggio intenso, pulsanti grandi, testi brevi, focus gestito nei dialoghi,
  zone sicure dei telefoni, audio sempre disattivabile.

## Problemi comuni

| Sintomo | Cosa fare |
| --- | --- |
| Pagina bianca su GitHub Pages | Controlla che in **Settings → Pages** la sorgente sia **GitHub Actions** e che il workflow sia verde. Controlla che la build sia in `dist/` |
| Su Pages mancano immagini/suoni | Non usare percorsi che iniziano con `/` (es. `/assets/…`): scrivili senza barra iniziale (`assets/…`). `npm run check:assets` li trova |
| Vedo il ritratto "PLACEHOLDER" | Manca il file indicato in `image` (maiuscole/minuscole contano!) o il percorso è sbagliato. Controlla la console del browser |
| La mia modifica a `gifts.js` o `config.js` non funziona | Apri la console del browser: i valori non validi vengono corretti e segnalati con un avviso |
| Il gioco va a scatti su un telefono vecchio | Abbassa `quality.particles` e `quality.maxPixelRatio` in `config.js`; il gioco riduce da solo gli effetti se rileva pochi fps |
| Nessun suono | I browser permettono l'audio solo dopo un tocco: tocca "Inizia la corsa". Controlla anche l'interruttore Audio e il volume del telefono (modalità silenziosa su iPhone) |
| La partita si ferma da sola | È l'**auto-pausa**: scatta quando la scheda del browser non è visibile. Tocca "Riprendi" |
| `npm run build` fallisce | Esegui `npm ci` e riprova; verifica la versione di Node (`node -v`, serve ≥ 20) |
| Il workflow fallisce su "Esegui i test" | Un test segnala un problema reale: leggi il messaggio in Actions o lancia `npm test` in locale |

---

Fatto con ❤️ per Carlotta.
