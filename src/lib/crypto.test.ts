import { describe, expect, it } from "vitest";
import {
  decrypt,
  decryptOptional,
  encrypt,
  encryptOptional,
} from "@/lib/crypto";

describe("PII field encryption", () => {
  it("round-trips a value", () => {
    const plaintext = "Jane Q. Public";
    const envelope = encrypt(plaintext);
    expect(envelope).not.toContain(plaintext);
    expect(decrypt(envelope)).toBe(plaintext);
  });

  it("produces different ciphertext each time (random IV)", () => {
    expect(encrypt("same")).not.toBe(encrypt("same"));
  });

  it("rejects tampered ciphertext via the auth tag", () => {
    const envelope = encrypt("sensitive");
    const bytes = Buffer.from(envelope, "base64");
    const last = bytes.length - 1;
    bytes[last] = (bytes[last] ?? 0) ^ 0xff; // flip a bit in the ciphertext
    expect(() => decrypt(bytes.toString("base64"))).toThrow();
  });

  it("handles optional helpers", () => {
    expect(encryptOptional("")).toBeNull();
    expect(encryptOptional(null)).toBeNull();
    expect(decryptOptional(null)).toBeNull();
    const env = encryptOptional("x");
    expect(env).not.toBeNull();
    expect(decryptOptional(env)).toBe("x");
  });
});
