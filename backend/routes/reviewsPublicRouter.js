import { Router } from 'express';
import { pool } from '../helper/db.js';

const router = Router();

router.get('/latest', async (req, res, next) => {
  try {
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 20));
    const page  = Math.max(1, Number(req.query.page) || 1);
    const offset = (page - 1) * limit;

    const list = await pool.query(
      `SELECT rv.id, rv.movie_id, rv.rating, rv.text,
              rv.created_at, rv.updated_at,
              u.email AS user_email, u.id AS user_id
         FROM review rv
         JOIN "user" u ON u.id = rv.user_id
        ORDER BY rv.created_at DESC
        LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const total = await pool.query('SELECT COUNT(*)::int AS c FROM review');

    res.json({ items: list.rows, total: total.rows[0].c, page, limit });
  } catch (e) { next(e); }
});

export default router;
