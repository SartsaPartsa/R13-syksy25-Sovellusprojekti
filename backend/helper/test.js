import fetch from 'node-fetch'

// Read base url from env
const RAW_BASE = (process.env.TEST_BASE_URL || 'http://localhost:3001').replace(/\/$/, '')
// If the base already has /api we do not add it again
const HAS_API_IN_BASE = /\/api(?:\/|$)/.test(RAW_BASE)
export const API_BASE = HAS_API_IN_BASE ? RAW_BASE : `${RAW_BASE}/api`

// Resource bases
export const USER_BASE    = `${API_BASE}/user`
export const REVIEWS_BASE = `${API_BASE}/reviews`

// Make a unique email for test users
// Uses a prefix, current time, and a short random string
export function uniqueEmail(prefix = 'test') {
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}+${Date.now()}_${rand}@example.com`
}

// Make Authorization header when we have a token
// Returns an empty object when no token is given
export function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/* ---------- API wrappers ---------- */

// Create a new user
// Returns both the raw response and parsed data
export async function signup({ email, password }) {
  const res = await fetch(`${USER_BASE}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: { email, password } }),
  })
  // Some errors may not return json, so we try and fall back to null
  let data = null
  try { data = await res.json() } catch (_) {}
  return { res, data }
}

// Log in an existing user
// Returns response, parsed data, and token when present
export async function signin({ email, password }) {
  const res = await fetch(`${USER_BASE}/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: { email, password } }),
  })
  // On error the body may not be json, so we fall back to an empty object
  const data = await res.json().catch(() => ({}))

  return { res, data, token: data?.token }
}

// Create a test user using the API
export async function insertTestUser({ email, password }) {
  return signup({ email, password })
}

// Get a token for these credentials
export async function getToken({ email, password }) {
  const { res, data, token } = await signin({ email, password })
  return { res, data, token }
}

// Get the profile of the current user
export async function getProfile(token) {
  const res = await fetch(`${USER_BASE}/profile`, {
    headers: { ...authHeader(token) },
  })
  // If body is not json, use empty object
  const data = await res.json().catch(() => ({}))
  return { res, data }
}

// Permanently delete the current user account
export async function deleteAccount(token) {
  // Endpoint: DELETE /api/user/me
  const res = await fetch(`${USER_BASE}/me`, {
    method: 'DELETE',
    headers: { ...authHeader(token) },
  })
  // On success we may get json, but do not assume it
  let data = null
  try { data = await res.json() } catch (_) {}
  return { res, data }
}

// Get latest public reviews
// Optional params are added to the query string, empty values are ignored
export async function browseReviews(params = {}) {
  const qs =
    Object.keys(params).length === 0
      ? ''
      : '?' +
        new URLSearchParams(
          Object.entries(params).filter(([, v]) => v != null && v !== '')
        ).toString()

  // Endpoint: GET /api/reviews/latest
  const res = await fetch(`${REVIEWS_BASE}/latest${qs}`)
  // If body is not json, use empty object
  const data = await res.json().catch(() => ({}))
  return { res, data }
}

// Reset test database
export async function resetTestDb() {
  if (process.env.NODE_ENV !== 'test') return
  try {
    const { pool } = await import('./db.js')
    // Clear tables and restart ids. Cascade removes related rows.
    await pool.query('TRUNCATE TABLE review, "user" RESTART IDENTITY CASCADE')
  } catch (e) {
    console.warn('[resetTestDb] failed (ignored):', e?.message)
  }
}
