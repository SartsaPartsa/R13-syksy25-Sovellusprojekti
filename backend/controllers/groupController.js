import {
    isOwner,
    isModerator,
    isApprovedMember,
    isMember,
    listGroups as modelListGroups,
    insertGroup,
    ensureOwnerMembership,
    getGroupByIdWithMembersCount,
    getGroupOwner,
    upsertMembershipPending,
    listMembersWithUser,
    approveMembership,
    deleteMembership,
    deleteGroup as modelDeleteGroup,
    listGroupMovies as modelListGroupMovies,
    insertGroupMovie,
    deleteGroupMovie as modelDeleteGroupMovie,
    insertShowtime,
    deleteShowtime as modelDeleteShowtime,
    getMembershipForUser,
} from '../models/groupModel.js'
import jwt from 'jsonwebtoken'

// In-memory SSE channels
const streams = new Map() // groupId -> Set(res)
const globalStreams = new Set() // global group events
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
        try { res.write(msg) } catch { }
    }
}
function notifyAll(type, payload = {}) {
    const msg = `event: ${type}\n` + `data: ${JSON.stringify(payload)}\n\n`
    for (const res of globalStreams) {
        try { res.write(msg) } catch { }
    }
}

// Helpers
async function canModerate(groupId, userId) {
    return (await isOwner(groupId, userId)) || (await isModerator(groupId, userId))
}

// Controllers
export async function listGroups(req, res, next) {
    try {
        const rows = await modelListGroups()
        res.status(200).json(rows)
    } catch (e) { next(e) }
}

export async function createGroup(req, res, next) {
    try {
        const { name } = req.body
        if (!name || !name.trim() || name.length > 120) {
            const err = new Error('Name is required (1–120 chars)')
            err.status = 400
            return next(err)
        }

        const ownerId = req.user.id
        const group = await insertGroup(name.trim(), ownerId)
        await ensureOwnerMembership(group.id, ownerId)

        notifyAll('group-created', group)
        res.status(201).json(group)
    } catch (e) { next(e) }
}

export async function streamAllGroups(req, res, next) {
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
}

export async function getGroup(req, res, next) {
    try {
        const { id } = req.params
        const row = await getGroupByIdWithMembersCount(id)
        if (!row) {
            const err = new Error('Group not found')
            err.status = 404
            return next(err)
        }
        res.status(200).json(row)
    } catch (e) { next(e) }
}

export async function joinGroup(req, res, next) {
    try {
        const { id } = req.params
        const userId = req.user.id

        const g = await getGroupOwner(id)
        if (!g) {
            const err = new Error('Group not found')
            err.status = 404
            return next(err)
        }
        if (g.owner_id === userId) {
            const err = new Error('Owner is already a member')
            err.status = 400
            return next(err)
        }
        const upsert = await upsertMembershipPending(id, userId)
        notify(id, 'members-changed')
        res.status(201).json(upsert)
    } catch (e) { next(e) }
}

export async function listMembers(req, res, next) {
    try {
        const { id } = req.params
        const me = req.user.id

        const allowed = (await isOwner(id, me)) || (await isApprovedMember(id, me))
        if (!allowed) { const e = new Error('Forbidden'); e.status = 403; return next(e) }

        const rows = await listMembersWithUser(id)
        res.status(200).json(rows)
    } catch (e) { next(e) }
}

export async function updateMemberStatus(req, res, next) {
    try {
        const { id, userId } = req.params
        const me = req.user.id
        const action = (req.body?.action || '').toLowerCase()

        if (!(await canModerate(id, me))) { const e = new Error('Forbidden'); e.status = 403; return next(e) }
        if (!['approve', 'reject'].includes(action)) { const e = new Error('Invalid action'); e.status = 400; return next(e) }

        if (action === 'reject') {
            const rowCount = await deleteMembership(id, userId)
            if (rowCount === 0) { const e = new Error('Membership not found'); e.status = 404; return next(e) }
            notify(id, 'members-changed')
            return res.sendStatus(204)
        }

        const row = await approveMembership(id, userId)
        if (!row) { const e = new Error('Membership not found'); e.status = 404; return next(e) }
        notify(id, 'members-changed')
        res.status(200).json(row)
    } catch (e) { next(e) }
}

