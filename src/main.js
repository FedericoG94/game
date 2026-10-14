// Ingresso: pagina neutra con un solo campo. Nessun testo, nessun asset e nessun codice
// del gioco vengono caricati finché non viene inserita la parola d'ordine.
// La stessa parola serve anche da chiave per aprire le foto cifrate (vedi crypto/vault.js).
import { deriveVaultKey, isAccessPassword } from './crypto/vault.js';

const gate = document.getElementById('gate');
const input = document.getElementById('gate-input');
let busy = false;

gate.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (busy) return;
  busy = true;
  const password = input.value.trim();
  const ok = await isAccessPassword(password);
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
  const [{ start }, vaultKey] = await Promise.all([import('./boot.js'), deriveVaultKey(password)]);
  start(vaultKey);
});
input.focus();
