import { pool } from '../helper/db.js'
import { Router } from 'express'
import { hash, compare } from 'bcrypt'
import jwt from 'jsonwebtoken'

const { sign } = jwt
const router = Router()

// apufunktio ("minimipituus on 8 merkkiä sisältäen vähintään yhden ison kirjaimen ja numeron.")
const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
const isStrongPassword = (pwd) => /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(pwd)

router.post('/signup', (req, res, next) => {
  const { user } = req.body
  if (!user || !user.email || !user.password) {
    const err = new Error('Email and password are required')
    err.status = 400
    return next(err)
  }
  if (!isValidEmail(user.email)) {
    const err = new Error('Invalid email')
    err.status = 400
    return next(err)
  }
  if (!isStrongPassword(user.password)) {
    const err = new Error('Password must be at least 8 chars, include an uppercase letter and a number')
    err.status = 400
    return next(err)
  }

  hash(user.password, 10, (err, hashed) => {
    if (err) return next(err)
    pool.query(
      'INSERT INTO "user" (email, password_hash, created_at) VALUES ($1, $2, NOW()) RETURNING id, email',
      [user.email, hashed],
      (err, result) => {
        if (err) return next(err)
        return res.status(201).json(result.rows[0])
      }
    )
  })
})

router.post('/signup', (req, res, next) => {
  const { user } = req.body

  if (!user || !user.email || !user.password) {
    const error = new Error('Email and password are required')
    error.status = 400
    return next(error)
  }

  hash(user.password, 10, (err, hashedPassword) => {
    if (err) return next(err)

    pool.query(
      'INSERT INTO "user" (email, password_hash) VALUES ($1, $2) RETURNING *',
      [user.email, hashedPassword],
      (err, result) => {
        if (err) {
            return next(err)
        }
        res.status(201).json({ id: result.rows[0].id, email: user.email })
      }
    )
  })
})

router.post('/signin', (req, res, next) => {
  const { user } = req.body
  if (!user || !user.email || !user.password) {
    const err = new Error('Email and password are required')
    err.status = 400
    return next(err)
  }

  pool.query('SELECT * FROM "user" WHERE email = $1', [user.email], (err, r) => {
    if (err) return next(err)
    if (r.rows.length === 0) {
      const e = new Error('User not found'); e.status = 404; return next(e)
    }
    const dbUser = r.rows[0]
    compare(user.password, dbUser.password_hash, (err, ok) => {
      if (err) return next(err)
      if (!ok) { const e = new Error('Invalid password'); e.status = 401; return next(e) }

      const token = sign({ user: dbUser.email }, process.env.JWT_SECRET)
      return res.status(200).json({ id: dbUser.id, email: dbUser.email, token })
    })
  })
})

export default router
