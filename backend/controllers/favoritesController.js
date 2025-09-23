import {
    addFavorite as modelAddFavorite,
    listShared as modelListShared,
    getShareForUser,
    upsertShare as modelUpsertShare,
    getShareBySlug as modelGetShareBySlug,
    getFavoriteMoviesForUser,
    getSharedUserIdBySlug,
    listUserFavorites,
    removeFavorite as modelRemoveFavorite,
} from '../models/favoritesModel.js'

// SSE for shared favorites
const favStreams = new Set()
function addFavStream(res) { favStreams.add(res) }
function removeFavStream(res) { favStreams.delete(res) }
function notifyFav(event = 'favorites-shared-changed', payload = {}) {
    const msg = `event: ${event}\n` + `data: ${JSON.stringify(payload)}\n\n`
    for (const res of Array.from(favStreams)) {
        try { res.write(msg) } catch { try { res.end() } catch { } favStreams.delete(res) }
    }
}

// POST /api/favorites/
export async function addFavorite(req, res) {
    try {
        const { userId, movieId } = req.body;
        await modelAddFavorite(userId, movieId)
        res.json({ message: 'Favorite added!' });
    } catch (err) {
        console.error('Error inserting favorite:', err);
        res.status(500).json({ error: 'Database error' });
    }
}

// GET /api/favorites/shared
export async function listShared(req, res) {
    try {
        const rows = await modelListShared()
        return res.json(rows)
    } catch (e) {
        console.error('Error fetching shared favorites', e)
        return res.json([])
    }
}

// GET /api/favorites/share/me
export async function getMyShare(req, res) {
    const uid = req.user?.id
    try {
        const row = await getShareForUser(uid)
        if (!row) {
            const defaultName = (req.user?.email || '').split('@')[0] || 'Oma lista'
            return res.json({ user_id: uid, display_name: defaultName, slug: null, is_shared: false })
        }
        return res.json(row)
    } catch (e) {
        console.error('Error share/me', e)
        return res.status(500).json({ error: 'Database error' })
    }
}

// POST /api/favorites/share
export async function upsertShare(req, res) {
    const uid = req.user?.id
    const { is_shared, display_name } = req.body || {}
    const name = String(display_name || '').trim().slice(0, 120) || (req.user?.email || '').split('@')[0] || 'Oma lista'
    try {
        const row = await modelUpsertShare(uid, name, Boolean(is_shared))
        notifyFav('favorites-shared-changed', { user_id: uid, is_shared: Boolean(is_shared) })
        return res.json(row)
    } catch (e) {
        console.error('Error updating favorite share', e)
        return res.status(500).json({ error: 'Database error' })
    }
}

// GET /api/favorites/share/:slug
export async function getShareBySlug(req, res) {
    try {
        const row = await modelGetShareBySlug(req.params.slug)
        if (!row) return res.status(404).json({ error: 'Not found' })
        return res.json(row)
    } catch (e) {
        console.error('Error get share by slug', e)
        return res.status(500).json({ error: 'Database error' })
    }
}

// GET /api/favorites/share/:slug/movies
export async function getSharedMovies(req, res) {
    try {
        const uid = await getSharedUserIdBySlug(req.params.slug)
        if (!uid) return res.json([])
        const favs = await getFavoriteMoviesForUser(uid)
        return res.json(favs)
    } catch (e) {
        console.error('Error get shared movies', e)
        return res.json([])
    }
}

// GET /api/favorites/stream
export async function streamShared(req, res) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()
    res.write('event: connected\n')
    res.write('data: {"ok":true}\n\n')
    addFavStream(res)
    req.on('close', () => removeFavStream(res))
}

// GET /api/favorites/:userId
export async function getUserFavorites(req, res) {
    try {
        const result = await listUserFavorites(req.params.userId)
        res.json(result);
    } catch (err) {
        console.error('Error fetching favorites:', err);
        res.json([]);
    }
}

// DELETE /api/favorites/:userId/:movieId
export async function removeFavorite(req, res) {
    try {
        await modelRemoveFavorite(req.params.userId, req.params.movieId)
        res.json({ message: 'Favorite removed!' });
    } catch (err) {
        console.error('Error deleting favorite:', err);
        res.status(500).json({ error: 'Database error' });
    }
}
