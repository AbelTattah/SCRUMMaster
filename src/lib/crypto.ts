/**
 * Zero-knowledge cryptography for task content.
 *
 * Everything here runs in the browser. The server only ever stores wrapped
 * keys and ciphertext — it can never read task titles, blockers or notes.
 *
 * Key hierarchy:
 *
 *   password ──PBKDF2──▶ KEK ──wraps──▶ key package { DEK, identity private key }
 *   mnemonic ──PBKDF2──▶ recovery KEK (same package — password loss recovery)
 *   DEK      ──wraps──▶ organization key (the owner's own copy)
 *   ECDH P-256 identity keypair ── lets owners hand the org key to members
 *   DEK / org key ──AES-GCM──▶ task fields, stored as "enc:v1:…"
 *
 * Values without the "enc:v1:" prefix are legacy plaintext rows written by
 * older builds — they keep working as-is (no migration; they are encrypted
 * naturally the next time they are edited).
 */
import { generateMnemonic, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

const PBKDF2_ITERATIONS = 310_000;
const ENC_PREFIX = "enc:v1:";
const IV_BYTES = 12;

/** Shown where ciphertext cannot be unlocked with the available key. */
export const UNREADABLE = "(encrypted — unavailable)";

/* ------------------------------------------------------------------ bytes */

export function utf8(value: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(value);
}

export function fromUtf8(value: Uint8Array<ArrayBuffer>): string {
  return new TextDecoder().decode(value);
}

export function bytesToB64(bytes: Uint8Array<ArrayBuffer>): string {
  let binary = "";
  const chunk = 0x8000;

  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }

  return btoa(binary);
}

export function b64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length));
}

/** A fresh base64 salt for PBKDF2. */
export function newSalt(): string {
  return bytesToB64(randomBytes(16));
}

/* -------------------------------------------------------- key derivation */

async function pbkdf2(secret: string, saltB64: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", utf8(secret), "PBKDF2", false, [
    "deriveKey",
  ]);

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: b64ToBytes(saltB64), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** The key-encryption key derived from the account password. */
export function deriveKek(password: string, saltB64: string): Promise<CryptoKey> {
  return pbkdf2(password, saltB64);
}

/** Canonical form of a typed-in recovery phrase. */
export function normalizeMnemonic(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isValidMnemonic(input: string): boolean {
  try {
    return validateMnemonic(normalizeMnemonic(input), wordlist);
  } catch {
    return false;
  }
}

/** The recovery key-encryption key derived from the 24-word phrase. */
export function deriveRecoveryKek(mnemonic: string, saltB64: string): Promise<CryptoKey> {
  return pbkdf2(normalizeMnemonic(mnemonic), saltB64);
}

/** A fresh 24-word recovery phrase (256 bits of entropy). */
export function newMnemonic(): string {
  return generateMnemonic(wordlist, 256);
}

/* ------------------------------------------------------------- AES-GCM */

async function importAesKey(raw: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function randomAesKey(): Promise<{ key: CryptoKey; raw: Uint8Array<ArrayBuffer> }> {
  const raw = randomBytes(32);

  return { key: await importAesKey(raw), raw };
}

/** Import a base64 raw AES-256 key (e.g. a stored DEK). */
export async function importDek(rawB64: string): Promise<CryptoKey> {
  return importAesKey(b64ToBytes(rawB64));
}

/** AES-GCM encrypt → base64(iv ‖ ciphertext). */
export async function encryptBytes(key: CryptoKey, data: Uint8Array<ArrayBuffer>): Promise<string> {
  const iv = randomBytes(IV_BYTES);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);

  const out = new Uint8Array(IV_BYTES + ct.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(ct), IV_BYTES);

  return bytesToB64(out);
}

/** Inverse of encryptBytes. Throws on tamper/wrong key. */
export async function decryptBytes(key: CryptoKey, blob: string): Promise<Uint8Array<ArrayBuffer>> {
  const all = b64ToBytes(blob);
  const iv = all.subarray(0, IV_BYTES);
  const ct = all.subarray(IV_BYTES);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);

  return new Uint8Array(pt);
}

