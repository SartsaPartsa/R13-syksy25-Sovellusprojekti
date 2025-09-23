import { pool } from '../helper/db.js'

// List reviews for a movie (latest first)
export async function listByMovieId(movieId) {
    const q = `
    SELECT rv.id,
           rv.movie_id,
           rv.rating,
           rv.text,
           rv.created_at,
           rv.updated_at,
           u.id   AS user_id,
           u.email AS user_email
      FROM "review" rv
      JOIN "user" u ON u.id = rv.user_id
     WHERE rv.movie_id = $1
     ORDER BY rv.created_at DESC
  `
    const r = await pool.query(q, [movieId])
    return r.rows
}

// Return existing review id for a user/movie pair, or null
export async function getExistingReview(movieId, userId) {
    const r = await pool.query('SELECT id FROM "review" WHERE movie_id = $1 AND user_id = $2', [movieId, userId])
    return r.rows[0] || null
}

// Replace full review by id
export async function updateReviewById(id, { rating, text }) {
    const q = `
    UPDATE "review"
       SET rating = $1,
           text   = $2,
           updated_at = NOW()
     WHERE id = $3
     RETURNING id, movie_id, rating, text, created_at, updated_at
  `
    const r = await pool.query(q, [rating, text, id])
    return r.rows[0]
}

// Insert a new review
export async function insertReview({ movieId, userId, rating, text }) {
    const q = `
    INSERT INTO "review" (movie_id, user_id, rating, text, created_at, updated_at)
    VALUES ($1, $2, $3, $4, NOW(), NOW())
    RETURNING id, movie_id, rating, text, created_at, updated_at
  `
    const r = await pool.query(q, [movieId, userId, rating, text])
    return r.rows[0]
}

// Patch a review (partial update) for the owning user
export async function patchReview({ reviewId, movieId, userId, newRating, newText }) {
    const q = `
    UPDATE "review"
       SET rating    = COALESCE($1, rating),
           text      = COALESCE($2, text),
           updated_at = NOW()
     WHERE id = $3
       AND movie_id = $4
       AND user_id  = $5
     RETURNING id, movie_id, rating, text, created_at, updated_at
  `
    const r = await pool.query(q, [newRating, newText, reviewId, movieId, userId])
    return r.rows[0] || null
}

// Delete a review (by id, movie and user)
export async function deleteReview({ reviewId, movieId, userId }) {
    const r = await pool.query('DELETE FROM "review" WHERE id = $1 AND movie_id = $2 AND user_id = $3', [reviewId, movieId, userId])
    return r.rowCount
}

// List latest reviews with pagination and total count
export async function listLatest({ limit, offset }) {
    const list = await pool.query(
        `SELECT rv.id, rv.movie_id, rv.rating, rv.text,
            rv.created_at, rv.updated_at,
            u.email AS user_email, u.id AS user_id
       FROM review rv
       JOIN "user" u ON u.id = rv.user_id
      ORDER BY rv.created_at DESC
      LIMIT $1 OFFSET $2`,
        [limit, offset]
    )
    const total = await pool.query('SELECT COUNT(*)::int AS c FROM review')
    return { items: list.rows, total: total.rows[0].c }
}
