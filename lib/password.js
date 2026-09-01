import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
export { PASSWORD_MIN, passwordError } from './password-rules.js'

const derive = promisify(scrypt)

// scrypt ships with Node, so there is no dependency to keep patched and no
// native build to break on a deploy. Cost is the parameter that matters: N is
// the work factor, and it is stored alongside the hash so it can be raised
// later without invalidating everyone's existing password.
const N = 16384
const KEYLEN = 64

export async function hashPassword (password) {
  const salt = randomBytes(16)
  const key = await derive(password, salt, KEYLEN, { N, maxmem: 96 * 1024 * 1024 })
  return `scrypt:${N}:${salt.toString('hex')}:${key.toString('hex')}`
}

// Never throws on a malformed or missing hash: an account with no password set
// simply fails to verify, the same as a wrong one.
export async function verifyPassword (password, stored) {
  if (typeof stored !== 'string') return false
  const [scheme, n, saltHex, keyHex] = stored.split(':')
  if (scheme !== 'scrypt' || !n || !saltHex || !keyHex) return false
  try {
    const expected = Buffer.from(keyHex, 'hex')
    const actual = await derive(password, Buffer.from(saltHex, 'hex'), expected.length, {
      N: Number(n), maxmem: 96 * 1024 * 1024
    })
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}
