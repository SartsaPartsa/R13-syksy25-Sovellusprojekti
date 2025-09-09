import express from 'express'
import { getMovieDetails } from '../helper/tmdbClient.js'

const router = express.Router()

router.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id
    const language = (req.query.language || 'fi-FI').trim()

    const data = await getMovieDetails(id, language)

    // Helpers
    const vids = data.videos?.results || []
    const trailerObj =
      vids.find(v => v.site === 'YouTube' && v.type === 'Trailer' && v.official) ||
      vids.find(v => v.site === 'YouTube' && v.type === 'Trailer') ||
      vids.find(v => v.site === 'YouTube')
    const trailer = trailerObj ? { key: trailerObj.key, name: trailerObj.name } : null

    const directors = (data.credits?.crew || [])
      .filter(p => p.job === 'Director')
      .map(p => ({ id: p.id, name: p.name }))

    const cast = (data.credits?.cast || [])
      .slice(0, 12)
      .map(p => ({ id: p.id, name: p.name, character: p.character, profile_path: p.profile_path }))

    const genres = (data.genres || []).map(g => ({ id: g.id, name: g.name }))

    // Age ratings
    const rel = data.release_dates?.results || []
    function certFor(iso) {
      const c = rel.find(r => r.iso_3161_1 === iso || r.iso_3166_1 === iso)
      if (!c) return ''
      const hit = (c.release_dates || []).find(d => d.certification)
      return hit?.certification || ''
    }
    const certification = certFor('FI') || certFor('US') || ''

    const recommendations = (data.recommendations?.results || [])
      .slice(0, 12)
      .map(r => ({
        id: r.id,
        title: r.title,
        poster_path: r.poster_path,
        release_date: r.release_date,
        vote_average: r.vote_average,
      }))

    // Response formatting
    res.json({
      id: data.id,
      title: data.title,
      original_title: data.original_title,
      overview: data.overview,
      release_date: data.release_date,
      runtime: data.runtime,
      vote_average: data.vote_average,
      vote_count: data.vote_count,
      poster_path: data.poster_path,
      backdrop_path: data.backdrop_path,
      popularity: data.popularity,
      homepage: data.homepage,
      imdb_id: data.imdb_id,

      genres,
      directors,
      cast,
      trailer,
      certification,

      recommendations,
    })
  } catch (err) {
    next(err)
  }
})

export default router
