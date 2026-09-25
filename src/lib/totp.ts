import "server-only";
import crypto from "node:crypto";

// Hand-rolled RFC 4226 (HOTP) / RFC 6238 (TOTP) implementation — deliberately
// avoids adding a dependency (otplib et al.) for ~100 lines of well-trodden,
// standardized math that only ever runs server-side. Uses the interoperable
// defaults (SHA-1, 6 digits, 30s period) required for compatibility with
// Google Authenticator, which does not support SHA-256/512 or other digit
// counts — see scripts/node/lib/totp.mjs for the CLI-side twin of this file
// (used by create-admin.mjs, which can't import TypeScript/path-aliased
// modules) — keep both in sync if this file changes.

const DIGITS = 6;
const PERIOD_SECONDS = 30;
const ALGORITHM = "sha1";
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input: string): Buffer {
  // Authenticator apps commonly render/accept secrets with spaces every 4
  // chars, and "=" padding is valid but optional — strip both before decoding.
  const clean = input.toUpperCase().replace(/[\s=]+/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

// Generates a new random TOTP secret (base32-encoded, 20 bytes/160 bits —
// the size Google Authenticator and RFC 4226 both recommend).
export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

function hotp(secret: Buffer, counter: bigint): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(counter);
  const hmac = crypto.createHmac(ALGORITHM, secret).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const otp = binary % 10 ** DIGITS;
  return otp.toString().padStart(DIGITS, "0");
}

function currentCounter(stepOffset = 0): bigint {
  return BigInt(Math.floor(Date.now() / 1000 / PERIOD_SECONDS) + stepOffset);
}

// Generates the current 6-digit code for `secretBase32` — mainly useful for
// tests/tooling (e.g. the create-admin enrollment confirmation step could
// call the script-side twin of this instead of relying on the user's app).
export function generateTotpToken(secretBase32: string): string {
  return hotp(base32Decode(secretBase32), currentCounter());
}

// Verifies a user-submitted code against the current time step, tolerating
// +/-1 step (30s) of clock drift/latency in either direction. Uses a
// timing-safe comparison so response timing can't be used to narrow down
// which digits are correct.
export function verifyTotpToken(secretBase32: string, token: string, window = 1): boolean {
  if (!/^\d{6}$/.test(token)) return false;
  const secret = base32Decode(secretBase32);
  const tokenBuffer = Buffer.from(token, "utf8");

  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    const candidate = hotp(secret, currentCounter(errorWindow));
    const candidateBuffer = Buffer.from(candidate, "utf8");
    if (crypto.timingSafeEqual(candidateBuffer, tokenBuffer)) {
      return true;
    }
  }
  return false;
}

// Builds the otpauth:// URI used for QR-code/manual enrollment in an
// authenticator app. The issuer is included both as the label prefix (older
// apps only read this) and as the explicit `issuer` param (newer apps prefer
// it) — see https://github.com/google/google-authenticator/wiki/Key-Uri-Format.
export function buildOtpAuthUrl(email: string, secretBase32: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(PERIOD_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// --- Encryption at rest -----------------------------------------------------
//
// The raw base32 TOTP secret is never written to secrets/admin-users.json.
// Instead it's encrypted (AES-256-GCM) with a key that lives only in the
// server's environment (ADMIN_SECRETS_KEY, loaded via .env.local / the
// docker-compose env_file — never the same file/mount as admin-users.json).
// This only protects against a narrower class of leaks (e.g. the JSON file
// or a backup of it being exposed without the environment also being
// exposed) — it provides no protection against a fully compromised running
// container, which can read its own environment just as easily. Still worth
// doing: defense in depth, and it means the secrets file alone is not enough
// to clone anyone's 2FA.

const ENC_ALGORITHM = "aes-256-gcm";
const ENC_VERSION = "v1";

function getEncryptionKey(): Buffer {
  const raw = process.env.ADMIN_SECRETS_KEY;
  if (!raw) {
    throw new Error(
      "ADMIN_SECRETS_KEY environment variable is not set — required to encrypt/decrypt TOTP secrets. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("ADMIN_SECRETS_KEY must decode (base64) to exactly 32 bytes");
  }
  return key;
}

// Encrypts a plaintext base32 TOTP secret into the string stored in
// secrets/admin-users.json as `totpSecret`. Format: "v1.<iv>.<authTag>.<ciphertext>",
// each component hex-encoded.
export function encryptTotpSecret(plainSecretBase32: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV, recommended size for GCM
  const cipher = crypto.createCipheriv(ENC_ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plainSecretBase32, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [ENC_VERSION, iv.toString("hex"), authTag.toString("hex"), ciphertext.toString("hex")].join(
    "."
  );
}

// Reverses encryptTotpSecret, recovering the plaintext base32 secret used
// for the actual HOTP/TOTP computation. Throws (rather than silently
// returning garbage) on tampering, wrong key, or a malformed stored value —
// callers should treat any thrown error as "TOTP verification unavailable"
// and fail closed.
export function decryptTotpSecret(stored: string): string {
  const key = getEncryptionKey();
  const parts = stored.split(".");
  if (parts.length !== 4 || parts[0] !== ENC_VERSION) {
    throw new Error("Unrecognized encrypted TOTP secret format");
  }
  const [, ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = crypto.createDecipheriv(ENC_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
