import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

/**
 * Application-layer field encryption for PII.
 *
 * Uses AES-256-GCM (authenticated encryption). The database only ever stores the
 * value produced by `encrypt()`, so a database compromise alone does not expose
 * plaintext PII. The key MUST come from a secret manager / KMS in production —
 * see PII_ENCRYPTION_KEY in .env.example.
 *
 * Ciphertext format (base64): iv(12) || authTag(16) || ciphertext
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM standard nonce length
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.PII_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "PII_ENCRYPTION_KEY is not set. Refusing to handle PII without an encryption key.",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `PII_ENCRYPTION_KEY must decode to 32 bytes (got ${key.length}). Generate with: openssl rand -base64 32`,
    );
  }
  return key;
}

/** Encrypts a plaintext string. Returns a base64 envelope. */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

/** Decrypts a base64 envelope produced by `encrypt()`. */
export function decrypt(envelope: string): string {
  const key = getKey();
  const data = Buffer.from(envelope, "base64");
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

/** Convenience for optional fields: encrypts only when a value is present. */
export function encryptOptional(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  return encrypt(value);
}

/** Convenience for optional fields: decrypts only when ciphertext is present. */
export function decryptOptional(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  return decrypt(value);
}
