// Controlli statici su asset e percorsi, da eseguire prima della pubblicazione:
//   npm run check:assets            avvisa sui file mancanti (il gioco usa comunque i segnaposto)
//   npm run check:assets -- --strict  fallisce anche per i file mancanti
//
// Errori bloccanti (sempre): percorsi assoluti tipo "/assets/..." che si romperebbero su GitHub Pages
// quando il sito è servito da un sottopercorso (https://utente.github.io/nome-repo/).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gifts } from '../src/data/gifts.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const strict = process.argv.includes('--strict');
let errors = 0;
let warnings = 0;

// 1) immagini dei regali
for (const gift of gifts) {
  if (!gift.image) {
    console.warn(`avviso: il regalo "${gift.id}" non ha un'immagine (verrà usato un segnaposto)`);
    warnings++;
    continue;
  }
  const file = resolve(root, 'public', gift.image);
  if (!existsSync(file)) {
    console.warn(`avviso: manca public/${gift.image} (regalo "${gift.id}"): verrà usato un segnaposto`);
    warnings++;
  } else {
    const kb = statSync(file).size / 1024;
    if (kb > 400) {
      console.warn(`avviso: public/${gift.image} pesa ${kb.toFixed(0)} KB: ottimizzala (consigliato WebP ~512 px, < 150 KB)`);
      warnings++;
    }
  }
}

// 2) percorsi assoluti che si romperebbero sotto un sottopercorso
const exts = new Set(['.js', '.css', '.html', '.mjs']);
const badPatterns = [/["'`(]\/assets\//, /url\(\s*["']?\/assets\//, /src=["']\/assets\//, /href=["']\/assets\//];
function scan(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) scan(full);
    else if (exts.has(name.slice(name.lastIndexOf('.')))) {
      const text = readFileSync(full, 'utf8');
      text.split('\n').forEach((line, i) => {
        if (badPatterns.some((re) => re.test(line))) {
          console.error(`ERRORE: percorso assoluto in ${relative(root, full)}:${i + 1}  →  ${line.trim()}`);
          errors++;
        }
      });
    }
  }
}
for (const dir of ['src', 'dev']) if (existsSync(join(root, dir))) scan(join(root, dir));
scan_file('index.html');

function scan_file(name) {
  const full = join(root, name);
  if (!existsSync(full)) return;
  readFileSync(full, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (/(src|href)=["']\/assets\//.test(line)) {
        console.error(`ERRORE: percorso assoluto in ${name}:${i + 1}`);
        errors++;
      }
    });
}

console.log(`\nControllo asset: ${errors} errori, ${warnings} avvisi.`);
if (errors > 0 || (strict && warnings > 0)) process.exit(1);
