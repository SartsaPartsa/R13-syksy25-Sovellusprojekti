import express from "express";
import { pool } from "../helper/db.js";
import { auth } from "../helper/auth.js";

const router = express.Router();

// --- SSE (Server-Sent Events) ja yksinkertainen pub/sub jaetuille suosikkilistoille ---
const favStreams = new Set();
function addFavStream(res) { favStreams.add(res) }
function removeFavStream(res) { favStreams.delete(res) }
function notifyFav(event = 'favorites-shared-changed', payload = {}) {
  const msg = `event: ${event}\n` + `data: ${JSON.stringify(payload)}\n\n`
  for (const res of Array.from(favStreams)) {
    try { res.write(msg) } catch { try { res.end() } catch {} favStreams.delete(res) }
  }
}

// Lisää suosikki
router.post("/", async (req, res) => {
  try {
    const { userId, movieId } = req.body;
    await pool.query(
      "INSERT INTO favorites (user_id, movie_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [userId, movieId]
    );
    res.json({ message: "Favorite added!" });
  } catch (err) {
    console.error("Error inserting favorite:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Huom! Jaon reitit pitää olla ENNEN geneeristä "/:userId"-reittiä, jotta "/shared" ym. eivät osu väärin.

// --- Favorite sharing ---
// Listaa kaikki jaetut suosikkilistat (julkinen)
router.get('/shared', async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT display_name, slug FROM favorite_share WHERE is_shared = TRUE ORDER BY display_name ASC'
    )
    return res.json(r.rows || [])
  } catch (e) {
    console.error('Error fetching shared favorites', e)
    return res.json([])
  }
})

// Hae kirjautuneen käyttäjän jaon tila
router.get('/share/me', auth, async (req, res) => {
  const uid = req.user?.id
  try {
    const r = await pool.query('SELECT user_id, display_name, slug, is_shared FROM favorite_share WHERE user_id = $1', [uid])
    if (r.rows.length === 0) {
      // johdetaan oletusnimi sähköpostista jos saatavilla
      const defaultName = (req.user?.email || '').split('@')[0] || 'Oma lista'
      return res.json({ user_id: uid, display_name: defaultName, slug: null, is_shared: false })
    }
    return res.json(r.rows[0])
  } catch (e) {
    console.error('Error share/me', e)
    return res.status(500).json({ error: 'Database error' })
  }
})

// Päivitä jaon tila (päälle/pois, nimen muutos). Luo rivin tarvittaessa.
router.post('/share', auth, async (req, res) => {
  const uid = req.user?.id
  const { is_shared, display_name } = req.body || {}
  const name = String(display_name || '').trim().slice(0, 120) || (req.user?.email || '').split('@')[0] || 'Oma lista'
  try {
    // upsert
    const q = `INSERT INTO favorite_share (user_id, display_name, is_shared)
               VALUES ($1, $2, $3)
               ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name, is_shared = EXCLUDED.is_shared, updated_at = now()
               RETURNING user_id, display_name, slug, is_shared`;
    const r = await pool.query(q, [uid, name, Boolean(is_shared)])
    // Ilmoita kuuntelijoille, että jaettujen listojen luettelo on muuttunut
    notifyFav('favorites-shared-changed', { user_id: uid, is_shared: Boolean(is_shared) })
    return res.json(r.rows[0])
  } catch (e) {
    console.error('Error updating favorite share', e)
    return res.status(500).json({ error: 'Database error' })
  }
})

// Hae jaon tiedot slugilla (julkinen)
router.get('/share/:slug', async (req, res) => {
  try {
    const r = await pool.query('SELECT user_id, display_name, slug FROM favorite_share WHERE slug = $1 AND is_shared = TRUE', [req.params.slug])
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' })
    return res.json(r.rows[0])
  } catch (e) {
    console.error('Error get share by slug', e)
    return res.status(500).json({ error: 'Database error' })
  }
})

// Hae jaetun listan elokuvat slugilla (julkinen)
router.get('/share/:slug/movies', async (req, res) => {
  try {
    const r = await pool.query('SELECT user_id FROM favorite_share WHERE slug = $1 AND is_shared = TRUE', [req.params.slug])
    if (r.rows.length === 0) return res.json([])
    const uid = r.rows[0].user_id
    const favs = await pool.query('SELECT movie_id FROM favorites WHERE user_id = $1', [uid])
    return res.json(favs.rows || [])
  } catch (e) {
    console.error('Error get shared movies', e)
    return res.json([])
  }
})

// SSE-stream jaettujen suosikkilistojen muutoksille (julkinen kuuntelu ok)
router.get('/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()
  res.write('event: connected\n')
  res.write('data: {"ok":true}\n\n')
  addFavStream(res)
  req.on('close', () => removeFavStream(res))
})

// Hae käyttäjän suosikit (spesifien reittien jälkeen, jotta ei törmää /shared ym.)
router.get('/:userId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT movie_id FROM favorites WHERE user_id = $1',
      [req.params.userId]
    );
    res.json(result.rows || []);
  } catch (err) {
    console.error('Error fetching favorites:', err);
    res.json([]);
  }
});

// Poista suosikki
router.delete('/:userId/:movieId', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM favorites WHERE user_id = $1 AND movie_id = $2',
      [req.params.userId, req.params.movieId]
    );
    res.json({ message: 'Favorite removed!' });
  } catch (err) {
    console.error('Error deleting favorite:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;

