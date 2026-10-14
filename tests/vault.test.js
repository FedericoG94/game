import { describe, it, expect } from 'vitest';
import { decryptBytes, deriveVaultKey, encryptBytes, encryptedPath } from '../src/crypto/vault.js';

describe('vault', () => {
  it('cifra e decifra restituendo gli stessi byte', async () => {
    const key = await deriveVaultKey('parola di prova');
    const data = new Uint8Array([137, 80, 78, 71, 0, 1, 2, 255]);
    const sealed = await encryptBytes(key, data);
    expect(Array.from(sealed.slice(12))).not.toEqual(Array.from(data));
    expect(Array.from(await decryptBytes(key, sealed))).toEqual(Array.from(data));
  });

  it('rifiuta una chiave sbagliata e un file alterato', async () => {
    const key = await deriveVaultKey('parola di prova');
    const other = await deriveVaultKey('un\'altra parola');
    const sealed = await encryptBytes(key, new Uint8Array([1, 2, 3, 4]));
    await expect(decryptBytes(other, sealed)).rejects.toThrow();
    const tampered = sealed.slice();
    tampered[tampered.length - 1] ^= 1;
    await expect(decryptBytes(key, tampered)).rejects.toThrow();
  });

  it('il nome del file cifrato non rivela il nome della foto ed è stabile', async () => {
    const p = await encryptedPath('assets/gifts/positive/mamma.png');
    expect(p).toMatch(/^assets\/enc\/[0-9a-f]{16}\.bin$/);
    expect(p).toBe(await encryptedPath('/assets/gifts/positive/mamma.png'));
  });
});
