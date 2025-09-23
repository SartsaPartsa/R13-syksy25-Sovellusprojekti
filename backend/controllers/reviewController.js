import {
    listByMovieId,
    getExistingReview,
    updateReviewById,
    insertReview,
    patchReview,
    deleteReview,
    listLatest,
} from '../models/reviewModel.js';

function validate({ rating, text }) {
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
        const e = new Error('Rating must be an integer 1..5'); e.status = 400; throw e;
    }
    const t = String(text ?? '').trim();
    if (!t) { const e = new Error('Text is required'); e.status = 400; throw e; }
    return { rating: r, text: t };
}

// GET /api/reviews/latest (public)
export async function getLatestPublic(req, res, next) {
    try {
        const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 20));
        const page = Math.max(1, Number(req.query.page) || 1);
        const offset = (page - 1) * limit;
        const { items, total } = await listLatest({ limit, offset });
        res.json({ items, total, page, limit });
    } catch (e) { next(e); }
}

// GET /api/movies/:movieId/reviews (public)
export async function listMovieReviews(req, res, next) {
    try {
        const movieId = Number(req.params.movieId);
        if (!Number.isInteger(movieId)) { const e = new Error('Invalid movieId'); e.status = 400; throw e; }

        const rows = await listByMovieId(movieId);
        res.status(200).json(rows);
    } catch (e) { next(e); }
}

// POST /api/movies/:movieId/reviews (auth)
export async function upsertMovieReview(req, res, next) {
    try {
        const movieId = Number(req.params.movieId);
        if (!Number.isInteger(movieId)) { const e = new Error('Invalid movieId'); e.status = 400; throw e; }
        const { rating, text } = validate(req.body || {});
        const existing = await getExistingReview(movieId, req.user.id);
        let out;
        if (existing) out = await updateReviewById(existing.id, { rating, text });
        else out = await insertReview({ movieId, userId: req.user.id, rating, text });
        res.status(201).json(out);
    } catch (e) { next(e); }
}

// PATCH /api/movies/:movieId/reviews/:id (auth)
export async function patchMovieReview(req, res, next) {
    try {
        const movieId = Number(req.params.movieId);
        const reviewId = req.params.id;
        if (!Number.isInteger(movieId)) { const e = new Error('Invalid movieId'); e.status = 400; throw e; }

        let newRating = null;
        let newText = null;

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

        const row = await patchReview({ reviewId, movieId, userId: req.user.id, newRating, newText });
        if (!row) { const e = new Error('Review not found or forbidden'); e.status = 404; throw e; }
        res.status(200).json(row);
    } catch (e) { next(e); }
}

// DELETE /api/movies/:movieId/reviews/:id (auth)
export async function deleteMovieReview(req, res, next) {
    try {
        const movieId = Number(req.params.movieId);
        const reviewId = req.params.id;
        if (!Number.isInteger(movieId)) { const e = new Error('Invalid movieId'); e.status = 400; throw e; }

        const rowCount = await deleteReview({ reviewId, movieId, userId: req.user.id });
        if (rowCount === 0) { const e = new Error('Review not found or forbidden'); e.status = 404; throw e; }
        res.status(204).send();
    } catch (e) { next(e); }
}
