import { pool } from '../helper/db.js'

// Membership helpers
// Check if a user is the group owner
export async function isOwner(groupId, userId) {
    const r = await pool.query('SELECT 1 FROM "group" WHERE id=$1 AND owner_id=$2', [groupId, userId])
    return r.rowCount > 0
}

export async function isModerator(groupId, userId) {
    // approved and role = MODERATOR
    const r = await pool.query(
        `SELECT 1 FROM group_membership 
     WHERE group_id=$1 AND user_id=$2 AND status='APPROVED' AND role='MODERATOR'`,
        [groupId, userId]
    )
    return r.rowCount > 0
}

export async function isApprovedMember(groupId, userId) {
    // has an approved membership
    const r = await pool.query(
        `SELECT 1 FROM group_membership WHERE group_id=$1 AND user_id=$2 AND status='APPROVED'`,
        [groupId, userId]
    )
    return r.rowCount > 0
}

export async function isMember(groupId, userId) {
    // any membership record exists
    const r = await pool.query(
        `SELECT 1 FROM group_membership WHERE group_id=$1 AND user_id=$2`, [groupId, userId]
    )
    return r.rowCount > 0
}

// Groups
export async function listGroups() {
    const { rows } = await pool.query(`
    SELECT g.id, g.name, g.owner_id, g.created_at,
           COALESCE(COUNT(m.*) FILTER (WHERE m.status = 'APPROVED'), 0) AS members_count
    FROM "group" g
    LEFT JOIN group_membership m
      ON m.group_id = g.id AND m.status = 'APPROVED'
    GROUP BY g.id
    ORDER BY g.created_at DESC
  `)
    return rows
}

export async function insertGroup(name, ownerId) {
    const inserted = await pool.query(
        `INSERT INTO "group"(name, owner_id)
     VALUES ($1, $2)
     RETURNING id, name, owner_id, created_at`,
        [name, ownerId]
    )
    return inserted.rows[0]
}

export async function ensureOwnerMembership(groupId, ownerId) {
    await pool.query(
        `INSERT INTO group_membership(group_id, user_id, status, role)
     VALUES ($1, $2, 'APPROVED', 'MODERATOR')
     ON CONFLICT (group_id, user_id) DO NOTHING`,
        [groupId, ownerId]
    )
}

export async function getGroupByIdWithMembersCount(id) {
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
    return rows[0] || null
}

export async function getGroupOwner(id) {
    const g = await pool.query(`SELECT id, owner_id FROM "group" WHERE id = $1`, [id])
    return g.rows[0] || null
}

export async function upsertMembershipPending(groupId, userId) {
    const upsert = await pool.query(
        `INSERT INTO group_membership(group_id, user_id, status, role)
     VALUES ($1, $2, 'PENDING', 'MEMBER')
     ON CONFLICT (group_id, user_id)
     DO UPDATE SET status = 'PENDING'
     RETURNING id, group_id, user_id, status, role, created_at`,
        [groupId, userId]
    )
    return upsert.rows[0]
}

export async function listMembersWithUser(groupId) {
    // return members with user email and role/status
    const r = await pool.query(
        `SELECT gm.user_id, u.email, gm.status, gm.role, gm.created_at
     FROM group_membership gm
     JOIN "user" u ON u.id = gm.user_id
     WHERE gm.group_id = $1
     ORDER BY gm.created_at ASC`,
        [groupId]
    )
    return r.rows || []
}

export async function approveMembership(groupId, userId) {
    const r = await pool.query(
        `UPDATE group_membership 
     SET status = 'APPROVED' 
     WHERE group_id=$1 AND user_id=$2
     RETURNING user_id, status, role, created_at`,
        [groupId, userId]
    )
    return r.rows[0] || null
}

export async function deleteMembership(groupId, userId) {
    const r = await pool.query('DELETE FROM group_membership WHERE group_id=$1 AND user_id=$2', [groupId, userId])
    return r.rowCount
}

export async function deleteGroup(id) {
    const r = await pool.query('DELETE FROM "group" WHERE id=$1', [id])
    return r.rowCount
}

export async function listGroupMovies(groupId) {
    const r = await pool.query(
        `SELECT gm.id, gm.movie_id, gm.title, gm.added_by, gm.created_at,
            COALESCE(json_agg(json_build_object('id', gs.id, 'starts_at', gs.starts_at, 'theater', gs.theater, 'auditorium', gs.auditorium, 'added_by', gs.added_by)
              ORDER BY gs.starts_at) FILTER (WHERE gs.id IS NOT NULL), '[]') AS showtimes
     FROM group_movie gm
     LEFT JOIN group_showtime gs ON gs.group_movie_id = gm.id
     WHERE gm.group_id = $1
     GROUP BY gm.id
     ORDER BY gm.created_at DESC`,
        [groupId]
    )
    return r.rows
}

export async function insertGroupMovie(groupId, movieId, title, addedBy) {
    const r = await pool.query(
        `INSERT INTO group_movie (group_id, movie_id, title, added_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (group_id, movie_id) DO UPDATE SET title = EXCLUDED.title
     RETURNING id, movie_id, title, added_by, created_at`,
        [groupId, movieId, title, addedBy]
    )
    return r.rows[0]
}

export async function deleteGroupMovie(groupId, gmId, addedBy) {
    // delete a group movie if added by the given user
    const del = await pool.query('DELETE FROM group_movie WHERE id=$1 AND group_id=$2 AND added_by=$3', [gmId, groupId, addedBy])
    return del.rowCount
}

export async function insertShowtime(groupMovieId, startsAt, theater, auditorium, addedBy) {
    const r = await pool.query(
        `INSERT INTO group_showtime (group_movie_id, starts_at, theater, auditorium, added_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, starts_at, theater, auditorium`,
        [groupMovieId, startsAt, theater, auditorium, addedBy]
    )
    return r.rows[0]
}

export async function deleteShowtime(groupMovieId, showtimeId, addedBy) {
    // delete a showtime if added by the given user
    const del = await pool.query('DELETE FROM group_showtime WHERE id=$1 AND group_movie_id=$2 AND added_by=$3', [showtimeId, groupMovieId, addedBy])
    return del.rowCount
}

export async function getMembershipForUser(groupId, userId) {
    // get user's membership status and role in a group
    const r = await pool.query(
        `SELECT status, role FROM group_membership WHERE group_id=$1 AND user_id=$2`, [groupId, userId]
    )
    return r.rows[0] || null
}
