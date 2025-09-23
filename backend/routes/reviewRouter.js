import { Router } from 'express';
import { auth } from '../helper/auth.js';
import { listMovieReviews, upsertMovieReview, patchMovieReview, deleteMovieReview } from '../controllers/reviewController.js';

const router = Router({ mergeParams: true });

// list reviews (public)
router.get('/', listMovieReviews);

// create or update review (auth)
router.post('/', auth, upsertMovieReview);

// update review (auth)
router.patch('/:id', auth, patchMovieReview);

// delete review (auth)
router.delete('/:id', auth, deleteMovieReview);

export default router;
