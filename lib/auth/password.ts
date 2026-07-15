// Deliberately no `server-only` guard, unlike the rest of lib/auth: the seed and
// verify scripts hash passwords from plain Node, where that import throws. The
// node:crypto dependency below already makes this module impossible to bundle
// for the browser.
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const KEY_LEN = 64;

/**
 * scrypt from the Node standard library rather than a bcrypt/argon dependency:
 * this app self-hosts on SQLite with two accounts, and scrypt is deliberately
 * memory-hard, which is the property that matters here.
 *
 * Format: `scrypt:<salt hex>:<key hex>`. The prefix leaves room to migrate to
 * another algorithm later without guessing at what old rows contain.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await scryptAsync(password, salt, KEY_LEN);
  return `scrypt:${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, keyHex] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !keyHex) return false;

  const expected = Buffer.from(keyHex, "hex");
  const actual = await scryptAsync(password, salt, expected.length);

  // Length must match before timingSafeEqual, which throws on a mismatch.
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
