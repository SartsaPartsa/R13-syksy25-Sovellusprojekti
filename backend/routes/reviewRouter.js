// backend/routes/reviewRouter.js  (под таблицу "review")
import { Router } from 'express';
import { pool } from '../helper/db.js';
import { auth } from '../helper/auth.js';

const router = Router({ mergeParams: true });

function validate({ rating, text }) {
  const r = Number(rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) {
    const e = new Error('Rating must be an integer 1..5'); e.status = 400; throw e;
  }
  const t = String(text ?? '').trim();
  if (!t) { const e = new Error('Text is required'); e.status = 400; throw e; }
  return { rating: r, text: t };
}

// LIST (public)
router.get('/', async (req, res, next) => {
  try {
    const movieId = Number(req.params.movieId);
    if (!Number.isInteger(movieId)) { const e = new Error('Invalid movieId'); e.status = 400; throw e; }

    const q = `
      SELECT rv.id,
             rv.movie_id,
             rv.rating,
             rv.text,                      -- в этой схеме поле называется text
             rv.created_at,
             rv.updated_at,
             u.id   AS user_id,
             u.email AS user_email
        FROM "review" rv
        JOIN "user" u ON u.id = rv.user_id
       WHERE rv.movie_id = $1
       ORDER BY rv.created_at DESC
    `;
    const r = await pool.query(q, [movieId]);
    res.status(200).json(r.rows);
  } catch (e) { next(e); }
});

// CREATE/UPSERT (auth)
router.post('/', auth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const movieId = Number(req.params.movieId);
    if (!Number.isInteger(movieId)) { const e = new Error('Invalid movieId'); e.status = 400; throw e; }
    const { rating, text } = validate(req.body || {});

    await client.query('BEGIN');

    // Если нет UNIQUE(user_id, movie_id), делаем ручной upsert:
    const existing = await client.query(
      'SELECT id FROM "review" WHERE movie_id = $1 AND user_id = $2',
      [movieId, req.user.id]
    );

    let out;
    if (existing.rows.length) {
      out = await client.query(
        `UPDATE "review"
            SET rating = $1,
                text   = $2,
                updated_at = NOW()
          WHERE id = $3
          RETURNING id, movie_id, rating, text, created_at, updated_at`,
        [rating, text, existing.rows[0].id]
      );
    } else {
      out = await client.query(
        `INSERT INTO "review" (movie_id, user_id, rating, text, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id, movie_id, rating, text, created_at, updated_at`,
        [movieId, req.user.id, rating, text]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(out.rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally {
    client.release();
  }
});

// PATCH (auth)
router.patch('/:id', auth, async (req, res, next) => {
  try {
    const movieId  = Number(req.params.movieId);
    const reviewId = req.params.id;
    if (!Number.isInteger(movieId)) { const e = new Error('Invalid movieId'); e.status = 400; throw e; }

    let newRating = null;
    let newText   = null;

    if (req.body?.rating !== undefined) {
      const r = Number(req.body.rating);
      if (!Number.isInteger(r) || r < 1 || r > 5) { const e = new Error('Rating must be 1..5'); e.status = 400; throw e; }
      newRating = r;
    }
    if (req.body?.text !== undefined) {
      const t = String(req.body.text).trim();
      if (!t) { const e = new Error('Text is required'); e.status = 400; throw e; }
      newText = t;
    }

    const q = `
      UPDATE "review"
         SET rating    = COALESCE($1, rating),
             text      = COALESCE($2, text),
             updated_at = NOW()
       WHERE id = $3
         AND movie_id = $4
         AND user_id  = $5
       RETURNING id, movie_id, rating, text, created_at, updated_at
    `;
    const r = await pool.query(q, [newRating, newText, reviewId, movieId, req.user.id]);
    if (r.rowCount === 0) { const e = new Error('Review not found or forbidden'); e.status = 404; throw e; }
    res.status(200).json(r.rows[0]);
  } catch (e) { next(e); }
});

// DELETE (auth)
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const movieId  = Number(req.params.movieId);
    const reviewId = req.params.id;
    if (!Number.isInteger(movieId)) { const e = new Error('Invalid movieId'); e.status = 400; throw e; }

    const r = await pool.query(
      'DELETE FROM "review" WHERE id = $1 AND movie_id = $2 AND user_id = $3',
      [reviewId, movieId, req.user.id]
    );
    if (r.rowCount === 0) { const e = new Error('Review not found or forbidden'); e.status = 404; throw e; }

    res.status(204).send();
  } catch (e) { next(e); }
});

export default router;
