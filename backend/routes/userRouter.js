import { pool } from '../helper/db.js'
import { Router } from 'express'
import { hash, compare } from 'bcrypt'
import jwt from 'jsonwebtoken'

const router = Router()
const { sign, verify } = jwt


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


const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
const isStrongPassword = (pwd) => /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(pwd)


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
        if (err) return next(err)        
        res.status(201).json(r.rows[0]) 
      }
    )
  })
})

router.patch('/me/password', auth, async (req, res, next) => {
  const userId = req.user?.id;
  const { currentPassword, newPassword } = req.body || {};

  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!currentPassword || !newPassword) {
    const e = new Error('currentPassword and newPassword are required');
    e.status = 400; return next(e);
  }
  if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword)) {
    const e = new Error('Password must be at least 8 chars, include an uppercase letter and a number');
    e.status = 400; return next(e);
  }
  if (currentPassword === newPassword) {
    const e = new Error('New password must be different from current');
    e.status = 400; return next(e);
  }

  try {
    const r = await pool.query('SELECT password_hash FROM "user" WHERE id = $1', [userId]);
    if (r.rows.length === 0) { const e = new Error('User not found'); e.status = 404; return next(e); }

    const ok = await new Promise((resolve, reject) =>
      compare(currentPassword, r.rows[0].password_hash, (err, ok2) => err ? reject(err) : resolve(ok2))
    );
    if (!ok) { const e = new Error('Current password is incorrect'); e.status = 401; return next(e); }

    const hashed = await new Promise((resolve, reject) =>
      hash(newPassword, 10, (err, h) => err ? reject(err) : resolve(h))
    );

    await pool.query(
      'UPDATE "user" SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashed, userId]
    );

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});





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

      
      const token = sign({ id: dbUser.id, email: dbUser.email }, process.env.JWT_SECRET, { expiresIn: '7d' })
      res.status(200).json({ id: dbUser.id, email: dbUser.email, token })
    })
  })
})

router.delete('/me', auth, async (req, res) => {
  const userId = req.user?.id
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    
    
    const del = await client.query('DELETE FROM "user" WHERE id = $1', [userId])

    await client.query('COMMIT')

    if (del.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    
    return res.status(204).send()
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('[DELETE /api/user/me] failed:', e)
    return res.status(500).json({ error: 'Failed to delete account' })
  } finally {
    client.release()
  }
})

// backend/routes/userRouter.js
router.get('/profile', auth, async (req, res) => {
  console.log('[GET /api/user/profile] req.user =', req.user); 

  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const r = await pool.query(
    'SELECT id, email, created_at, updated_at FROM "user" WHERE id = $1',
    [userId]
  );

  if (r.rows.length === 0) {
    console.log('[GET /api/user/me] not found id=', userId);
    
    return res.status(404).json({ error: 'User not found' });
  }

  return res.status(200).json(r.rows[0]);
});


export default router
