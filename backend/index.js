import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import userRouter from './routes/userRouter.js'
import searchRouter from './routes/searchRouter.js';
import movieRouter from './routes/movieRouter.js'
import groupRouter from './routes/groupRouter.js'
import reviewsRouter from './routes/reviewRouter.js'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/user', userRouter)
app.use('/api/search', searchRouter);
app.use('/api/movies', movieRouter)
app.use('/api/groups', groupRouter)
app.use('/api/reviews',reviewRouter)

app.use((err, req, res, next) => {
  if (err?.code === '23505') {
    return res.status(409).json({ error: 'Email already exists' })
  }
  const status = err.status || 500
  res.status(status).json({ error: err.message || 'Server error' })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})