export async function leaveGroup(req, res, next) {
    try {
        const { id } = req.params
        const me = req.user.id
        if (await isOwner(id, me)) { const e = new Error('Owner cannot leave the group'); e.status = 400; return next(e) }
        await deleteMembership(id, me)
        notify(id, 'members-changed')
        res.sendStatus(204)
    } catch (e) { next(e) }
}

export async function deleteGroup(req, res, next) {
    try {
        const { id } = req.params
        const me = req.user.id
        if (!(await isOwner(id, me))) { const e = new Error('Forbidden'); e.status = 403; return next(e) }
        await modelDeleteGroup(id)
        notify(id, 'group-deleted')
        notifyAll('group-deleted', { id })
        res.sendStatus(204)
    } catch (e) { next(e) }
}

export async function removeMember(req, res, next) {
    try {
        const { id, userId } = req.params
        const me = req.user.id
        if (!(await canModerate(id, me))) { const e = new Error('Forbidden'); e.status = 403; return next(e) }
        if (await isOwner(id, userId)) { const e = new Error('Cannot remove owner'); e.status = 400; return next(e) }
        await deleteMembership(id, userId)
        notify(id, 'members-changed')
        res.sendStatus(204)
    } catch (e) { next(e) }
}

export async function listGroupMovies(req, res, next) {
    try {
        const { id } = req.params
        const me = req.user.id
        if (!(await isApprovedMember(id, me)) && !(await isOwner(id, me))) { const e = new Error('Forbidden'); e.status = 403; return next(e) }
        const rows = await modelListGroupMovies(id)
        res.status(200).json(rows)
    } catch (e) { next(e) }
}

export async function addGroupMovie(req, res, next) {
    try {
        const { id } = req.params
        const me = req.user.id
        const { movie_id, title } = req.body || {}
        if (!movie_id) { const e = new Error('movie_id required'); e.status = 400; return next(e) }
        if (!(await isApprovedMember(id, me)) && !(await isOwner(id, me))) { const e = new Error('Forbidden'); e.status = 403; return next(e) }

        const row = await insertGroupMovie(id, movie_id, (title || '').slice(0, 200), me)
        notify(id, 'movies-changed')
        res.status(201).json({ ...row, showtimes: [] })
    } catch (e) { next(e) }
}

export async function deleteGroupMovie(req, res, next) {
    try {
        const { id, gmId } = req.params
        const me = req.user.id
        const rowCount = await modelDeleteGroupMovie(id, gmId, me)
        if (rowCount === 0) { const e = new Error('Forbidden'); e.status = 403; return next(e) }
        notify(id, 'movies-changed')
        res.sendStatus(204)
    } catch (e) { next(e) }
}

export async function addShowtime(req, res, next) {
    try {
        const { id, gmId } = req.params
        const me = req.user.id
        const { starts_at, theater, auditorium } = req.body || {}
        if (!starts_at) { const e = new Error('starts_at required'); e.status = 400; return next(e) }
        if (!(await isApprovedMember(id, me)) && !(await isOwner(id, me))) { const e = new Error('Forbidden'); e.status = 403; return next(e) }
        const row = await insertShowtime(
            gmId,
            starts_at,
            (theater || '').slice(0, 200),
            (auditorium || '').slice(0, 120),
            me
        )
        notify(id, 'movies-changed')
        res.status(201).json(row)
    } catch (e) { next(e) }
}

export async function deleteShowtime(req, res, next) {
    try {
        const { id, gmId, sid } = req.params
        const me = req.user.id
        const rowCount = await modelDeleteShowtime(gmId, sid, me)
        if (rowCount === 0) { const e = new Error('Forbidden'); e.status = 403; return next(e) }
        notify(id, 'movies-changed')
        res.sendStatus(204)
    } catch (e) { next(e) }
}

export async function streamGroup(req, res, next) {
    try {
        const { id } = req.params
        const token = req.query.token || ''
        if (!token) return res.status(401).end()
        let userId
        try { userId = jwt.verify(token, process.env.JWT_SECRET)?.id } catch { return res.status(401).end() }
        const allowed = (await isOwner(id, userId)) || (await isMember(id, userId))
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
}

export async function myMembership(req, res, next) {
    try {
        const { id } = req.params
        const me = req.user.id
        const row = await getMembershipForUser(id, me)
        if (!row) return res.status(404).json({})
        res.status(200).json(row)
    } catch (e) { next(e) }
}
