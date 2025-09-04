import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import userRouter from './routes/userRouter.js'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

app.use(userRouter)

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
