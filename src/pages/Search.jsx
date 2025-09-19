import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchMovies, fetchGenres } from '../lib/api/search'
import FavoriteButton from '../components/FavoriteButton'

export default function Search() {
  const location = useLocation()
  const { t, i18n } = useTranslation('common')
  const langToTMDB = (lng) => (lng?.startsWith('fi') ? 'fi-FI' : 'en-US')
  const currentYear = new Date().getFullYear()

  const [sp, setSp] = useSearchParams()
  const q = sp.get('q') || ''
  const page = Number(sp.get('page') || 1)
  const language = sp.get('language') || langToTMDB(i18n.language)
  const genreParam = sp.get('genre') || ''
  const minRating = Number(sp.get('minRating') || 0)
  const yearFrom = Number(sp.get('yearFrom') || 0)
  const yearTo = Number(sp.get('yearTo') || 0)
  const sort = sp.get('sort') || '' // ''|'release_desc'|'release_asc'|'rating_desc'|'rating_asc'|'title_asc'|'popularity_desc'

  const [genres, setGenres] = useState([])
  const [data, setData] = useState({ page, total_pages: 0, total_results: 0, results: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [ratingValue, setRatingValue] = useState(minRating)

  useEffect(() => { setRatingValue(minRating) }, [minRating])

  // sync TMDB lang with i18n
  useEffect(() => {
    const tmdbLang = langToTMDB(i18n.language)
    if (language !== tmdbLang) {
      setSp((prev) => {
        const p = new URLSearchParams(prev)
        p.set('language', tmdbLang)
        return p
      })
    }
  }, [i18n.language])

  // load genres
  useEffect(() => {
    let ignore = false
    fetchGenres(language)
      .then((d) => { if (!ignore) setGenres(d.genres || []) })
      .catch(() => { if (!ignore) setGenres([]) })
    return () => { ignore = true }
  }, [language])

  // fetch movies
  useEffect(() => {
    let ignore = false
    if (!q) return
    setLoading(true); setError(null)
    fetchMovies({ q, page, language, genre: genreParam, minRating, yearFrom, yearTo, sort })
      .then((d) => { if (!ignore) setData(d) })
      .catch((e) => { if (!ignore) setError(e.message) })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [q, page, language, genreParam, minRating, yearFrom, yearTo, sort])

  const selectedGenreIds = useMemo(
    () => new Set(genreParam ? genreParam.split(',').map((s) => Number(s)).filter((n) => !Number.isNaN(n)) : []),
    [genreParam]
  )

  function updateParams(updates) {
    setSp((prev) => {
      const p = new URLSearchParams(prev)
      Object.entries(updates).forEach(([k, v]) => {
        if (v === '' || v === undefined || v === null) p.delete(k)
        else p.set(k, String(v))
      })
      if (['genre','minRating','yearFrom','yearTo','sort','language'].some(k => k in updates)) {
        p.set('page', '1')
      }
      return p
    })
  }

  function toggleGenre(id) {
    const next = new Set(selectedGenreIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    const value = Array.from(next).sort((a, b) => a - b).join(',')
    updateParams({ genre: value })
  }

  function goToPage(nextPage) {
    updateParams({ page: Math.max(1, Math.min(nextPage, data.total_pages || 1)) })
  }

  // --- Chips & sort-label ---
  const genreNameById = useMemo(() => {
    const map = new Map()
    for (const g of genres) map.set(g.id, g.name)
    return map
  }, [genres])

  const activeChips = [
    ...Array.from(selectedGenreIds).map(id => ({ key: `g-${id}`, label: genreNameById.get(id) || id, onRemove: () => toggleGenre(id) })),
    ...(minRating ? [{ key: 'r', label: `⭐ ≥ ${minRating}`, onRemove: () => updateParams({ minRating: '' }) }] : []),
    ...((yearFrom || yearTo) ? [{ key: 'y', label: `${yearFrom || '…'}–${yearTo || '…'}`, onRemove: () => updateParams({ yearFrom: '', yearTo: '' }) }] : []),
    ...(sort ? [{
      key: 's',
      label: ({
        release_desc: t('filters.sortOptions.newest', 'Newest'),
        release_asc: t('filters.sortOptions.oldest', 'Oldest'),
        rating_desc: t('filters.sortOptions.ratingHigh', 'Rating (high→low)'),
        rating_asc: t('filters.sortOptions.ratingLow', 'Rating (low→high)'),
        title_asc: t('filters.sortOptions.titleAZ', 'Title A–Z'),
        popularity_desc: t('filters.sortOptions.popularity', 'Popularity'),
      }[sort]),
      onRemove: () => updateParams({ sort: '' })
    }] : []),
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Title + compact controls */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('searchPage.title')}</h1>
        <div className="flex items-center gap-2">
          {/* Filters toggle */}
          <button
            type="button"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen(v => !v)}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-neutral-800/70 hover:bg-neutral-700/70 ring-1 ring-white/10"
          >
            {/* icon */}
            <svg className={`h-4 w-4 transition ${filtersOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M8 12h8m-5 4h2" />
            </svg>
            <span className="text-sm">{t('filters.title', 'Filters')}</span>
            {!!activeChips.length && (
              <span className="ml-1 text-xs rounded-full px-2 py-0.5 bg-[#F18800] text-black font-medium">
                {activeChips.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Selected filters */}
      {!!activeChips.length && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {activeChips.map(chip => (
            <span key={chip.key} className="group inline-flex items-center gap-2 rounded-full bg-neutral-800/70 ring-1 ring-white/10 px-3 py-1 text-sm">
              {chip.label}
              <button
                type="button"
                aria-label="Remove"
                onClick={chip.onRemove}
                className="rounded-full p-1 hover:bg-white/10"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" d="M6 6l12 12M18 6l-12 12" />
                </svg>
              </button>
            </span>
          ))}
          <button
            className="text-sm text-neutral-300 hover:text-white underline"
            onClick={() => { setRatingValue(0); updateParams({ genre: '', minRating: '', yearFrom: '', yearTo: '', sort: '' }) }}
          >
            {t('filters.clear')}
          </button>
        </div>
      )}

      {/* Filters panel */}
      <div
        className={`rounded-2xl bg-neutral-800/60 backdrop-blur-md ring-1 ring-white/10 transition-all overflow-hidden ${
          filtersOpen ? 'max-h-[900px] opacity-100 p-4 mb-6' : 'max-h-0 opacity-0 p-0 mb-0'
        }`}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {/* GENRES */}
          <div className="md:col-span-2">
            <div className="text-sm text-neutral-300 mb-2">{t('filters.genre')}</div>
            <div className="flex flex-wrap gap-2">
              {genres.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGenre(g.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition ${
                    selectedGenreIds.has(g.id)
                      ? 'bg-[#F18800] text-black border-[#F18800]'
                      : 'bg-neutral-900/50 text-neutral-300 border-neutral-700 hover:border-neutral-500'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>

          {/* MIN RATING */}
          <div className="flex items-center md:justify-end gap-3">
            <label className="text-sm text-neutral-300">{t('filters.minRating')}</label>
            <input
              type="range" min={0} max={10} step={0.5}
              value={isNaN(ratingValue) ? 0 : ratingValue}
              onChange={(e) => { const v = Number(e.target.value); setRatingValue(v); updateParams({ minRating: v }) }}
            />
            <span className="text-sm text-neutral-200">{(isNaN(ratingValue) ? 0 : ratingValue).toFixed(1)}</span>
          </div>
        </div>

        {/* Year range + Sort */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* YEAR RANGE */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-300">{t('filters.year')}</span>
            <input
              type="number"
              className="w-24 rounded-md bg-neutral-900/60 px-2 py-1 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#F18800]"
              placeholder={t('filters.from')}
              min={1900} max={currentYear}
              value={yearFrom || ''}
              onChange={(e) => updateParams({ yearFrom: e.target.value ? Number(e.target.value) : '' })}
            />
            <span className="text-sm text-neutral-400">–</span>
            <input
              type="number"
              className="w-24 rounded-md bg-neutral-900/60 px-2 py-1 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#F18800]"
              placeholder={t('filters.to')}
              min={1900} max={currentYear}
              value={yearTo || ''}
              onChange={(e) => updateParams({ yearTo: e.target.value ? Number(e.target.value) : '' })}
            />
          </div>

          {/* SORT */}
          <div className="md:col-start-3 flex items-center md:justify-end gap-3">
            <label className="text-sm text-neutral-300">{t('filters.sort')}</label>
            <div className="relative">
              <select
                className="appearance-none rounded-md bg-neutral-900/60 px-3 py-2 pr-8 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-[#F18800]"
                value={sort || 'relevance'}
                onChange={(e) => {
                  const v = e.target.value
                  updateParams({ sort: v === 'relevance' ? '' : v })
                }}
              >
                <option value="relevance">{t('filters.sortOptions.relevance', 'Relevance')}</option>
                <option value="release_desc">{t('filters.sortOptions.newest', 'Newest')}</option>
                <option value="release_asc">{t('filters.sortOptions.oldest', 'Oldest')}</option>
                <option value="rating_desc">{t('filters.sortOptions.ratingHigh', 'Rating (high→low)')}</option>
                <option value="rating_asc">{t('filters.sortOptions.ratingLow', 'Rating (low→high)')}</option>
                <option value="title_asc">{t('filters.sortOptions.titleAZ', 'Title A–Z')}</option>
                <option value="popularity_desc">{t('filters.sortOptions.popularity', 'Popularity')}</option>
              </select>
              {/* custom caret */}
              <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-4 text-sm text-neutral-300">
        {q ? (
          <>
            {t('searchPage.termLabel')}: <span className="font-medium text-white">“{q}”</span> — {data.total_results}{' '}
            {t('searchPage.resultsSuffix')}
          </>
        ) : (
          t('search')
        )}
      </div>

      {error && <div className="rounded-xl bg-red-500/10 text-red-300 p-3 mb-4">{error}</div>}
      {loading && <div className="animate-pulse text-neutral-400">{t('searchPage.loading')}</div>}
      {!loading && q && data.results.length === 0 && (
        <div className="text-neutral-400">{t('searchPage.noResults')}</div>
      )}

      {/* Results: modern cards */}
      <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {data.results.map((m) => (
          <li key={m.id} className="group bg-neutral-800/60 rounded-2xl overflow-hidden ring-1 ring-white/10 hover:ring-[#F18800]/60 transition">
            <Link to={`/movies/${m.id}`} state={{ from: location }} className="block">
              <div className="relative">
                {m.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w342${m.poster_path}`}
                    alt={m.title}
                    className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="w-full h-64 bg-neutral-700 flex items-center justify-center text-neutral-400">
                    {t('movie.noImage')}
                  </div>
                )}
                {/* rating badge */}
                <div className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white ring-1 ring-white/10">
                  ⭐ {m.vote_average ?? '–'}
                </div>
                <FavoriteButton movieId={m.id} />
              </div>
              <div className="p-3">
                <div className="font-medium text-white line-clamp-1">{m.title}</div>
                <div className="text-sm text-neutral-400">
                  {(m.release_date || '').slice(0, 4)}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Pagination */}
      {q && data.total_pages > 1 && (
        <div className="mt-8 flex items-center gap-3">
          <button
            className="px-3 py-2 rounded-xl bg-neutral-800/70 hover:bg-neutral-700/70 ring-1 ring-white/10 disabled:opacity-40"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
          >
            {t('pagination.prev')}
          </button>
          <span className="text-sm text-neutral-300">
            {data.page} / {data.total_pages}
          </span>
          <button
            className="px-3 py-2 rounded-xl bg-neutral-800/70 hover:bg-neutral-700/70 ring-1 ring-white/10 disabled:opacity-40"
            onClick={() => goToPage(page + 1)}
            disabled={page >= data.total_pages}
          >
            {t('pagination.next')}
          </button>
        </div>
      )}
    </div>
  )
}
