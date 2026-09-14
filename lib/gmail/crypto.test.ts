import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

// getKey() in crypto.ts reads this lazily on each call, so it's fine to
// set it here rather than before the (static) import below.
process.env.GMAIL_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");

import { encryptToken, decryptToken } from "./crypto";

test("encrypt/decrypt round-trips arbitrary token strings", () => {
  const plaintext = "ya29.a0Af-fake-access-token-value_with-symbols.123";
  const encrypted = encryptToken(plaintext);
  assert.notEqual(encrypted, plaintext);
  assert.equal(decryptToken(encrypted), plaintext);
});

test("two encryptions of the same plaintext produce different ciphertext (random IV)", () => {
  const a = encryptToken("same-value");
  const b = encryptToken("same-value");
  assert.notEqual(a, b);
});

test("tampered ciphertext fails authentication rather than decrypting silently", () => {
  const encrypted = encryptToken("secret-token");
  const [iv, tag, data] = encrypted.split(":");
  const tampered = [iv, tag, Buffer.from("tampered-data").toString("base64")].join(":");
  assert.throws(() => decryptToken(tampered));
});
