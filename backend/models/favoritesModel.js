import { pool } from '../helper/db.js'

// Add a movie to a user's favorites (no-op on conflict)
export async function addFavorite(userId, movieId) {
    await pool.query(
        'INSERT INTO favorites (user_id, movie_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, movieId]
    )
}

// List all shared favorite lists (public)
export async function listShared() {
    const r = await pool.query(
        'SELECT display_name, slug FROM favorite_share WHERE is_shared = TRUE ORDER BY display_name ASC'
    )
    return r.rows || []
}

// Get the share record for a specific user
export async function getShareForUser(userId) {
    const r = await pool.query('SELECT user_id, display_name, slug, is_shared FROM favorite_share WHERE user_id = $1', [userId])
    return r.rows[0] || null
}

// Insert or update a user's share record, return the current row
export async function upsertShare(userId, displayName, isShared) {
    const q = `INSERT INTO favorite_share (user_id, display_name, is_shared)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name, is_shared = EXCLUDED.is_shared, updated_at = now()
             RETURNING user_id, display_name, slug, is_shared`;
    const r = await pool.query(q, [userId, displayName, Boolean(isShared)])
    return r.rows[0]
}

// Find a shared list by slug (only if public)
export async function getShareBySlug(slug) {
    const r = await pool.query('SELECT user_id, display_name, slug FROM favorite_share WHERE slug = $1 AND is_shared = TRUE', [slug])
    return r.rows[0] || null
}

// Return movie ids favorited by a user
export async function getFavoriteMoviesForUser(userId) {
    const favs = await pool.query('SELECT movie_id FROM favorites WHERE user_id = $1', [userId])
    return favs.rows || []
}

// Get the owner user id for a public share slug
export async function getSharedUserIdBySlug(slug) {
    const r = await pool.query('SELECT user_id FROM favorite_share WHERE slug = $1 AND is_shared = TRUE', [slug])
    return r.rows[0]?.user_id || null
}

// Alias for getting a user's favorite movie ids
export async function listUserFavorites(userId) {
    const r = await pool.query('SELECT movie_id FROM favorites WHERE user_id = $1', [userId])
    return r.rows || []
}

// Remove a favorite, return number of deleted rows
export async function removeFavorite(userId, movieId) {
    const r = await pool.query('DELETE FROM favorites WHERE user_id = $1 AND movie_id = $2', [userId, movieId])
    return r.rowCount
}
