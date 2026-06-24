import { describe, expect, it } from "vitest";
import {
  decrypt,
  decryptOptional,
  encrypt,
  encryptOptional,
  hashEmail,
  hashEmailOptional,
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

describe("email fingerprint (hashEmail)", () => {
  it("is deterministic for the same address", () => {
    expect(hashEmail("alice@example.com")).toBe(hashEmail("alice@example.com"));
  });

  it("normalizes case and surrounding whitespace", () => {
    expect(hashEmail("  Alice@Example.com ")).toBe(hashEmail("alice@example.com"));
  });

  it("differs for different addresses and does not reveal the address", () => {
    const a = hashEmail("alice@example.com");
    expect(a).not.toBe(hashEmail("bob@example.com"));
    expect(a).not.toContain("alice");
    expect(a).not.toContain("example.com");
  });

  it("handles the optional helper", () => {
    expect(hashEmailOptional("")).toBeNull();
    expect(hashEmailOptional(null)).toBeNull();
    expect(hashEmailOptional("x@y.com")).toBe(hashEmail("x@y.com"));
  });
});
