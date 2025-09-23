import { searchMovies, fetchGenres } from '../helper/tmdbClient.js'

// GET /api/search/genres
export async function getGenres(req, res, next) {
    try {
        const language = (req.query.language || 'fi-FI').trim()
        const data = await fetchGenres(language)
        res.json(data)
    } catch (err) { next(err) }
}

// GET /api/search/movies
export async function searchMoviesController(req, res, next) {
    try {
        const q = (req.query.q || '').trim()
        const page = Number(req.query.page || 1)
        const language = (req.query.language || 'fi-FI').trim()

        const minRating = Number(req.query.minRating || 0)
        const genreParam = (req.query.genre || '').trim()
        const yearFrom = Number(req.query.yearFrom || 0)
        const yearTo = Number(req.query.yearTo || 0)
        const sort = (req.query.sort || '').trim()

        if (!q) return res.status(400).json({ error: 'Missing query parameter: q' })

        const selectedGenres = new Set(
            genreParam ? genreParam.split(',').map(s => Number(s)).filter(n => !Number.isNaN(n)) : []
        )

        const data = await searchMovies({ query: q, page, language })

        let results = (data.results || []).map(m => ({
            id: m.id,
            title: m.title,
            original_title: m.original_title,
            release_date: m.release_date,
            vote_average: m.vote_average,
            overview: m.overview,
            poster_path: m.poster_path,
            genre_ids: m.genre_ids,
            popularity: m.popularity,
        }))

        if (minRating > 0) {
            results = results.filter(m => (m.vote_average || 0) >= minRating)
        }
        if (selectedGenres.size > 0) {
            results = results.filter(m => m.genre_ids?.some(id => selectedGenres.has(id)))
        }
        if (yearFrom || yearTo) {
            results = results.filter(m => {
                const y = Number((m.release_date || '').slice(0, 4))
                if (Number.isNaN(y)) return false
                if (yearFrom && y < yearFrom) return false
                if (yearTo && y > yearTo) return false
                return true
            })
        }

        switch (sort) {
            case 'release_desc':
                results.sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''))
                break
            case 'release_asc':
                results.sort((a, b) => (a.release_date || '').localeCompare(b.release_date || ''))
                break
            case 'rating_desc':
                results.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
                break
            case 'rating_asc':
                results.sort((a, b) => (a.vote_average || 0) - (b.vote_average || 0))
                break
            case 'title_asc':
                results.sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' }))
                break
            case 'popularity_desc':
                results.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
                break
            default:
                break
        }

        res.json({
            page: data.page,
            total_pages: data.total_pages,
            total_results: data.total_results,
            results,
        })
    } catch (err) { next(err) }
}
