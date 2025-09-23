import express from 'express'
import { auth } from '../helper/auth.js'
import {
  addFavorite,
  listShared,
  getMyShare,
  upsertShare,
  getShareBySlug,
  getSharedMovies,
  streamShared,
  getUserFavorites,
  removeFavorite,
} from '../controllers/favoritesController.js'

const router = express.Router();

// add favorite
router.post('/', addFavorite)

// favorite sharing
// list shared favorite lists (public)
router.get('/shared', listShared)

// get current user's share status
router.get('/share/me', auth, getMyShare)

// update share status and name; upsert if needed
router.post('/share', auth, upsertShare)

// get share info by slug (public)
router.get('/share/:slug', getShareBySlug)

// get shared list movies by slug (public)
router.get('/share/:slug/movies', getSharedMovies)

// SSE stream for shared favorites (public)
router.get('/stream', streamShared)

// get user's favorites (after specific routes to avoid /shared)
router.get('/:userId', getUserFavorites)

// remove favorite
router.delete('/:userId/:movieId', removeFavorite)

export default router;

