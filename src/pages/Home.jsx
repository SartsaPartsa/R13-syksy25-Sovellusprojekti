import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { fetchPopularToday, fetchMovie } from '../lib/api/movies'
import { fetchMetroTodayTopShows, buildFinnkinoEventUrl } from '../lib/api/shows'
import { fetchLatestReviews } from '../lib/api/reviews'

export default function Home() {
  const { t, i18n } = useTranslation('common')
  const location = useLocation()
  const tmdbLang = i18n.language?.startsWith('fi') ? 'fi-FI' : 'en-US'

  // State for the daily popular movie
  const [daily, setDaily] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Latest reviews state (show 3 newest)
  const [revLoading, setRevLoading] = useState(true)
  const [revError, setRevError] = useState('')
  const [reviews, setReviews] = useState([])
  // Shows state: 3 freshest in Helsinki metro area (today)
  const [showsLoading, setShowsLoading] = useState(true)
  const [showsError, setShowsError] = useState('')
  const [shows, setShows] = useState([])

  useEffect(() => {
    let ignore = false
    setLoading(true); setError('')
    fetchPopularToday(tmdbLang)
      .then((d) => { if (!ignore) setDaily(d) })
      .catch((e) => { if (!ignore) setError(e?.message || 'Failed to load') })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [tmdbLang])

  // Load 3 latest reviews for the Reviews block
  useEffect(() => {
    let ignore = false
    setRevLoading(true); setRevError('')
    fetchLatestReviews({ page: 1, limit: 3 })
      .then(async d => {
        if (ignore) return
        const items = Array.isArray(d.items) ? d.items : []
        // Enrich each with minimal movie info for compact card
        const enriched = await Promise.all(items.map(async (r) => {
          try {
            const m = await fetchMovie(r.movie_id, tmdbLang)
            const year = m?.release_date ? new Date(m.release_date).getFullYear() : ''
            return { ...r, movie_title: m?.title || m?.name || '', poster_path: m?.poster_path || '', year }
          } catch {
            return { ...r, movie_title: '', poster_path: '', year: '' }
          }
        }))
        if (!ignore) setReviews(enriched)
      })
      .catch(e => { if (!ignore) setRevError(e?.message || 'Failed to load') })
      .finally(() => { if (!ignore) setRevLoading(false) })
    return () => { ignore = true }
  }, [tmdbLang])

  // Load 3 freshest shows for Helsinki metro area (today)
  useEffect(() => {
    let ignore = false
    setShowsLoading(true); setShowsError('')
    fetchMetroTodayTopShows(3)
      .then(d => { if (!ignore) setShows(Array.isArray(d) ? d : []) })
      .catch(e => { if (!ignore) setShowsError(e?.message || 'Failed to load') })
      .finally(() => { if (!ignore) setShowsLoading(false) })
    return () => { ignore = true }
  }, [])
  return (
    <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-gray-800 py-10 md:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
          {t('title')}
        </h1>
        <p className="mt-2 text-gray-300">{t('subtitle')}</p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Daily movie card */}
          <div className="rounded-2xl border border-white/10 bg-gray-900/70 backdrop-blur p-0 shadow-sm overflow-hidden">
            <div className="p-6">
              <h3 className="font-semibold text-white">{t('introTitle')}</h3>
            </div>
            <div className="px-6 pb-6">
              {loading ? (
                <div className="animate-pulse h-40 rounded-xl bg-white/5" />
              ) : error ? (
                <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</div>
              ) : daily ? (
                <Link to={`/movies/${daily.id}`} state={{ from: location }} className="group block rounded-xl ring-1 ring-white/10 bg-gradient-to-br from-white/5 to-white/0 overflow-hidden">
                  <div className="grid grid-cols-[128px,1fr] gap-4 p-3">
                    {/* Poster with rating badge */}
                    <div className="relative">
                      {daily.poster_path ? (
                        <img src={`https://image.tmdb.org/t/p/w342${daily.poster_path}`} alt={daily.title} className="w-32 h-48 object-cover rounded-lg ring-1 ring-white/10 group-hover:scale-[1.02] transition-transform" loading="lazy" />
                      ) : (
                        <div className="w-32 h-48 bg-white/5 rounded-lg" />
                      )}
                      {daily.vote_average ? (
                        <div className="absolute -bottom-1 -right-1">
                          <div className="inline-flex items-center gap-1 text-sm md:text-base text-yellow-200 bg-neutral-900/90 border border-yellow-500/40 rounded-md px-2 py-1 shadow-lg">
                            <span className="text-yellow-400">★</span>
                            <span className="font-semibold">{daily.vote_average.toFixed(1)}</span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-white font-semibold truncate">{daily.title}</h4>
                      {/* Clamp overview to 6 lines with ellipsis to keep the card height stable */}
                      <p className="mt-1 text-sm text-gray-300 overflow-hidden text-ellipsis" style={{ display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical' }}>{daily.overview || ''}</p>
                      <div className="mt-3">
                        <span className="inline-flex items-center gap-2 rounded-md px-4 py-1.5 border border-white/10 bg-white/10 group-hover:bg-white/15 text-white text-sm">
                          {t('homeDailyOpen')}
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="text-sm text-gray-400">{t('noResults', 'Ei tuloksia')}</div>
              )}
            </div>
          </div>
          {/* Shows block – mirrors Reviews styling */}
          <div className="rounded-2xl border border-white/10 bg-gray-900/70 backdrop-blur p-6 shadow-sm overflow-hidden">
            <h3 className="font-semibold text-white">{t('showsTitle')}</h3>
            <div className="mt-4 space-y-3">
              {showsLoading ? (
                <div className="animate-pulse h-32 rounded-xl bg-white/5" />
              ) : showsError ? (
                <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-3">{showsError}</div>
              ) : shows.length === 0 ? (
                <div className="text-sm text-gray-400">{t('noResults', 'Ei tuloksia')}</div>
              ) : (
                <ul className="space-y-3">
                  {shows.map((s, idx) => (
                    <li key={`${s.eventId}-${idx}`} className="rounded-xl ring-1 ring-white/10 bg-gradient-to-br from-white/5 to-white/0 p-3">
                      <div className="flex items-stretch gap-3" style={{ minHeight: '96px' }}>
                        {/* Poster */}
                        <a href={buildFinnkinoEventUrl(s.eventId, s.title)} target="_blank" rel="noopener noreferrer" className="shrink-0">
                          {s.image ? (
                            <img src={s.image} alt={s.title || ''} className="w-16 h-24 object-cover rounded-md ring-1 ring-white/10" loading="lazy" />
                          ) : (
                            <div className="w-16 h-24 rounded-md bg-white/10 ring-1 ring-white/10" />
                          )}
                        </a>
                        {/* Content */}
                        <div className="min-w-0 flex flex-col" style={{ minHeight: '96px' }}>
                          {/* Title single-line */}
                          <a href={buildFinnkinoEventUrl(s.eventId, s.title)} target="_blank" rel="noopener noreferrer" className="block text-white font-medium truncate">
                            {s.title || t('movie.unknown', 'Tuntematon elokuva')}
                          </a>
                          {/* Meta line single-line: theatre • time • auditorium */}
                          <div className="mt-0.5 text-xs text-white/70 truncate">
                            {s.theatre} · {new Date(s.start).toLocaleString('fi-FI')} · {s.theatreAuditorium}
                          </div>
                          {/* CTA aligned bottom */}
                          <div className="mt-auto pt-1">
                            <a href={buildFinnkinoEventUrl(s.eventId, s.title)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 border border-white/10 bg-white/10 hover:bg-white/15 text-white text-xs">
                              {t('homeShowsOpen')}
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                            </a>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {/* Latest reviews block */}
          <div className="rounded-2xl border border-white/10 bg-gray-900/70 backdrop-blur p-6 shadow-sm overflow-hidden">
            <h3 className="font-semibold text-white">{t('reviewsTitle')}</h3>
            <div className="mt-4 space-y-3">
              {revLoading ? (
                <div className="animate-pulse h-32 rounded-xl bg-white/5" />
              ) : revError ? (
                <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-3">{revError}</div>
              ) : reviews.length === 0 ? (
                <div className="text-sm text-gray-400">{t('reviewPage.empty', 'Ei arvosteluja vielä.')}</div>
              ) : (
                <ul className="space-y-3">
                  {reviews.map(r => (
                    <li key={r.id} className="rounded-xl ring-1 ring-white/10 bg-gradient-to-br from-white/5 to-white/0 p-3">
                      {/* Keep structure, improve vertical flow: allow text to wrap without overlapping and align CTA to bottom */}
                      <div className="flex items-stretch gap-3" style={{ minHeight: '96px' }}>
                        {/* Poster */}
                        <Link to={`/movies/${r.movie_id}`} state={{ from: location }} className="shrink-0">
                          {r.poster_path ? (
                            <img src={`https://image.tmdb.org/t/p/w185${r.poster_path}`} alt={r.movie_title || ''} className="w-16 h-24 object-cover rounded-md ring-1 ring-white/10" loading="lazy" />
                          ) : (
                            <div className="w-16 h-24 rounded-md bg-white/10 ring-1 ring-white/10" />
                          )}
                        </Link>
                        {/* Flexible column with min-height equal to poster height; CTA sticks to bottom via mt-auto */}
                        <div className="min-w-0 flex flex-col" style={{ minHeight: '96px' }}>
                          {/* Movie title */}
                          <Link to={`/movies/${r.movie_id}`} state={{ from: location }} className="block text-white font-medium truncate">
                            {(r.movie_title || t('movie.unknown', 'Tuntematon elokuva'))}{r.year ? ` (${r.year})` : ''}
                          </Link>
                          {/* Meta line */}
                          <div className="mt-0.5 text-xs text-white/70 truncate">{r.user_email} · {new Date(r.created_at).toLocaleString()}</div>
                          {/* Comment */}
                          {r.text && (
                            <div className="mt-1 text-sm text-gray-300 truncate">{r.text}</div>
                          )}
                          {/* CTA at bottom */}
                          <div className="mt-auto pt-1">
                            <Link to={`/movies/${r.movie_id}`} state={{ from: location }} className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 border border-white/10 bg-white/10 hover:bg-white/15 text-white text-xs">
                              {t('reviewPage.openMovie')}
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
