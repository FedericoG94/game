// Genera i ritratti segnaposto (WebP 512x512) di tutti i regali in src/data/gifts.js.
//
//   npm run make:placeholders            crea SOLO i file mancanti
//   npm run make:placeholders -- --force sovrascrive anche quelli esistenti (attenzione: perdi le foto vere!)
//
// I file già presenti (ad esempio le foto vere che hai copiato) non vengono mai toccati senza --force.
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { gifts, categories } from '../src/data/gifts.js';
import { placeholderPortraitSvg } from '../src/art/placeholderPortrait.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const force = process.argv.includes('--force');
let created = 0;
let skipped = 0;

for (const gift of gifts) {
  if (!gift.image) continue;
  const target = resolve(root, 'public', gift.image);
  if (existsSync(target) && !force) {
    skipped++;
    continue;
  }
  mkdirSync(dirname(target), { recursive: true });
  const cat = categories[gift.category] ?? {};
  const svg = placeholderPortraitSvg({ name: gift.name, color: cat.color, symbol: cat.symbol, type: gift.type, size: 512 });
  await sharp(Buffer.from(svg)).resize(512, 512).webp({ quality: 82 }).toFile(target);
  console.log(`creato  ${gift.image}`);
  created++;
}

console.log(`\nSegnaposto creati: ${created}, già presenti (lasciati intatti): ${skipped}.`);
