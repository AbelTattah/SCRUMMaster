import { describe, expect, it } from "vitest";

import {
  UNREADABLE,
  b64ToBytes,
  bytesToB64,
  decryptBytes,
  decryptField,
  decryptJson,
  encryptBytes,
  encryptField,
  encryptJson,
  fromUtf8,
  isEncrypted,
  isValidMnemonic,
  newMnemonic,
  newSalt,
  normalizeMnemonic,
  randomAesKey,
  utf8,
} from "@/lib/crypto";

describe("crypto helpers", () => {
  it("converts bytes/base64/utf8", () => {
    const text = "hello ð";
    const bytes = utf8(text);
    expect(fromUtf8(bytes)).toBe(text);
    const b64 = bytesToB64(bytes);
    expect(fromUtf8(b64ToBytes(b64))).toBe(text);
  });

  it("generates salts and validates/normalizes mnemonics", () => {
    const salt = newSalt();
    expect(typeof salt).toBe("string");
    expect(salt.length).toBeGreaterThan(10);

    const phrase = newMnemonic();
    expect(isValidMnemonic(phrase)).toBe(true);
    expect(isValidMnemonic(phrase.toUpperCase())).toBe(true);
    expect(normalizeMnemonic(`  ${phrase.toUpperCase()}  `)).toBe(phrase);
    expect(isValidMnemonic("not a real mnemonic phrase")).toBe(false);
  });

  it("detects encrypted envelopes", () => {
    expect(isEncrypted("enc:v1:abc")).toBe(true);
    expect(isEncrypted("plain text")).toBe(false);
    expect(isEncrypted(null)).toBe(false);
    expect(isEncrypted(undefined)).toBe(false);
  });

  it("encrypts and decrypts bytes/json/fields", async () => {
    const { key } = await randomAesKey();

    const msg = utf8("secret");
    const enc = await encryptBytes(key, msg);
    expect(enc).not.toContain("secret");
    const dec = await decryptBytes(key, enc);
    expect(fromUtf8(dec)).toBe("secret");

    const payload = { a: 1, b: "two" };
    const encJson = await encryptJson(key, payload);
    expect(await decryptJson<typeof payload>(key, encJson)).toEqual(payload);

    const field = await encryptField(key, "task title");
    expect(isEncrypted(field)).toBe(true);
    expect(await decryptField(key, field)).toBe("task title");

    // legacy plaintext passes through
    expect(await decryptField(key, "legacy")).toBe("legacy");
    // missing/wrong key behavior
    expect(await decryptField(null, field)).toBe(UNREADABLE);

    const { key: other } = await randomAesKey();
    expect(await decryptField(other, field)).toBe(UNREADABLE);
  });
});
