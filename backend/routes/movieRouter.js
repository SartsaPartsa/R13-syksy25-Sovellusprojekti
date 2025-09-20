// backend/routes/movieRouter.js
import express from 'express'
import { getMovieDetails } from '../helper/tmdbClient.js'
import reviewRouter from './reviewRouter.js'

const router = express.Router()

function toTmdbLang(lng = 'fi-FI') {
  return lng.startsWith('fi') ? 'fi-FI' : 'en-US'
}

router.get('/:id', async (req, res, next) => {
  try {
    const idNum = Number(req.params.id)
    if (!Number.isInteger(idNum)) {
      const e = new Error('Invalid movie id'); e.status = 400; throw e
    }
    const language = toTmdbLang((req.query.language || 'fi-FI').trim())

    const data = await getMovieDetails(idNum, language)
    if (!data?.id) { const e = new Error('Movie not found'); e.status = 404; throw e }

    const vids = data?.videos?.results ?? []
    const trailerObj =
      vids.find(v => v.site === 'YouTube' && v.type === 'Trailer' && v.official) ??
      vids.find(v => v.site === 'YouTube' && v.type === 'Trailer') ??
      vids.find(v => v.site === 'YouTube')
    const trailer = trailerObj ? { key: trailerObj.key, name: trailerObj.name } : null

    const directors = (data?.credits?.crew ?? [])
      .filter(p => p.job === 'Director')
      .map(p => ({ id: p.id, name: p.name }))

    const cast = (data?.credits?.cast ?? [])
      .slice(0, 12)
      .map(p => ({ id: p.id, name: p.name, character: p.character, profile_path: p.profile_path }))

    const genres = (data?.genres ?? []).map(g => ({ id: g.id, name: g.name }))

    const rel = data?.release_dates?.results ?? []
    const certFor = (iso) => {
      const c = rel.find(r => r.iso_3166_1 === iso)
      if (!c) return ''
      const d = (c.release_dates ?? []).find(d => d.certification)
      return d?.certification || ''
    }
    const certification = certFor('FI') || certFor('US') || ''

    const recommendations = (data?.recommendations?.results ?? [])
      .slice(0, 12)
      .map(r => ({
        id: r.id,
        title: r.title,
        poster_path: r.poster_path,
        release_date: r.release_date,
        vote_average: r.vote_average,
      }))

    res.set('Cache-Control', 'public, max-age=300') 
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


router.use('/:movieId/reviews', reviewRouter)

export default router
