import * as Crypto from 'expo-crypto';

/** Random hex salt. */
export async function randomSalt(bytes = 16): Promise<string> {
  const arr = await Crypto.getRandomBytesAsync(bytes);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  // Stretch lightly with iterated hashing (educational local vault — not Argon2).
  let digest = `${salt}:${password}`;
  for (let i = 0; i < 5000; i++) {
    digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${digest}:${i}:${salt}`
    );
  }
  return digest;
}

export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string
): Promise<boolean> {
  const got = await hashPassword(password, salt);
  return got === expectedHash;
}

/**
 * Symmetric-ish local encryption for backups.
 * Derives a keystream from SHA-256(passphrase + salt + counter) and XOR-encodes UTF-8 bytes.
 * Suitable for personal on-device / opt-in remote backups — not a bank-grade HSM.
 */
export async function encryptJson(data: unknown, passphrase: string): Promise<{
  salt: string;
  ciphertext: string;
}> {
  const salt = await randomSalt(16);
  const json = JSON.stringify(data);
  const plain = utf8ToBytes(json);
  const keystream = await deriveKeystream(passphrase, salt, plain.length);
  const cipher = new Uint8Array(plain.length);
  for (let i = 0; i < plain.length; i++) cipher[i] = plain[i] ^ keystream[i];
  return { salt, ciphertext: bytesToBase64(cipher) };
}

export async function decryptJson<T>(
  ciphertextB64: string,
  salt: string,
  passphrase: string
): Promise<T> {
  const cipher = base64ToBytes(ciphertextB64);
  const keystream = await deriveKeystream(passphrase, salt, cipher.length);
  const plain = new Uint8Array(cipher.length);
  for (let i = 0; i < cipher.length; i++) plain[i] = cipher[i] ^ keystream[i];
  const json = bytesToUtf8(plain);
  return JSON.parse(json) as T;
}

async function deriveKeystream(passphrase: string, salt: string, length: number): Promise<Uint8Array> {
  const out = new Uint8Array(length);
  let offset = 0;
  let counter = 0;
  while (offset < length) {
    const blockHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${passphrase}|${salt}|${counter}`
    );
    const block = hexToBytes(blockHex);
    for (let i = 0; i < block.length && offset < length; i++, offset++) {
      out[offset] = block[i];
    }
    counter++;
  }
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function utf8ToBytes(str: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  // Minimal fallback
  const utf8: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) utf8.push(c);
    else if (c < 0x800) {
      utf8.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else {
      utf8.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return new Uint8Array(utf8);
}

function bytesToUtf8(bytes: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder().decode(bytes);
  }
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  try {
    return decodeURIComponent(escape(out));
  } catch {
    return out;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  if (typeof btoa !== 'undefined') return btoa(binary);
  // RN without btoa
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    const triplet = (a << 16) | ((b || 0) << 8) | (c || 0);
    result += chars[(triplet >> 18) & 63];
    result += chars[(triplet >> 12) & 63];
    result += i + 1 < bytes.length ? chars[(triplet >> 6) & 63] : '=';
    result += i + 2 < bytes.length ? chars[triplet & 63] : '=';
  }
  return result;
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof atob !== 'undefined') {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = b64.replace(/=+$/, '');
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const a = chars.indexOf(clean[i]);
    const b = chars.indexOf(clean[i + 1]);
    const c = chars.indexOf(clean[i + 2]);
    const d = chars.indexOf(clean[i + 3]);
    out.push((a << 2) | (b >> 4));
    if (c >= 0) out.push(((b & 15) << 4) | (c >> 2));
    if (d >= 0) out.push(((c & 3) << 6) | d);
  }
  return new Uint8Array(out);
}
