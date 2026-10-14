// Ingresso: pagina neutra con un solo campo. Nessun testo, nessun asset e nessun codice
// del gioco vengono caricati finché non viene inserita la parola d'ordine.
const SALT = 'cgr:';
const EXPECTED = '1e581fd02c640c38deff46a21922618b2bcf48e01c8560b072ac645b2fa75f6a';

async function digest(text) {
  const bytes = new TextEncoder().encode(SALT + text);
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

const gate = document.getElementById('gate');
const input = document.getElementById('gate-input');
let busy = false;

gate.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (busy) return;
  busy = true;
  const ok = (await digest(input.value.trim())) === EXPECTED;
  if (!ok) {
    input.value = '';
    input.classList.remove('no');
    void input.offsetWidth;
    input.classList.add('no');
    busy = false;
    return;
  }
  input.value = '';
  gate.remove();
  document.getElementById('gate-style')?.remove();
  const [{ start }] = await Promise.all([import('./boot.js')]);
  start();
});
input.focus();
