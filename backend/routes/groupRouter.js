import { Router } from 'express'
import { pool } from '../helper/db.js'
import { auth } from '../helper/auth.js'
import jwt from 'jsonwebtoken'

const router = Router()

// --- SSE (Server-Sent Events) - lightweight pub/sub ---
const streams = new Map() // groupId -> Set(res)
const globalStreams = new Set() // all group list updates
function addStream(groupId, res) {
  const key = String(groupId)
  if (!streams.has(key)) streams.set(key, new Set())
  streams.get(key).add(res)
}
function removeStream(groupId, res) {
  const key = String(groupId)
  const set = streams.get(key)
  if (!set) return
  set.delete(res)
  if (set.size === 0) streams.delete(key)
}
function notify(groupId, type, payload = {}) {
  const set = streams.get(String(groupId))
  if (!set) return
  const msg = `event: ${type}\n` + `data: ${JSON.stringify(payload)}\n\n`
  for (const res of set) {
    try { res.write(msg) } catch {}
  }
}

function notifyAll(type, payload = {}) {
  const msg = `event: ${type}\n` + `data: ${JSON.stringify(payload)}\n\n`
  for (const res of globalStreams) {
    try { res.write(msg) } catch {}
  }
}

// List: groups + approved members count
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT g.id, g.name, g.owner_id, g.created_at,
             COALESCE(COUNT(m.*) FILTER (WHERE m.status = 'APPROVED'), 0) AS members_count
      FROM "group" g
      LEFT JOIN group_membership m
        ON m.group_id = g.id AND m.status = 'APPROVED'
      GROUP BY g.id
      ORDER BY g.created_at DESC
    `)
    res.status(200).json(rows)
  } catch (e) { next(e) }
})

// Create: owner is automatically added as member (APPROVED, MODERATOR)
router.post('/', auth, async (req, res, next) => {
  try {
    const { name } = req.body
    if (!name || !name.trim() || name.length > 120) {
      const err = new Error('Name is required (1–120 chars)')
      err.status = 400
      return next(err)
    }

    const ownerId = req.user.id
    const inserted = await pool.query(
      `INSERT INTO "group"(name, owner_id)
       VALUES ($1, $2)
       RETURNING id, name, owner_id, created_at`,
      [name.trim(), ownerId]
    )
    const group = inserted.rows[0]

    await pool.query(
      `INSERT INTO group_membership(group_id, user_id, status, role)
       VALUES ($1, $2, 'APPROVED', 'MODERATOR')
       ON CONFLICT (group_id, user_id) DO NOTHING`,
      [group.id, ownerId]
    )

  // notify others that a new group was created
  notifyAll('group-created', group)
  res.status(201).json(group)
  } catch (e) { next(e) }
})

// Detail: single group
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { rows } = await pool.query(
      `SELECT g.id, g.name, g.owner_id, g.created_at,
              COALESCE(COUNT(m.*) FILTER (WHERE m.status='APPROVED'), 0) AS members_count
       FROM "group" g
       LEFT JOIN group_membership m
         ON m.group_id = g.id AND m.status = 'APPROVED'
       WHERE g.id = $1
       GROUP BY g.id`,
      [id]
    )
    if (rows.length === 0) {
      const err = new Error('Group not found')
      err.status = 404
      return next(err)
    }
    res.status(200).json(rows[0])
  } catch (e) { next(e) }
})

// Join request: create/overwrite PENDING
router.post('/:id/join', auth, async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const g = await pool.query(`SELECT id, owner_id FROM "group" WHERE id = $1`, [id])
    if (g.rows.length === 0) {
      const err = new Error('Group not found')
      err.status = 404
      return next(err)
    }
    if (g.rows[0].owner_id === userId) {
      const err = new Error('Owner is already a member')
      err.status = 400
      return next(err)
    }

  const upsert = await pool.query(
      `INSERT INTO group_membership(group_id, user_id, status, role)
       VALUES ($1, $2, 'PENDING', 'MEMBER')
       ON CONFLICT (group_id, user_id)
       DO UPDATE SET status = 'PENDING'
       RETURNING id, group_id, user_id, status, role, created_at`,
      [id, userId]
    )

  notify(id, 'members-changed')
  res.status(201).json(upsert.rows[0])
  } catch (e) { next(e) }
})

// --- helpers ---
async function isOwner(groupId, userId) {
  const r = await pool.query('SELECT 1 FROM "group" WHERE id=$1 AND owner_id=$2', [groupId, userId])
  return r.rowCount > 0
}
async function isModerator(groupId, userId) {
  const r = await pool.query(
    `SELECT 1 FROM group_membership 
     WHERE group_id=$1 AND user_id=$2 AND status='APPROVED' AND role='MODERATOR'`,
    [groupId, userId]
  )
  return r.rowCount > 0
}
async function canModerate(groupId, userId) {
  return (await isOwner(groupId, userId)) || (await isModerator(groupId, userId))
}

// GET /api/groups/:id/members — members/owner only
router.get('/:id/members', auth, async (req, res, next) => {
  try {
    const { id } = req.params
    const me = req.user.id

  // allow owner or approved member
    const allowed = (await isOwner(id, me)) || (await pool.query(
      `SELECT 1 FROM group_membership WHERE group_id=$1 AND user_id=$2 AND status='APPROVED'`,
      [id, me]
    )).rowCount > 0
    if (!allowed) {
      const e = new Error('Forbidden')
      e.status = 403
      return next(e)
    }

    const r = await pool.query(
      `SELECT gm.user_id, u.email, gm.status, gm.role, gm.created_at
       FROM group_membership gm
       JOIN "user" u ON u.id = gm.user_id
       WHERE gm.group_id = $1
       ORDER BY gm.created_at ASC`,
      [id]
    )
    res.status(200).json(r.rows || [])
  } catch (e) { next(e) }
})

// PATCH /api/groups/:id/members/:userId — approve/reject (owner/moderator)
router.patch('/:id/members/:userId', auth, async (req, res, next) => {
  try {
    const { id, userId } = req.params
    const me = req.user.id
    const action = (req.body?.action || '').toLowerCase()

    if (!(await canModerate(id, me))) {
      const e = new Error('Forbidden')
      e.status = 403
      return next(e)
    }
    if (!['approve', 'reject'].includes(action)) {
      const e = new Error('Invalid action')
      e.status = 400
      return next(e)
    }

    const status = action === 'approve' ? 'APPROVED' : 'REJECTED'
    const r = await pool.query(
      `UPDATE group_membership 
       SET status = $3 
       WHERE group_id=$1 AND user_id=$2
       RETURNING user_id, status, role, created_at`,
      [id, userId, status]
    )
  if (r.rowCount === 0) {
      const e = new Error('Membership not found')
      e.status = 404
      return next(e)
    }
  notify(id, 'members-changed')
  res.status(200).json(r.rows[0])
  } catch (e) { next(e) }
})

// DELETE /api/groups/:id/members/me — leave the group (owner cannot)
router.delete('/:id/members/me', auth, async (req, res, next) => {
  try {
    const { id } = req.params
    const me = req.user.id

    if (await isOwner(id, me)) {
      const e = new Error('Owner cannot leave the group')
      e.status = 400
      return next(e)
    }
  await pool.query('DELETE FROM group_membership WHERE group_id=$1 AND user_id=$2', [id, me])
  notify(id, 'members-changed')
    res.sendStatus(204)
  } catch (e) { next(e) }
})

// DELETE /api/groups/:id — owner only
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params
    const me = req.user.id
    if (!(await isOwner(id, me))) {
      const e = new Error('Forbidden')
      e.status = 403
      return next(e)
    }
  await pool.query('DELETE FROM "group" WHERE id=$1', [id])
  notify(id, 'group-deleted')
  notifyAll('group-deleted', { id })
    res.sendStatus(204)
  } catch (e) { next(e) }
})

// DELETE /api/groups/:id/members/:userId — remove member (owner or moderator)
router.delete('/:id/members/:userId', auth, async (req, res, next) => {
  try {
    const { id, userId } = req.params
    const me = req.user.id
    if (!(await canModerate(id, me))) { const e = new Error('Forbidden'); e.status = 403; return next(e) }
  // owner cannot be removed
    if (await isOwner(id, userId)) { const e = new Error('Cannot remove owner'); e.status = 400; return next(e) }
  await pool.query('DELETE FROM group_membership WHERE group_id=$1 AND user_id=$2', [id, userId])
  notify(id, 'members-changed')
    res.sendStatus(204)
  } catch (e) { next(e) }
})

// ---- Group movies & showtimes ----
// Helpers
async function isApprovedMember(groupId, userId) {
  const r = await pool.query(
    `SELECT 1 FROM group_membership WHERE group_id=$1 AND user_id=$2 AND status='APPROVED'`,
    [groupId, userId]
  )
  return r.rowCount > 0
}

// List movies with showtimes (members only)
router.get('/:id/movies', auth, async (req, res, next) => {
  try {
    const { id } = req.params
    const me = req.user.id
    if (!(await isApprovedMember(id, me)) && !(await isOwner(id, me))) {
      const e = new Error('Forbidden'); e.status = 403; return next(e)
    }
    const r = await pool.query(
      `SELECT gm.id, gm.movie_id, gm.title, gm.added_by, gm.created_at,
              COALESCE(json_agg(json_build_object('id', gs.id, 'starts_at', gs.starts_at, 'theater', gs.theater, 'auditorium', gs.auditorium, 'added_by', gs.added_by)
                ORDER BY gs.starts_at) FILTER (WHERE gs.id IS NOT NULL), '[]') AS showtimes
       FROM group_movie gm
       LEFT JOIN group_showtime gs ON gs.group_movie_id = gm.id
       WHERE gm.group_id = $1
       GROUP BY gm.id
       ORDER BY gm.created_at DESC`,
      [id]
    )
  res.status(200).json(r.rows)
  } catch (e) { next(e) }
})

// Add a movie (approved members)
router.post('/:id/movies', auth, async (req, res, next) => {
  try {
    const { id } = req.params
    const me = req.user.id
    const { movie_id, title } = req.body || {}
    if (!movie_id) { const e = new Error('movie_id required'); e.status = 400; return next(e) }
    if (!(await isApprovedMember(id, me)) && !(await isOwner(id, me))) { const e = new Error('Forbidden'); e.status = 403; return next(e) }

  const r = await pool.query(
      `INSERT INTO group_movie (group_id, movie_id, title, added_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (group_id, movie_id) DO UPDATE SET title = EXCLUDED.title
       RETURNING id, movie_id, title, added_by, created_at`,
      [id, movie_id, (title || '').slice(0, 200), me]
    )
  notify(id, 'movies-changed')
  res.status(201).json({ ...r.rows[0], showtimes: [] })
  } catch (e) { next(e) }
})

// Delete a movie (moderators)
router.delete('/:id/movies/:gmId', auth, async (req, res, next) => {
  try {
    const { id, gmId } = req.params
    const me = req.user.id
    // Only the user who added the movie can delete it
    const del = await pool.query('DELETE FROM group_movie WHERE id=$1 AND group_id=$2 AND added_by=$3', [gmId, id, me])
    if (del.rowCount === 0) { const e = new Error('Forbidden'); e.status = 403; return next(e) }
  notify(id, 'movies-changed')
    res.sendStatus(204)
  } catch (e) { next(e) }
})

// Add a showtime to a movie (approved members)
router.post('/:id/movies/:gmId/showtimes', auth, async (req, res, next) => {
  try {
    const { id, gmId } = req.params
    const me = req.user.id
    const { starts_at, theater, auditorium } = req.body || {}
    if (!starts_at) { const e = new Error('starts_at required'); e.status = 400; return next(e) }
    if (!(await isApprovedMember(id, me)) && !(await isOwner(id, me))) { const e = new Error('Forbidden'); e.status = 403; return next(e) }
  const r = await pool.query(
      `INSERT INTO group_showtime (group_movie_id, starts_at, theater, auditorium, added_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, starts_at, theater, auditorium`,
      [gmId, starts_at, (theater || '').slice(0, 200), (auditorium || '').slice(0, 120), me]
    )
  notify(id, 'movies-changed')
  res.status(201).json(r.rows[0])
  } catch (e) { next(e) }
})

// Delete a showtime (moderators)
router.delete('/:id/movies/:gmId/showtimes/:sid', auth, async (req, res, next) => {
  try {
    const { id, gmId, sid } = req.params
    const me = req.user.id
    // Only the user who added that showtime can delete it
    const del = await pool.query('DELETE FROM group_showtime WHERE id=$1 AND group_movie_id=$2 AND added_by=$3', [sid, gmId, me])
    if (del.rowCount === 0) { const e = new Error('Forbidden'); e.status = 403; return next(e) }
    notify(id, 'movies-changed')
    res.sendStatus(204)
  } catch (e) { next(e) }
})

// SSE-stream-endpoint
router.get('/:id/stream', async (req, res, next) => {
  try {
    const { id } = req.params
    const token = req.query.token || ''
    if (!token) return res.status(401).end()
    let userId
    try { userId = jwt.verify(token, process.env.JWT_SECRET)?.id } catch { return res.status(401).end() }
  // allow PENDING members too so approval updates in real-time
    const allowed = (await isOwner(id, userId)) || (await pool.query(
      `SELECT 1 FROM group_membership WHERE group_id=$1 AND user_id=$2`, [id, userId]
    )).rowCount > 0
    if (!allowed) return res.status(403).end()

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()
    res.write('event: connected\n')
    res.write('data: {"ok":true}\n\n')
    addStream(id, res)
    req.on('close', () => removeStream(id, res))
  } catch (e) { next(e) }
})

// Global group list stream
router.get('/stream', async (req, res, next) => {
  try {
    const token = req.query.token || ''
    if (!token) return res.status(401).end()
    try { jwt.verify(token, process.env.JWT_SECRET) } catch { return res.status(401).end() }
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()
    res.write('event: connected\n')
    res.write('data: {"ok":true}\n\n')
    globalStreams.add(res)
    req.on('close', () => { globalStreams.delete(res) })
  } catch (e) { next(e) }
})

// Return current user's membership for this group (including PENDING)
router.get('/:id/membership/me', auth, async (req, res, next) => {
  try {
    const { id } = req.params
    const me = req.user.id
    const r = await pool.query(
      `SELECT status, role FROM group_membership WHERE group_id=$1 AND user_id=$2`, [id, me]
    )
    if (r.rowCount === 0) return res.status(404).json({})
    res.status(200).json(r.rows[0])
  } catch (e) { next(e) }
})

export default router
