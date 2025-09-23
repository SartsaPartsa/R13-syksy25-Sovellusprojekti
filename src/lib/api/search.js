/** Fetch movies. Returns an empty page if "q" is empty */
export async function fetchMovies({
  q,
  page = 1,
  language = 'fi-FI',
  genre = '',
  minRating = 0,
  yearFrom = 0,
  yearTo = 0,
  sort = ''
}) {
  // No query = empty results
  if (!q) return { page: 1, total_pages: 0, total_results: 0, results: [] }

  // Build query params
  const params = new URLSearchParams({ q, page: String(page), language })
  if (genre) params.set('genre', genre)
  if (minRating) params.set('minRating', String(minRating))
  if (yearFrom) params.set('yearFrom', String(yearFrom))
  if (yearTo) params.set('yearTo', String(yearTo))
  if (sort) params.set('sort', sort)

  // Call backend, throw on error
  const res = await fetch(`/api/search/movies?${params.toString()}`)
  // Surface a readable error if the backend fails.
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Search failed (${res.status}): ${text}`)
  }
  return res.json()
}

export async function fetchGenres(language = 'fi-FI') {
  // Get genres (localized)
  const url = `/api/search/genres?language=${encodeURIComponent(language)}`
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Genres failed (${res.status}): ${text}`)
  }
  return res.json()
}
