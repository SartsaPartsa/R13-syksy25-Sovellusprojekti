import { useEffect, useState } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FavoritesAPI } from '../lib/api'
import { fetchMovie } from '../lib/api/movies'

export default function SharedFavorites() {
  // View a shared favorites list by slug
  const { slug } = useParams()
  const { t } = useTranslation('common')
  const location = useLocation()
  // state: list metadata and movie objects
  const [meta, setMeta] = useState(null)
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // load shared list meta and its movies
  useEffect(() => {
    let ignore = false
    async function load() {
      setLoading(true); setError(null)
      try {
        const m = await FavoritesAPI.sharedMeta(slug)
        const ids = await FavoritesAPI.sharedMovies(slug)
        const movieIds = (ids || []).map((f) => f.movie_id)
        const results = await Promise.all(movieIds.map(async (id) => {
          try { return await fetchMovie(id) } catch { return null }
        }))
        if (!ignore) { setMeta(m); setMovies(results.filter(Boolean)) }
      } catch (e) {
        if (!ignore) setError(e.message)
      } finally { if (!ignore) setLoading(false) }
    }
    load(); return () => { ignore = true }
  }, [slug])

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-semibold mb-6">{t('favoritesPage.title')}</h1>
      {loading && <div className="text-neutral-300">{t('loading')}</div>}
      {error && <div className="text-red-300">{t('errorFetchingData')}: {error}</div>}
      {/* shared list header */}
      {meta && (
        <div className="mb-4 text-sm text-neutral-300">{t('favoritesShare.viewing')}: <span className="text-white font-medium">{meta.display_name}</span></div>
      )}
      {!loading && movies.length === 0 && (
        <div className="text-neutral-300">{t('favoritesShare.emptyShared')}</div>
      )}
      {/* Movie grid */}
      <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {movies.map((m) => (
          <li key={m.id}
            className="relative group bg-neutral-800/60 rounded-2xl overflow-hidden ring-1 ring-white/10 hover:ring-[#F18800]/60 transition"
          >
            <Link to={`/movies/${m.id}`} state={{ from: location }} className="block">
              <div className="relative">
                {m.poster_path ? (
                  <img src={`https://image.tmdb.org/t/p/w342${m.poster_path}`} alt={m.title} className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                ) : (
                  <div className="w-full h-64 bg-neutral-700 flex items-center justify-center text-neutral-400">{t('movie.noImage')}</div>
                )}
                {/* rating badge */}
                <div className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white ring-1 ring-white/10">⭐ {m.vote_average ?? '–'}</div>
              </div>
              <div className="p-3">
                <div className="font-medium text-white line-clamp-1">{m.title}</div>
                <div className="text-sm text-neutral-400">{(m.release_date || '').slice(0, 4)}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
