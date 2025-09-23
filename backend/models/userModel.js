import { pool } from '../helper/db.js'

// Create a new user and return id/email
export async function createUser(email, passwordHash) {
    const r = await pool.query(
        'INSERT INTO "user" (email, password_hash, created_at) VALUES ($1, $2, NOW()) RETURNING id, email',
        [email, passwordHash]
    )
    return r.rows[0]
}

// Find user by email (includes password_hash)
export async function findByEmail(email) {
    const r = await pool.query('SELECT id, email, password_hash FROM "user" WHERE email = $1', [email])
    return r.rows[0] || null
}

// Get password hash for a user id
export async function getPasswordHashById(userId) {
    const r = await pool.query('SELECT password_hash FROM "user" WHERE id = $1', [userId])
    return r.rows[0]?.password_hash || null
}

// Update user's password hash
export async function updatePassword(userId, passwordHash) {
    await pool.query('UPDATE "user" SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, userId])
}

// Delete user by id, return deleted rows
export async function deleteById(userId) {
    const r = await pool.query('DELETE FROM "user" WHERE id = $1', [userId])
    return r.rowCount
}

// Get user profile fields
export async function getProfileById(userId) {
    const r = await pool.query('SELECT id, email, created_at, updated_at FROM "user" WHERE id = $1', [userId])
    return r.rows[0] || null
}
