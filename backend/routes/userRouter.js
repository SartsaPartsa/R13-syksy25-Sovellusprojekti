import { pool } from '../helper/db.js'
import { Router } from 'express'
import { hash, compare } from 'bcrypt'
import jwt from 'jsonwebtoken'

const router = Router()
const { sign, verify } = jwt

// --- простая auth-мидлварь ---
const auth = (req, res, next) => {
  const raw = req.headers.authorization || ''
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw
  if (!token) return res.status(401).json({ message: 'No token provided' })
  try {
    const decoded = verify(token, process.env.JWT_SECRET) // { id, email }
    req.user = { id: decoded.id, email: decoded.email }
    next()
  } catch {
    return res.status(401).json({ message: 'Failed to authenticate token' })
  }
}

// --- валидация ---
const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
const isStrongPassword = (pwd) => /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(pwd)

// SIGNUP
router.post('/signup', (req, res, next) => {
  const { user } = req.body
  if (!user?.email || !user?.password) {
    const err = new Error('Email and password are required'); err.status = 400; return next(err)
  }
  if (!isValidEmail(user.email)) {
    const err = new Error('Invalid email'); err.status = 400; return next(err)
  }
  if (!isStrongPassword(user.password)) {
    const err = new Error('Password must be at least 8 chars, include an uppercase letter and a number')
    err.status = 400; return next(err)
  }

  hash(user.password, 10, (err, hashed) => {
    if (err) return next(err)
    pool.query(
      'INSERT INTO "user" (email, password_hash, created_at) VALUES ($1, $2, NOW()) RETURNING id, email',
      [user.email, hashed],
      (err, r) => {
        if (err) return next(err)        // 23505 обработается в error handler'е
        res.status(201).json(r.rows[0])  // { id, email }
      }
    )
  })
})

// SIGNIN
router.post('/signin', (req, res, next) => {
  const { user } = req.body
  if (!user?.email || !user?.password) {
    const err = new Error('Email and password are required'); err.status = 400; return next(err)
  }

  pool.query('SELECT id, email, password_hash FROM "user" WHERE email = $1', [user.email], (err, r) => {
    if (err) return next(err)
    if (r.rows.length === 0) { const e = new Error('User not found'); e.status = 404; return next(e) }
    const dbUser = r.rows[0]

    compare(user.password, dbUser.password_hash, (err, ok) => {
      if (err) return next(err)
      if (!ok) { const e = new Error('Invalid password'); e.status = 401; return next(e) }

      // Шьём токен с id + email (очень важно для /me)
      const token = sign({ id: dbUser.id, email: dbUser.email }, process.env.JWT_SECRET, { expiresIn: '7d' })
      res.status(200).json({ id: dbUser.id, email: dbUser.email, token })
    })
  })
})

// DELETE /me — удалить текущего пользователя
router.delete('/me', auth, async (req, res) => {
  const userId = req.user?.id
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // если нет ON DELETE CASCADE — удаляй связанные записи здесь
    // await client.query('DELETE FROM favorites WHERE user_id = $1', [userId])

    const { rowCount } = await client.query('DELETE FROM "user" WHERE id = $1', [userId])
    await client.query('COMMIT')

    if (rowCount === 0) return res.status(404).json({ error: 'User not found' })
    return res.status(204).send()
  } catch (e) {
    await client.query('ROLLBACK')
    console.error(e)
    return res.status(500).json({ error: 'Failed to delete account' })
  } finally {
    client.release()
  }
})

export default router
