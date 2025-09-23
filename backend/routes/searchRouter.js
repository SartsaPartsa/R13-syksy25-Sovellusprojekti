import express from 'express'
import { getGenres, searchMoviesController } from '../controllers/searchController.js'

// Search endpoints backed by TMDB
// - /genres : get genre list
// - /movies : search with filters and sorting
const router = express.Router()

// Genre list (language optional)
router.get('/genres', getGenres)

// Movie search with optional filters:
// q (required), page, language, minRating, genre, yearFrom, yearTo, sort
router.get('/movies', searchMoviesController)

export default router
