// Cifra le foto dei regali con la parola d'ordine di accesso.
//   npm run encrypt:gifts
//
// Legge gli ORIGINALI da `private/gifts/...` (cartella ignorata da git, mai pubblicata) e scrive
// le versioni cifrate in `public/assets/enc/*.bin`, che sono quelle da committare e pubblicare.
// Il percorso dell'originale ricalca `image` in gifts.js: `assets/gifts/positive/x.png`
// → `private/gifts/positive/x.png`.
//
// La parola d'ordine si può passare con GIFT_PASSWORD, altrimenti viene chiesta qui.
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { gifts } from '../src/data/gifts.js';
import { deriveVaultKey, encryptBytes, encryptedName, isAccessPassword } from '../src/crypto/vault.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'public/assets/enc');

function askPassword() {
  return new Promise((done) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const write = rl._writeToOutput;
    rl._writeToOutput = (s) => write.call(rl, s.startsWith('Parola') ? s : '');
    rl.question("Parola d'ordine di accesso: ", (answer) => {
      rl.close();
      process.stdout.write('\n');
      done(answer);
    });
  });
}

const password = (process.env.GIFT_PASSWORD ?? (await askPassword())).trim();
if (!(await isAccessPassword(password))) {
  console.error("ERRORE: la parola d'ordine non è quella di accesso del gioco. Nessun file scritto.");
  process.exit(1);
}

const key = await deriveVaultKey(password);
mkdirSync(outDir, { recursive: true });

const wanted = new Set();
let done = 0;
for (const gift of gifts) {
  if (!gift.image) continue;
  const src = resolve(root, 'private', gift.image.replace(/^\/?assets\//, ''));
  if (!existsSync(src)) continue; // niente originale: resta il segnaposto
  const name = await encryptedName(gift.image);
  wanted.add(name);
  writeFileSync(resolve(outDir, name), await encryptBytes(key, new Uint8Array(readFileSync(src))));
  console.log(`cifrata  ${gift.image}  →  assets/enc/${name}`);
  done++;
}

// toglie le versioni cifrate di foto che non servono più
for (const file of readdirSync(outDir)) {
  if (file.endsWith('.bin') && !wanted.has(file)) {
    unlinkSync(resolve(outDir, file));
    console.log(`rimossa  assets/enc/${file} (non più usata)`);
  }
}

console.log(`\nFatto: ${done} foto cifrate. Ricorda di committare public/assets/enc/.`);