export async function encryptJson(key: CryptoKey, value: unknown): Promise<string> {
  return encryptBytes(key, utf8(JSON.stringify(value)));
}

export async function decryptJson<T>(key: CryptoKey, blob: string): Promise<T> {
  return JSON.parse(fromUtf8(await decryptBytes(key, blob))) as T;
}

/* ------------------------------------------------------- identity keys */

export interface KeyPackage {
  v: 1;
  /** base64 raw AES-256 data key — encrypts task content for personal accounts. */
  dek: string;
  /** base64 PKCS#8 ECDH private key — receives organization key grants. */
  priv: string;
}

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveKey",
    "deriveBits",
  ]);
}

export async function exportPublicKey(pair: CryptoKeyPair): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", pair.publicKey);

  return bytesToB64(new Uint8Array(raw));
}

export async function exportPrivateKey(pair: CryptoKeyPair): Promise<string> {
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", pair.privateKey);

  return bytesToB64(new Uint8Array(pkcs8));
}

export async function importPrivateKey(pkcs8B64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "pkcs8",
    b64ToBytes(pkcs8B64),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveKey", "deriveBits"],
  );
}

export async function importPublicKey(rawB64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    b64ToBytes(rawB64),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
}

/* --------------------------------------------------- account material */

export interface AccountMaterial {
  /** base64 PBKDF2 salt (stored server-side, plain). */
  salt: string;
  /** AES-GCM(keyPackage, KEK) — base64, stored server-side. */
  wrapped: string;
  /** base64 raw ECDH public key — stored server-side, plain. */
  pub: string;
  /** 24-word phrase — show once, never store plaintext. */
  mnemonic: string;
  /** The unwrapped package for immediate local use. */
  pkg: KeyPackage;
  /** Local key material ready for the session. */
  keys: LocalKeys;
}

export interface LocalKeys {
  dek: CryptoKey;
  priv: CryptoKey;
}

/** Fresh salt + key package + recovery phrase for a new (or upgraded) account. */
export async function createAccountMaterial(password: string): Promise<AccountMaterial> {
  const salt = newSalt();
  const kek = await deriveKek(password, salt);
  const mnemonic = newMnemonic();

  const [{ key: dek, raw: dekRaw }, pair] = await Promise.all([randomAesKey(), generateKeyPair()]);
  const priv = await exportPrivateKey(pair);
  const pkg: KeyPackage = { v: 1, dek: bytesToB64(dekRaw), priv };

  const wrapped = await encryptJson(kek, pkg);
  const pub = await exportPublicKey(pair);

  return { salt, wrapped, pub, mnemonic, pkg, keys: { dek, priv: await importPrivateKey(priv) } };
}

/** Unwrap a stored package with the password-derived KEK. */
export async function openAccountMaterial(
  password: string,
  material: { salt: string; wrapped: string },
): Promise<{ pkg: KeyPackage; keys: LocalKeys }> {
  const kek = await deriveKek(password, material.salt);
  const pkg = await decryptJson<KeyPackage>(kek, material.wrapped);

  return { pkg, keys: { dek: await importAesKey(b64ToBytes(pkg.dek)), priv: await importPrivateKey(pkg.priv) } };
}

/**
 * Re-wrap an existing package under a new password.
 *
 * The salt is kept when supplied: the recovery phrase wraps the same package
 * under PBKDF2(mnemonic, salt), so rotating the salt would break it.
 */
export async function rewrapPackage(
  pkg: KeyPackage,
  newPassword: string,
  salt?: string,
): Promise<{ salt: string; wrapped: string }> {
  const keep = salt ?? newSalt();
  const kek = await deriveKek(newPassword, keep);

  return { salt: keep, wrapped: await encryptJson(kek, pkg) };
}

