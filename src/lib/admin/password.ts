import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"

/**
 * Password hashing for the owner login. Stored form:
 *   scrypt:<N>:<r>:<p>:<salt base64url>:<hash base64url>
 * ":" separators on purpose: Railway treats "${{" as a variable reference, so "$" is avoided.
 * The parameters travel with the hash, so they can be raised later without breaking old hashes.
 */

const N = 2 ** 15
const R = 8
const P = 1
const KEYLEN = 64
const SALT_BYTES = 16

// Upper bounds applied when verifying, so a malformed value cannot demand unbounded memory.
const MAX_N = 2 ** 20
const MAX_R = 32
const MAX_P = 16

function derive(plain: string, salt: Buffer, n: number, r: number, p: number, keylen: number): Promise<Buffer> {
  // scrypt needs about 128 * N * r bytes; Node's default maxmem is 32 MiB, exactly the cost of N=2^15, r=8.
  const maxmem = 128 * n * r * 2 + 1024 * 1024
  return new Promise((resolve, reject) => {
    scrypt(plain.normalize("NFKC"), salt, keylen, { N: n, r, p, maxmem }, (err, key) => {
      if (err) reject(err)
      else resolve(key)
    })
  })
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES)
  const hash = await derive(plain, salt, N, R, P, KEYLEN)
  return ["scrypt", N, R, P, salt.toString("base64url"), hash.toString("base64url")].join(":")
}

function isPowerOfTwo(n: number): boolean {
  return n >= 2 && (n & (n - 1)) === 0
}

const B64URL = /^[A-Za-z0-9_-]+$/

/** Returns false for a wrong password and for any malformed stored value; never throws. */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  try {
    if (typeof plain !== "string" || typeof stored !== "string") return false
    const parts = stored.trim().split(":")
    if (parts.length !== 6 || parts[0] !== "scrypt") return false
    const [, nS, rS, pS, saltS, hashS] = parts
    if (!/^\d+$/.test(nS) || !/^\d+$/.test(rS) || !/^\d+$/.test(pS)) return false
    if (!B64URL.test(saltS) || !B64URL.test(hashS)) return false
    const n = Number(nS)
    const r = Number(rS)
    const p = Number(pS)
    if (!isPowerOfTwo(n) || n > MAX_N) return false
    if (r < 1 || r > MAX_R || p < 1 || p > MAX_P) return false
    const salt = Buffer.from(saltS, "base64url")
    const expected = Buffer.from(hashS, "base64url")
    // scrypt output is a prefix of a longer output, so a truncated hash would still match: pin the length.
    if (salt.length < 8 || expected.length !== KEYLEN) return false
    const actual = await derive(plain, salt, n, r, p, expected.length)
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}
