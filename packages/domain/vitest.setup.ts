import { webcrypto } from 'node:crypto';

// Polyfill crypto for Node.js environments that don't have it globally
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as Crypto;
}
