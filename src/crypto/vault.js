// Cassaforte delle foto: le immagini dei regali sono pubblicate solo cifrate (AES-256-GCM) e
// vengono aperte nel browser con la parola d'ordine di accesso. Questo modulo è usato sia dal
// browser sia dallo script di cifratura (Node ≥ 20), così le due parti non possono divergere.
//
// Formato di un file cifrato: 12 byte di IV casuale + testo cifrato (con tag GCM in coda).
// Chiave: PBKDF2-SHA256 (parola d'ordine, sale fisso, molte iterazioni) → AES-GCM a 256 bit.

const ACCESS_SALT = 'cgr:';
/** Hash della parola d'ordine di accesso (non la parola stessa). */
const ACCESS_EXPECTED = '1e581fd02c640c38deff46a21922618b2bcf48e01c8560b072ac645b2fa75f6a';

const KEY_SALT = 'cgr-vault-v1';
const ITERATIONS = 250_000;
const IV_BYTES = 12;
const NAME_HEX = 16;

const subtle = () => globalThis.crypto.subtle;
const enc = new TextEncoder();
const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

/** true se `text` è la parola d'ordine di accesso. */
export async function isAccessPassword(text) {
  return hex(await subtle().digest('SHA-256', enc.encode(ACCESS_SALT + text))) === ACCESS_EXPECTED;
}

/** Deriva la chiave AES dalla parola d'ordine (da fare una sola volta, poi non serve più la parola). */
export async function deriveVaultKey(password) {
  const base = await subtle().importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(KEY_SALT), iterations: ITERATIONS },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Nome (non rivelatore) del file cifrato per un percorso logico come `assets/gifts/positive/x.png`. */
export async function encryptedName(logicalPath) {
  const h = hex(await subtle().digest('SHA-256', enc.encode(String(logicalPath).replace(/^\/+/, ''))));
  return `${h.slice(0, NAME_HEX)}.bin`;
}

/** Percorso (relativo a `public/`) dove sta la versione cifrata di un'immagine. */
export async function encryptedPath(logicalPath) {
  return `assets/enc/${await encryptedName(logicalPath)}`;
}

export async function encryptBytes(key, bytes) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const body = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv }, key, bytes));
  const out = new Uint8Array(IV_BYTES + body.length);
  out.set(iv, 0);
  out.set(body, IV_BYTES);
  return out;
}

/** Lancia un errore se la chiave è sbagliata o il file è stato alterato. */
export async function decryptBytes(key, bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const iv = data.slice(0, IV_BYTES);
  const body = data.slice(IV_BYTES);
  return new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv }, key, body));
}
