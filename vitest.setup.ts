// Deterministic test key (32 bytes, base64). Tests must never use a real key.
process.env.PII_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString("base64");
