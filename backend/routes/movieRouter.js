import express from 'express'
import { getMovieById, getPopularToday } from '../controllers/movieController.js'
import reviewRouter from './reviewRouter.js'

const router = express.Router()

// endpoint: popular movie for home card
router.get('/popular/today', getPopularToday)

router.get('/:id', getMovieById)

router.use('/:movieId/reviews', reviewRouter)

export default router