/** Unwrap a stored package with the recovery phrase (password lost). */
export async function openWithRecovery(
  mnemonic: string,
  material: { salt: string; wrapped: string },
): Promise<{ pkg: KeyPackage; keys: LocalKeys }> {
  const kek = await deriveRecoveryKek(mnemonic, material.salt);
  const pkg = await decryptJson<KeyPackage>(kek, material.wrapped);

  return { pkg, keys: { dek: await importAesKey(b64ToBytes(pkg.dek)), priv: await importPrivateKey(pkg.priv) } };
}

/* ------------------------------------------------- organization keys */

/**
 * The organization key lets every member (and the owner) decrypt the
 * organization's task content. The owner's DEK wraps their own copy; members
 * receive an ECDH grant addressed to their public key.
 */
export async function createOrgKey(dek: CryptoKey): Promise<{ key: CryptoKey; wrapped: string }> {
  const { key, raw } = await randomAesKey();

  return { key, wrapped: await encryptBytes(dek, raw) };
}

export async function openOrgKey(dek: CryptoKey, wrapped: string): Promise<CryptoKey> {
  return importAesKey(await decryptBytes(dek, wrapped));
}

async function hkdfOrgKey(shared: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", shared, "HKDF", false, ["deriveKey"]);

  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: utf8("scrum-master.org"), info: utf8("org-key-v1") },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * ECIES-style grant: encrypt the raw org key to a member's public key using
 * an ephemeral ECDH pair. Format: "v1.<ephemeral pub>.<iv‖ct>".
 */
export async function grantOrgKey(memberPubB64: string, orgKey: CryptoKey): Promise<string> {
  const eph = await generateKeyPair();
  const memberPub = await importPublicKey(memberPubB64);
  const shared = await crypto.subtle.deriveBits(
    { name: "ECDH", public: memberPub },
    eph.privateKey,
    256,
  );
  const wrapKey = await hkdfOrgKey(new Uint8Array(shared));
  const rawOrg = await crypto.subtle.exportKey("raw", orgKey);
  const wrapped = await encryptBytes(wrapKey, new Uint8Array(rawOrg));
  const ephPub = await exportPublicKey(eph);

  return `v1.${ephPub}.${wrapped}`;
}

/** Open a grant from the owner with the member's private key. */
export async function openOrgGrant(privKey: CryptoKey, grant: string): Promise<CryptoKey> {
  const [version, ephPubB64, wrapped] = grant.split(".");

  if (version !== "v1" || !ephPubB64 || !wrapped) {
    throw new Error("Unsupported organization grant.");
  }

  const ephPub = await importPublicKey(ephPubB64);
  const shared = await crypto.subtle.deriveBits(
    { name: "ECDH", public: ephPub },
    privKey,
    256,
  );
  const wrapKey = await hkdfOrgKey(new Uint8Array(shared));
  const rawOrg = await decryptBytes(wrapKey, wrapped);

  return importAesKey(rawOrg);
}

/* ---------------------------------------------------- task content */

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(ENC_PREFIX);
}

export async function encryptField(key: CryptoKey, text: string): Promise<string> {
  return ENC_PREFIX + (await encryptBytes(key, utf8(text)));
}

/**
 * Decrypt one stored field. Values without the envelope prefix are legacy
 * plaintext and pass straight through (backwards compatible). With the
 * prefix but no usable key (or a wrong key) → UNREADABLE rather than a throw,
 * so one bad row can never break a list.
 */
export async function decryptField(
  key: CryptoKey | null,
  value: string | null | undefined,
): Promise<string> {
  if (!value) {
    return "";
  }

  if (!isEncrypted(value)) {
    return value;
  }

  if (!key) {
    return UNREADABLE;
  }

  try {
    return fromUtf8(await decryptBytes(key, value.slice(ENC_PREFIX.length)));
  } catch {
    return UNREADABLE;
  }
}
