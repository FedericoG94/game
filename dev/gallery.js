// Galleria di sviluppo: mostra tutta l'arte procedurale senza avviare il gioco.
import { settings, giftCatalog, categoryCatalog } from '../src/data/index.js';
import { buildArtCatalog } from '../src/art/index.js';
import { svgToDataUri } from '../src/art/svgKit.js';
import { placeholderPortraitSvg } from '../src/art/placeholderPortrait.js';

const art = buildArtCatalog({ character: settings.character, categories: categoryCatalog, gifts: giftCatalog });
const root = document.getElementById('root');

const groups = [
  ['Personaggio', (k) => k.startsWith('c-'), 1.6],
  ['Pacchi regalo', (k) => k.startsWith('box-'), 1],
  ['Grande regalo (pezzi)', (k) => k.startsWith('big-'), 1],
  ['Ostacoli e traguardo', (k) => k.startsWith('ob-'), 0.9],
  ['Scenografia', (k) => k.startsWith('sc-'), 1],
  ['Effetti', (k) => k.startsWith('fx-'), 1],
];

for (const [title, test, zoom] of groups) {
  const h = document.createElement('h2');
  h.textContent = title;
  const grid = document.createElement('div');
  grid.className = 'grid' + (title === 'Effetti' ? ' dark' : '');
  for (const [key, item] of Object.entries(art)) {
    if (!test(key)) continue;
    const fig = document.createElement('figure');
    const img = new Image();
    img.src = svgToDataUri(item.svg);
    img.width = item.w * zoom;
    img.height = item.h * zoom;
    const cap = document.createElement('figcaption');
    cap.textContent = key;
    fig.append(img, cap);
    grid.append(fig);
  }
  root.append(h, grid);
}

const h = document.createElement('h2');
h.textContent = 'Ritratti segnaposto';
const grid = document.createElement('div');
grid.className = 'grid';
for (const g of giftCatalog) {
  const cat = categoryCatalog[g.category];
  const fig = document.createElement('figure');
  const img = new Image();
  img.src = svgToDataUri(placeholderPortraitSvg({ name: g.name, color: cat.color, symbol: cat.symbol, type: g.type, size: 200 }));
  img.width = 200;
  img.height = 200;
  const cap = document.createElement('figcaption');
  cap.textContent = g.id;
  fig.append(img, cap);
  grid.append(fig);
}
root.append(h, grid);
