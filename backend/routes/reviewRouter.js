import express from 'express'
const router = express.Router()


router.get('/:movieId', async (req, res, next) => {
  const { movieId } = req.params
  try {
    
    const reviews = await getReviewsByMovieId(movieId)  
    res.json(reviews)
  } catch (err) {
    next(err)
  }
})

// Esimerkki: Lisää arvostelu elokuvalle
router.post('/:movieId', async (req, res, next) => {
  const { movieId } = req.params
  const { userId, rating, comment } = req.body
  try {
    // Lisää arvostelu tietokantaan
    const review = await addReview(movieId, userId, rating, comment)
    res.status(201).json(review)
  } catch (err) {
    next(err)
  }
})

export default router
